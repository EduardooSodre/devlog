/**
 * Limite diário de relatórios gerados com IA — 1x/dia por usuário por padrão,
 * ajustável pelo super admin (chave "ai_report_daily_limit" em system_settings).
 *
 * A checagem é atômica via INSERT...ON CONFLICT DO NOTHING num slot (0..limite-1):
 * a constraint única (user_id, used_on, slot) do Postgres garante que só uma
 * requisição consegue "reservar" cada slot, mesmo sob concorrência — sem depender
 * de transação multi-statement (o driver neon-http não suporta bem esse modo).
 * O valor de `useAI` que o cliente manda nunca é a autorização: quem decide é
 * sempre esta checagem no servidor, com o userId da sessão.
 */

import { db } from "@/lib/db";
import { aiReportUsage } from "@/lib/db/schema";
import { and, eq, count } from "drizzle-orm";
import { todayInBrasilia } from "@/lib/date-brasilia";
import { getSetting, setSetting } from "@/lib/system-settings";

const DEFAULT_DAILY_LIMIT = 1;
const SETTING_KEY = "ai_report_daily_limit";

export async function getAiReportDailyLimit(): Promise<number> {
  const raw = await getSetting(SETTING_KEY);
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DAILY_LIMIT;
}

export async function setAiReportDailyLimit(limit: number, updatedByEmail: string): Promise<void> {
  await setSetting(SETTING_KEY, String(Math.max(1, Math.floor(limit))), updatedByEmail);
}

export async function getAiReportStatus(userId: string): Promise<{ limit: number; usedToday: number; remaining: number }> {
  const limit = await getAiReportDailyLimit();
  const usedOn = todayInBrasilia();
  const [{ value: usedToday }] = await db
    .select({ value: count() })
    .from(aiReportUsage)
    .where(and(eq(aiReportUsage.userId, userId), eq(aiReportUsage.usedOn, usedOn)));
  return { limit, usedToday, remaining: Math.max(0, limit - usedToday) };
}

/** Tenta reservar um uso de IA hoje. Retorna o id da reserva (pra poder liberar em
 * caso de falha da chamada à OpenAI) ou `null` se o limite do dia já foi atingido. */
export async function claimAiReportSlot(userId: string, workspaceId: string): Promise<{ id: string } | null> {
  const limit = await getAiReportDailyLimit();
  const usedOn = todayInBrasilia();

  for (let slot = 0; slot < limit; slot++) {
    const [row] = await db
      .insert(aiReportUsage)
      .values({ userId, workspaceId, usedOn, slot })
      .onConflictDoNothing({ target: [aiReportUsage.userId, aiReportUsage.usedOn, aiReportUsage.slot] })
      .returning({ id: aiReportUsage.id });
    if (row) return row;
  }
  return null;
}

/** Libera a reserva se a geração falhar depois de já ter reservado o slot — a
 * pessoa não deveria perder o uso do dia por um erro nosso/da OpenAI. */
export async function releaseAiReportSlot(id: string): Promise<void> {
  await db.delete(aiReportUsage).where(eq(aiReportUsage.id, id));
}
