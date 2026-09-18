import { db } from "@/lib/db";
import { cardActivity } from "@/lib/db/schema";

type ActivityType = (typeof cardActivity.$inferInsert)["type"];

export async function logActivity(opts: {
  cardId: string;
  boardId: string;
  actorId: string;
  type: ActivityType;
  message: string;
}): Promise<void> {
  await db.insert(cardActivity).values(opts);
}
