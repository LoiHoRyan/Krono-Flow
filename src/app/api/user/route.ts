import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  bio: z.string().trim().max(200).optional(),
  dailyGoalMinutes: z.coerce.number().int().min(15).max(720).optional(),
  theme: z.string().trim().min(1).max(40).optional(),
  customAccent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  fontStyle: z.enum(["editorial", "studio", "soft", "sans", "serif", "mono"]).optional(),
  wallpaper: z.string().trim().max(500).optional(),
  useStreakFreezeForDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { passwordHash: _pw, ...safeUser } = user;
  return NextResponse.json({ data: safeUser });
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = updateUserSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { useStreakFreezeForDate, ...rest } = parsed.data;
    const updatePayload: Partial<typeof users.$inferInsert> = { ...rest };

    if (useStreakFreezeForDate) {
      let existingDates: string[] = [];
      try {
        existingDates = JSON.parse(user.frozenDates || "[]");
      } catch {
        existingDates = [];
      }
      if (!existingDates.includes(useStreakFreezeForDate)) {
        if (user.streakFreezes <= 0) {
          return NextResponse.json({ error: "Hết thẻ đóng băng" }, { status: 400 });
        }
        existingDates.push(useStreakFreezeForDate);
        updatePayload.streakFreezes = user.streakFreezes - 1;
        updatePayload.frozenDates = JSON.stringify(existingDates);
      }
    }

    const [updated] = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, user.id))
      .returning();

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { passwordHash: _pw, ...safeUser } = updated;
    return NextResponse.json({ data: safeUser });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
