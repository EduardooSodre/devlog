/**
 * GET /api/cron/due-date-reminders — Roda 1x/dia (Vercel Cron, ver vercel.json) e avisa
 * cada responsável, por push + e-mail, sobre cards que vencem hoje ou amanhã.
 * Protegida por CRON_SECRET — sem isso, qualquer um poderia disparar e-mails em massa
 * pra todo mundo do sistema só acertando a URL.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kanbanCards } from "@/lib/db/schema";
import { and, isNotNull, notInArray } from "drizzle-orm";
import { notifyUser } from "@/lib/notify";
import { escapeHtml } from "@/lib/mail";
import { dateOnlyInBrasilia, todayInBrasilia, addDaysToDateStr } from "@/lib/date-brasilia";

type DueCard = { id: string; title: string; boardId: string; dueDate: Date };

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const today = todayInBrasilia();
  const tomorrow = addDaysToDateStr(today, 1);

  const candidates = await db
    .select({
      id: kanbanCards.id,
      title: kanbanCards.title,
      boardId: kanbanCards.boardId,
      dueDate: kanbanCards.dueDate,
      assignedToId: kanbanCards.assignedToId,
    })
    .from(kanbanCards)
    .where(
      and(
        isNotNull(kanbanCards.dueDate),
        isNotNull(kanbanCards.assignedToId),
        notInArray(kanbanCards.status, ["done", "cancelled"])
      )
    );

  const dueTodayByUser = new Map<string, DueCard[]>();
  const dueTomorrowByUser = new Map<string, DueCard[]>();

  for (const card of candidates) {
    if (!card.assignedToId || !card.dueDate) continue;
    const due = dateOnlyInBrasilia(card.dueDate);
    const bucket = due === today ? dueTodayByUser : due === tomorrow ? dueTomorrowByUser : null;
    if (!bucket) continue;
    const list = bucket.get(card.assignedToId) ?? [];
    list.push({ id: card.id, title: card.title, boardId: card.boardId, dueDate: card.dueDate });
    bucket.set(card.assignedToId, list);
  }

  const userIds = new Set([...dueTodayByUser.keys(), ...dueTomorrowByUser.keys()]);
  let notified = 0;

  const section = (label: string, cards: DueCard[]) =>
    cards.length === 0
      ? ""
      : `<h3 style="margin:16px 0 8px;">${label}</h3><ul>${cards
          .map((c) => `<li>${escapeHtml(c.title)}</li>`)
          .join("")}</ul>`;

  for (const userId of userIds) {
    const todayCards = dueTodayByUser.get(userId) ?? [];
    const tomorrowCards = dueTomorrowByUser.get(userId) ?? [];

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Seus prazos</h2>
        ${section("Vencem hoje", todayCards)}
        ${section("Vencem amanhã", tomorrowCards)}
      </div>
    `;

    if (todayCards.length > 0) {
      await notifyUser(userId, {
        title: todayCards.length === 1 ? "1 tarefa vence hoje" : `${todayCards.length} tarefas vencem hoje`,
        body: todayCards.map((c) => c.title).join(", "),
        url: "/projetos",
        email: { subject: "Prazos de tarefas se aproximando — DevLog", html: emailHtml },
      });
    }
    if (tomorrowCards.length > 0) {
      await notifyUser(userId, {
        title: tomorrowCards.length === 1 ? "1 tarefa vence amanhã" : `${tomorrowCards.length} tarefas vencem amanhã`,
        body: tomorrowCards.map((c) => c.title).join(", "),
        url: "/projetos",
        // E-mail já foi enviado na notificação de "hoje" quando as duas existem no
        // mesmo dia — evita mandar dois e-mails idênticos pra mesma pessoa na mesma corrida do cron.
        email: todayCards.length === 0 ? { subject: "Prazos de tarefas se aproximando — DevLog", html: emailHtml } : undefined,
      });
    }

    notified++;
  }

  return NextResponse.json({ success: true, notified });
}
