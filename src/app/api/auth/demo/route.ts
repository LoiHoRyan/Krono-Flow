import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, setSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    const email = "demo@kronoflow.app";
    let rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let user = rows[0];

    if (!user) {
      const [created] = await db
        .insert(users)
        .values({
          email,
          name: "Bạn học Demo",
          passwordHash: hashPassword("demo123456"),
        })
        .returning();
      user = created;
    }

    if (!user) return NextResponse.json({ error: "Demo error" }, { status: 500 });
    await setSessionCookie(user.id);
    const { passwordHash: _pw, ...safeUser } = user;
    return NextResponse.json({ data: safeUser });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
