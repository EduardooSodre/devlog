/**
 * Web Push — envio de notificações push do navegador
 * Usa VAPID (sem serviço terceiro). Chaves em .env (VAPID_PRIVATE_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY).
 */

import webpush from "web-push";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contato@devlog.app",
    vapidPublic,
    vapidPrivate
  );
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

/** Envia uma notificação push para todos os dispositivos inscritos de um usuário. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!vapidPublic || !vapidPrivate) return; // push não configurado

  const subs = await db.query.pushSubscriptions.findMany({
    where: eq(pushSubscriptions.userId, userId),
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        // Inscrição expirada/inválida — remove do banco
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        } else {
          console.error("[sendPushToUser]", err);
        }
      }
    })
  );
}
