import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.query.systemSettings.findFirst({ where: eq(systemSettings.key, key) });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string, updatedByEmail: string): Promise<void> {
  await db
    .insert(systemSettings)
    .values({ key, value, updatedByEmail, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: { value, updatedByEmail, updatedAt: new Date() },
    });
}
