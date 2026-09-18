/**
 * Ponto único de notificação: toda vez que alguém precisa ser avisado de algo (tarefa
 * atribuída, pedido de entrada, menção, lembrete de prazo), passa por aqui — grava na
 * central de notificações in-app, manda push, e opcionalmente e-mail. Sem isso, cada
 * rota reimplementa as três coisas separadamente (como acontecia antes) e a central
 * de notificações nunca fica completa.
 */
import { db } from "@/lib/db";
import { notifications, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendPushToUser } from "@/lib/push";
import { sendMail } from "@/lib/mail";

export type NotifyOptions = {
  title: string;
  body: string;
  url?: string;
  /** E-mail é opt-in por chamada — nem toda notificação (ex.: comentário) merece
   * disparar e-mail, só as que a pessoa provavelmente quer saber mesmo offline. */
  email?: { subject: string; html: string };
};

export async function notifyUser(userId: string, opts: NotifyOptions): Promise<void> {
  await db.insert(notifications).values({ userId, title: opts.title, body: opts.body, url: opts.url });
  await sendPushToUser(userId, { title: opts.title, body: opts.body, url: opts.url });

  if (opts.email) {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (user) {
      await sendMail({ to: user.email, subject: opts.email.subject, html: opts.email.html });
    }
  }
}
