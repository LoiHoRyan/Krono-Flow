import { NextResponse } from "next/server";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { roadmapItems, roadmaps } from "@/db/schema";
import { getOrCreateDemoUser } from "@/lib/demo-user";
import { createRoadmapSchema } from "@/lib/validators/study";

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const list = await db
      .select()
      .from(roadmaps)
      .where(eq(roadmaps.userId, user.id))
      .orderBy(desc(roadmaps.createdAt));

    if (list.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const ids = list.map((r) => r.id);
    const items = await db
      .select()
      .from(roadmapItems)
      .where(inArray(roadmapItems.roadmapId, ids))
      .orderBy(asc(roadmapItems.sortOrder));

    const enriched = list.map((rm) => ({
      ...rm,
      items: items.filter((item) => item.roadmapId === rm.id),
    }));

    return NextResponse.json({ data: enriched });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi tải lộ trình" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createRoadmapSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const user = await getOrCreateDemoUser();
    const created = await db.transaction(async (tx) => {
      const [rm] = await tx
        .insert(roadmaps)
        .values({
          userId: user.id,
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          category: parsed.data.category,
        })
        .returning();

      if (!rm) throw new Error("Không thể tạo lộ trình");

      const insertedItems = await tx
        .insert(roadmapItems)
        .values(
          parsed.data.items.map((item, idx) => ({
            roadmapId: rm.id,
            title: item.title,
            estimatedMinutes: item.estimatedMinutes,
            sortOrder: idx,
          }))
        )
        .returning();

      return { ...rm, items: insertedItems };
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi tạo lộ trình" },
      { status: 500 }
    );
  }
}
