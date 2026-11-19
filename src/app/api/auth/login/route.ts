import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { setSessionCookie, verifyPassword } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export async function POST(req: Request) {
  try {
    const parsed = loginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Thông tin không hợp lệ" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];

    if (!user || !user.passwordHash || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không chính xác" },
        { status: 401 }
      );
    }

    await setSessionCookie(user.id);
    const { passwordHash: _pw, ...safeUser } = user;
    return NextResponse.json({ data: safeUser });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
