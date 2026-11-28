"use client";

import { getLocalDateIso } from "@/lib/utils";

import { kfNotify } from "@/lib/notify";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart2,
  CalendarCheck,
  Copy,
  Download,
  Mail,
  PieChart,
  Plus,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import type { SessionLogItem, SubjectOption } from "./PomodoroTimer";
import type { GradeRecord } from "./ScheduleGpaPanel";
import type { ExpenseRecord } from "./ExpensesPanel";

interface AdminDeadline {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
}

const INCOME_KEY = "kronoflow-monthly-income-v1";
const ADMIN_KEY = "kronoflow-admin-deadlines-v1";

function normVi(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim();
}

export function AcademicLifeHubModal({
  open,
  onClose,
  userName,
  subjects,
  sessions,
  grades,
  expenses,
}: {
  open: boolean;
  onClose: () => void;
  userName: string;
  subjects: SubjectOption[];
  sessions: SessionLogItem[];
  grades: GradeRecord[];
  expenses: ExpenseRecord[];
}) {
  const [tab, setTab] = useState<"insight" | "budget" | "email" | "admin" | "share">("insight");

  // 2. 50/30/20 Budget Planner
  const [monthlyIncome, setMonthlyIncome] = useState(4000000);

  // 3. Academic Email Templates
  const [emailKind, setEmailKind] = useState<"absent" | "meeting" | "extend" | "submit" | "material">("absent");
  const [stName, setStName] = useState(userName || "Nguyễn Văn A");
  const [stId, setStId] = useState("");
  const [courseTitle, setCourseTitle] = useState("Cấu trúc dữ liệu và giải thuật");
  const [profName, setProfName] = useState("Thầy/Cô");

  // 4. Admin Deadlines
  const [adminItems, setAdminItems] = useState<AdminDeadline[]>([]);
  const [admTitle, setAdmTitle] = useState("");
  const [admDate, setAdmDate] = useState("");

  // 5. Quick Link Share Card
  const [shTitle, setShTitle] = useState("Slide thuyết trình Nhóm 1");
  const [shUrl, setShUrl] = useState("https://github.com/LoiHoRyan/Krono-Flow");
  const [shNote, setShNote] = useState("Bản cập nhật mới nhất trước buổi bảo vệ.");

  useEffect(() => {
    if (!open) return;
    try {
      const inc = Number(localStorage.getItem(INCOME_KEY) || "4000000");
      if (!isNaN(inc) && inc > 0) setMonthlyIncome(inc);
      const rawAdm = localStorage.getItem(ADMIN_KEY);
      if (rawAdm) {
        setAdminItems(JSON.parse(rawAdm) as AdminDeadline[]);
      } else {
        setAdminItems([
          { id: "ad1", title: "Đăng ký học phần học kỳ tới", dueDate: "", done: false },
          { id: "ad2", title: "Hoàn thành đóng học phí đúng hạn", dueDate: "", done: false },
          { id: "ad3", title: "Chấm điểm rèn luyện (ĐRL) học kỳ", dueDate: "", done: false },
        ]);
      }
    } catch {
      // ignore
    }
  }, [open]);

  // 1. Study-to-Grade Correlation
  const correlationRows = useMemo(() => {
    const completed = sessions.filter((s) => s.status === "completed");
    const minsBySubId = new Map<string, number>();
    for (const s of completed) {
      if (!s.subjectId) continue;
      minsBySubId.set(s.subjectId, (minsBySubId.get(s.subjectId) ?? 0) + s.actualMinutes);
    }

    return grades
      .filter((g) => g.score10 > 0)
      .map((g) => {
        const gNorm = normVi(g.courseName);
        const matchedSub = subjects.find((sub) => {
          const sNorm = normVi(sub.name);
          return sNorm.includes(gNorm) || gNorm.includes(sNorm);
        });
        const mins = matchedSub ? (minsBySubId.get(matchedSub.id) ?? 0) : 0;
        const hrs = Math.round((mins / 60) * 10) / 10;
        const gpa4 = Number((g.score10 * 0.4).toFixed(4));
        return {
          id: g.id,
          courseName: g.courseName,
          semester: g.semester,
          score10: g.score10,
          gpa4,
          hours: hrs,
        };
      });
  }, [grades, subjects, sessions]);

  // Current month real spending from PostgreSQL
  const currentMonthSpent = useMemo(() => {
    const ym = new Date().toISOString().slice(0, 7);
    return expenses
      .filter((e) => e.spentDate.startsWith(ym))
      .reduce((a, b) => a + b.amount, 0);
  }, [expenses]);

  if (!open) return null;

  const saveAdmin = (next: AdminDeadline[]) => {
    setAdminItems(next);
    try {
      localStorage.setItem(ADMIN_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Academic Email generator
  const idTag = stId.trim() ? ` - MSSV: ${stId.trim()}` : "";
  const emailTemplates: Record<
    typeof emailKind,
    { label: string; subject: string; body: string }
  > = {
    absent: {
      label: "Xin nghỉ học có phép",
      subject: `[Xin phép nghỉ học] ${courseTitle} - ${stName}${idTag}`,
      body: `Kính gửi ${profName},\n\nEm là ${stName}${idTag}, sinh viên lớp học phần ${courseTitle}.\n\nHôm nay vì lý do cá nhân/sức khỏe đột xuất nên em xin phép ${profName} cho em được nghỉ buổi học này. Em cam kết sẽ chép bài đầy đủ và hoàn thành bài tập theo đúng tiến độ của lớp.\n\nEm xin chân thành cảm ơn ${profName}!\nTrân trọng,\n${stName}`,
    },
    meeting: {
      label: "Hẹn gặp giảng viên",
      subject: `[Đặt lịch trao đổi] ${courseTitle} - ${stName}${idTag}`,
      body: `Kính gửi ${profName},\n\nEm là ${stName}${idTag}, hiện đang học học phần ${courseTitle}.\n\nEm có một số câu hỏi liên quan đến nội dung bài học/đồ án và mong muốn được xin ${profName} 10–15 phút để trao đổi trực tiếp hoặc trực tuyến vào khung giờ thuận tiện cho ${profName} trong tuần này.\n\nEm xin cảm ơn ${profName} và mong nhận được phản hồi!\nTrân trọng,\n${stName}`,
    },
    extend: {
      label: "Xin gia hạn nộp bài",
      subject: `[Xin gia hạn bài tập] ${courseTitle} - ${stName}${idTag}`,
      body: `Kính gửi ${profName},\n\nEm là ${stName}${idTag}, sinh viên lớp ${courseTitle}.\n\nHiện em đang hoàn thiện bài tập được giao nhưng gặp một số sự cố khách quan nên chưa kịp nộp đúng hạn. Em kính mong ${profName} xem xét cho em được gia hạn nộp bài đến cuối ngày mai để đảm bảo chất lượng tốt nhất.\n\nEm xin chân thành cảm ơn ${profName}!\nTrân trọng,\n${stName}`,
    },
    submit: {
      label: "Nộp bài / Đồ án nhóm",
      subject: `[Nộp bài] ${courseTitle} - ${stName}${idTag}`,
      body: `Kính gửi ${profName},\n\nEm đại diện nhóm xin gửi đính kèm bài báo cáo và slide thuyết trình cho học phần ${courseTitle}.\n\nRất mong nhận được góp ý của ${profName} để nhóm hoàn thiện tốt hơn.\n\nEm xin chân thành cảm ơn!\nTrân trọng,\n${stName}${idTag}`,
    },
    material: {
      label: "Xin tài liệu tham khảo",
      subject: `[Xin tài liệu học tập] ${courseTitle} - ${stName}${idTag}`,
      body: `Kính gửi ${profName},\n\nEm là ${stName}${idTag}, sinh viên lớp ${courseTitle}.\n\nĐể chuẩn bị tốt hơn cho kỳ thi sắp tới, em kính nhờ ${profName} chia sẻ giúp em tài liệu tham khảo hoặc slide bài giảng liên quan nếu thuận tiện ạ.\n\nEm xin chân thành cảm ơn ${profName}!\nTrân trọng,\n${stName}`,
    },
  };
  const curMail = emailTemplates[emailKind];

  const downloadShareCardPng = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 840;
    canvas.height = 420;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 840, 420);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(1, "#1e293b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 840, 420);

    ctx.fillStyle = "rgba(56,189,248,0.14)";
    ctx.fillRect(42, 42, 756, 336);
    ctx.strokeStyle = "rgba(56,189,248,0.45)";
    ctx.strokeRect(42, 42, 756, 336);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.fillText("KRONOFLOW · TÀI LIỆU CHIA SẺ NHÓM", 72, 92);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px system-ui, sans-serif";
    ctx.fillText(shTitle.slice(0, 42), 72, 150);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText(shNote.slice(0, 68), 72, 198);

    ctx.fillStyle = "rgba(15,23,42,0.85)";
    ctx.fillRect(72, 240, 696, 62);
    ctx.fillStyle = "#7dd3fc";
    ctx.font = "bold 18px ui-monospace, monospace";
    ctx.fillText(shUrl.slice(0, 60), 92, 278);

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `kronoflow-share-card-${getLocalDateIso()}.png`;
    a.click();
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="kf-modal-in max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Hiệu suất Giờ học ↔ Điểm, Ngân sách 50/30/20, Mẫu Email & Hành chính SV
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-medium">
          {(
            [
              ["insight", "Giờ học ↔ Điểm", BarChart2],
              ["budget", "Ngân sách 50/30/20", PieChart],
              ["email", "Mẫu Email SV", Mail],
              ["admin", "Mốc Hành chính", CalendarCheck],
              ["share", "Thẻ Chia sẻ Link", Share2],
            ] as const
          ).map(([k, lbl, Icon]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 ${
                tab === k
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {lbl}
            </button>
          ))}
        </div>

        {/* TAB 1: STUDY-TO-GRADE CORRELATION */}
        {tab === "insight" && (
          <div className="mt-4 space-y-3 text-xs">
            <p className="text-[11px] text-[var(--text-muted)]">
              Tự động ghép các học phần đã có điểm với tổng số giờ Pomodoro bạn đã học cho môn đó.
            </p>
            {correlationRows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-[var(--text-muted)]">
                Chưa có môn học nào có điểm số để đối chiếu với giờ học.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[10px] uppercase text-[var(--text-muted)]">
                      <th className="py-2 pr-2">Môn học</th>
                      <th className="py-2 pr-2 text-right">Giờ đã học</th>
                      <th className="py-2 pr-2 text-right">Điểm 10</th>
                      <th className="py-2 text-right">Hệ 4 thực</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {correlationRows.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 pr-2 font-medium text-[var(--text-primary)]">{r.courseName}</td>
                        <td className="py-2 pr-2 text-right font-mono text-[var(--text-secondary)]">{r.hours}h</td>
                        <td className="py-2 pr-2 text-right font-mono font-semibold">{r.score10}</td>
                        <td className="py-2 text-right font-mono font-bold text-[var(--accent)]">{r.gpa4}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: 50/30/20 STUDENT BUDGET PLANNER */}
        {tab === "budget" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              <span className="font-medium text-[var(--text-primary)]">Ngân sách / Trợ cấp tháng này (VNĐ):</span>
              <input
                type="number"
                min={500000}
                step={250000}
                value={monthlyIncome}
                onChange={(e) => {
                  const v = Math.max(0, Number(e.target.value));
                  setMonthlyIncome(v);
                  try {
                    localStorage.setItem(INCOME_KEY, String(v));
                  } catch {
                    // ignore
                  }
                }}
                className="w-40 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1 text-right font-mono font-bold"
              />
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              {[
                { label: "50% Thiết yếu", sub: "Ăn uống, trọ, đi lại", amt: Math.round(monthlyIncome * 0.5), color: "text-sky-600" },
                { label: "30% Học tập & Cá nhân", sub: "Sách, khóa học, cà phê", amt: Math.round(monthlyIncome * 0.3), color: "text-amber-600" },
                { label: "20% Tiết kiệm & Dự phòng", sub: "Quỹ laptop, khẩn cấp", amt: Math.round(monthlyIncome * 0.2), color: "text-emerald-600" },
              ].map((b) => (
                <div key={b.label} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                  <div className="text-[11px] font-semibold text-[var(--text-primary)]">{b.label}</div>
                  <div className={`mt-1 font-mono text-lg font-bold ${b.color}`}>
                    {b.amt.toLocaleString("vi-VN")} ₫
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">{b.sub}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-3 text-xs">
              Đã chi thực tế tháng này (PostgreSQL):{" "}
              <strong className="font-mono text-[var(--accent)]">
                {currentMonthSpent.toLocaleString("vi-VN")} ₫
              </strong>{" "}
              ({Math.round((currentMonthSpent / Math.max(1, monthlyIncome)) * 100)}% ngân sách tháng · Còn lại{" "}
              <strong className="font-mono">
                {Math.max(0, monthlyIncome - currentMonthSpent).toLocaleString("vi-VN")} ₫
              </strong>
              )
            </div>
          </div>
        )}

        {/* TAB 3: ACADEMIC EMAIL TEMPLATES */}
        {tab === "email" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(emailTemplates) as (keyof typeof emailTemplates)[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setEmailKind(k)}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
                    emailKind === k
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]"
                  }`}
                >
                  {emailTemplates[k]?.label ?? k}
                </button>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-4">
              <input
                type="text"
                value={stName}
                onChange={(e) => setStName(e.target.value)}
                placeholder="Họ và tên..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5"
              />
              <input
                type="text"
                value={stId}
                onChange={(e) => setStId(e.target.value)}
                placeholder="MSSV (tùy chọn)..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 font-mono"
              />
              <input
                type="text"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="Tên môn học..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5"
              />
              <input
                type="text"
                value={profName}
                onChange={(e) => setProfName(e.target.value)}
                placeholder="Xưng hô (Thầy/Cô...)"
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5"
              />
            </div>

            <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2">
                <div className="truncate font-semibold text-[var(--text-primary)]">
                  Tiêu đề: {curMail.subject}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(`Tiêu đề: ${curMail.subject}\n\n${curMail.body}`).catch(() => {});
                    kfNotify("Đã sao chép trọn bộ Tiêu đề & Nội dung email!");
                  }}
                  className="btn-primary inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px]"
                >
                  <Copy className="h-3 w-3" /> Chép Email
                </button>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[var(--text-secondary)]">
                {curMail.body}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 4: ADMIN DEADLINES */}
        {tab === "admin" && (
          <div className="mt-4 space-y-3 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!admTitle.trim()) return;
                saveAdmin([{ id: `ad-${Date.now()}`, title: admTitle.trim(), dueDate: admDate, done: false }, ...adminItems]);
                setAdmTitle("");
                setAdmDate("");
              }}
              className="flex flex-wrap gap-1.5"
            >
              <input
                type="text"
                required
                value={admTitle}
                onChange={(e) => setAdmTitle(e.target.value)}
                placeholder="Mốc hành chính (Đăng ký học phần, Đóng học phí, Chấm ĐRL...)"
                className="min-w-[180px] flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5"
              />
              <input
                type="date"
                value={admDate}
                onChange={(e) => setAdmDate(e.target.value)}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 font-mono"
              />
              <button type="submit" className="btn-primary inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-medium">
                <Plus className="h-3.5 w-3.5" /> Thêm
              </button>
            </form>

            <div className="space-y-1.5">
              {adminItems.map((it) => {
                const days = it.dueDate
                  ? Math.ceil((new Date(it.dueDate).getTime() - Date.now()) / 86400000)
                  : null;
                return (
                  <div
                    key={it.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2"
                  >
                    <label className="flex flex-1 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={it.done}
                        onChange={() =>
                          saveAdmin(adminItems.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))
                        }
                      />
                      <span className={it.done ? "line-through text-[var(--text-muted)]" : "font-medium text-[var(--text-primary)]"}>
                        {it.title}
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      {days !== null && !it.done && (
                        <span className={`font-mono text-[11px] font-semibold ${days <= 3 ? "text-rose-500" : "text-[var(--accent)]"}`}>
                          {days >= 0 ? `Còn ${days} ngày` : "Quá hạn"}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => saveAdmin(adminItems.filter((x) => x.id !== it.id))}
                        className="text-[var(--text-muted)] hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: QUICK LINK SHARE CARD */}
        {tab === "share" && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              <input
                type="text"
                value={shTitle}
                onChange={(e) => setShTitle(e.target.value)}
                placeholder="Tiêu đề tài liệu / Slide / Form..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
              <input
                type="url"
                value={shUrl}
                onChange={(e) => setShUrl(e.target.value)}
                placeholder="https://..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono"
              />
              <input
                type="text"
                value={shNote}
                onChange={(e) => setShNote(e.target.value)}
                placeholder="Ghi chú ngắn cho nhóm..."
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const txt = `📌 ${shTitle}\n📝 ${shNote}\n🔗 ${shUrl}`;
                  navigator.clipboard?.writeText(txt).catch(() => {});
                  kfNotify("Đã sao chép thẻ chia sẻ gửi nhóm!");
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] px-3 py-1.5 font-medium hover:border-[var(--accent)]"
              >
                <Copy className="h-3.5 w-3.5" /> Chép tin nhắn nhóm
              </button>
              <button
                type="button"
                onClick={downloadShareCardPng}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-medium"
              >
                <Download className="h-3.5 w-3.5" /> Tải Thẻ Ảnh (.PNG)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
