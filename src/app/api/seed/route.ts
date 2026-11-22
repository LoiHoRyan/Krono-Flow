import { NextResponse } from "next/server";
import { db } from "@/db";
import { subjects, todos, flashcards, grades, exams, habits } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await db.transaction(async (tx) => {
      const insertedSubs = await tx
        .insert(subjects)
        .values([
          { userId: user.id, name: "Cấu trúc dữ liệu & Giải thuật", color: "#2563eb", targetHours: 40 },
          { userId: user.id, name: "Cơ sở dữ liệu PostgreSQL", color: "#0f766e", targetHours: 30 },
          { userId: user.id, name: "Tiếng Anh học thuật", color: "#d97706", targetHours: 25 },
        ])
        .returning();

      const sub0 = insertedSubs[0]?.id ?? null;
      const sub1 = insertedSubs[1]?.id ?? null;

      await tx.insert(todos).values([
        { userId: user.id, subjectId: sub0, title: "Ôn lại cây nhị phân tìm kiếm (BST)", priority: "high", isUrgent: true, status: "todo" },
        { userId: user.id, subjectId: sub1, title: "Thực hành viết JOIN & Window Function", priority: "medium", isUrgent: false, status: "in_progress" },
        { userId: user.id, subjectId: sub0, title: "Làm 5 bài tập Dijkstra trên LeetCode", priority: "high", isUrgent: false, status: "todo" },
      ]);

      await tx.insert(flashcards).values([
        { userId: user.id, subjectId: sub0, front: "Độ phức tạp thời gian trung bình của QuickSort?", back: "O(n log n)", mastery: 3 },
        { userId: user.id, subjectId: sub1, front: "ACID trong PostgreSQL là viết tắt của gì?", back: "Atomicity, Consistency, Isolation, Durability", mastery: 4 },
        { userId: user.id, subjectId: sub0, front: "Cấu trúc dữ liệu nào hoạt động theo nguyên tắc LIFO?", back: "Stack (Ngăn xếp)", mastery: 5 },
      ]);

      await tx.insert(grades).values([
        { userId: user.id, courseName: "Nhập môn lập trình", credits: 3, score10: 8.8, semester: "HK1" },
        { userId: user.id, courseName: "Toán rời rạc", credits: 3, score10: 8.2, semester: "HK1" },
        { userId: user.id, courseName: "Cấu trúc dữ liệu", credits: 4, score10: 9.0, semester: "HK2" },
      ]);

      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 18);
      await tx.insert(exams).values([
        { userId: user.id, title: "Thi cuối kỳ Cấu trúc dữ liệu", examDate: nextMonth, color: "#d97706" },
      ]);

      await tx.insert(habits).values([
        { userId: user.id, title: "Đọc tài liệu kỹ thuật 20 phút", color: "#10b981" },
        { userId: user.id, title: "Ôn 15 thẻ Flashcards mỗi tối", color: "#2563eb" },
      ]);
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
