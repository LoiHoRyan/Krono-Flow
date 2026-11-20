import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { subjects, todos, studyNotes, flashcards, exams, grades } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

const restoreSchema = z.object({
  subjects: z
    .array(z.object({ name: z.string().min(1), color: z.string().optional(), targetHours: z.number().int().positive().optional() }))
    .optional(),
  todos: z
    .array(z.object({ title: z.string().min(1), priority: z.enum(["low", "medium", "high"]).optional(), isCompleted: z.boolean().optional() }))
    .optional(),
  notes: z
    .array(z.object({ title: z.string().min(1), content: z.string().min(1), pinned: z.boolean().optional() }))
    .optional(),
  flashcards: z
    .array(z.object({ front: z.string().min(1), back: z.string().min(1), mastery: z.number().int().min(0).max(5).optional() }))
    .optional(),
  exams: z
    .array(z.object({ title: z.string().min(1), examDate: z.string() }))
    .optional(),
  grades: z
    .array(z.object({ courseName: z.string().min(1), credits: z.number().int().positive(), score10: z.number().min(0).max(10), semester: z.string().optional() }))
    .optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = restoreSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Tệp JSON sao lưu không đúng định dạng" }, { status: 400 });
    }

    const d = parsed.data;
    let count = 0;

    await db.transaction(async (tx) => {
      if (d.subjects?.length) {
        await tx.insert(subjects).values(
          d.subjects.map((s) => ({
            userId: user.id,
            name: s.name,
            color: s.color ?? "#2563eb",
            targetHours: s.targetHours ?? 20,
          }))
        );
        count += d.subjects.length;
      }
      if (d.todos?.length) {
        await tx.insert(todos).values(
          d.todos.map((t) => ({
            userId: user.id,
            title: t.title,
            priority: t.priority ?? "medium",
            status: t.isCompleted ? "done" : "todo",
            isCompleted: t.isCompleted ?? false,
          }))
        );
        count += d.todos.length;
      }
      if (d.notes?.length) {
        await tx.insert(studyNotes).values(
          d.notes.map((n) => ({
            userId: user.id,
            title: n.title,
            content: n.content,
            pinned: n.pinned ?? false,
          }))
        );
        count += d.notes.length;
      }
      if (d.flashcards?.length) {
        await tx.insert(flashcards).values(
          d.flashcards.map((c) => ({
            userId: user.id,
            front: c.front,
            back: c.back,
            mastery: c.mastery ?? 0,
          }))
        );
        count += d.flashcards.length;
      }
      if (d.exams?.length) {
        await tx.insert(exams).values(
          d.exams.map((e) => ({
            userId: user.id,
            title: e.title,
            examDate: new Date(e.examDate),
          }))
        );
        count += d.exams.length;
      }
      if (d.grades?.length) {
        await tx.insert(grades).values(
          d.grades.map((g) => ({
            userId: user.id,
            courseName: g.courseName,
            credits: g.credits,
            score10: g.score10,
            semester: g.semester ?? "HK1",
          }))
        );
        count += d.grades.length;
      }
    });

    return NextResponse.json({ restored: count });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
