import { safeJson } from "@/lib/safe-json";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuthenticatedUser, hashPassword, verifyPassword } from "@/lib/auth";

const pwSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "Mật khẩu mới tối thiểu 6 ký tự").max(100),
});

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = pwSchema.safeParse((await safeJson(req)));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }

  if (user.passwordHash && !verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
    return NextResponse.json({ error: "Mật khẩu hiện tại không đúng" }, { status: 400 });
  }

  await db
    .update(users)
    .set({ passwordHash: hashPassword(parsed.data.newPassword) })
    .where(eq(users.id, user.id));

  return NextResponse.json({ ok: true });
}
