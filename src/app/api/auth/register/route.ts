import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, setSessionCookie } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Tên tối thiểu 2 ký tự").max(80),
  email: z.string().trim().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(100),
});

export async function POST(req: Request) {
  try {
    const parsed = registerSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing[0]) {
      return NextResponse.json({ error: "Email này đã được đăng ký" }, { status: 409 });
    }

    const [created] = await db
      .insert(users)
      .values({
        email,
        name: parsed.data.name,
        passwordHash: hashPassword(parsed.data.password),
      })
      .returning();

    if (!created) {
      return NextResponse.json({ error: "Không thể tạo tài khoản" }, { status: 500 });
    }

    await setSessionCookie(created.id);
    const { passwordHash: _pw, ...safeUser } = created;
    return NextResponse.json({ data: safeUser }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
