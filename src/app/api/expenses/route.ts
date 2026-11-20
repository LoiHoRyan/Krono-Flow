import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const createExpenseSchema = z.object({
  title: z.string().trim().min(1).max(120),
  amount: z.coerce.number().int().min(1000).max(1000000000),
  category: z.string().trim().min(1).max(40).default("Tài liệu"),
  spentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select()
    .from(expenses)
    .where(eq(expenses.userId, user.id))
    .orderBy(desc(expenses.spentDate), desc(expenses.createdAt));
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createExpenseSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [created] = await db
    .insert(expenses)
    .values({
      userId: user.id,
      title: parsed.data.title,
      amount: parsed.data.amount,
      category: parsed.data.category,
      spentDate: parsed.data.spentDate,
    })
    .returning();
  return NextResponse.json({ data: created }, { status: 201 });
}
