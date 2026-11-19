import { z } from "zod";

export const createSubjectSchema = z.object({
  name: z.string().trim().min(1, "Tên môn học không được trống").max(80),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Mã màu HEX không hợp lệ")
    .default("#10b981"),
  targetHours: z.coerce.number().int().min(1).max(5000).default(20),
});

export const startSessionSchema = z.object({
  subjectId: z.string().uuid().nullable().optional(),
  mode: z.enum(["pomodoro", "short_break", "long_break", "deep_work"]).default("pomodoro"),
  plannedMinutes: z.coerce.number().int().min(1).max(240),
  notes: z.string().trim().max(500).optional(),
});

export const finishSessionSchema = z.object({
  status: z.enum(["completed", "aborted"]),
  actualMinutes: z.coerce.number().int().min(0).max(240),
  notes: z.string().trim().max(500).optional(),
});

export const createTodoSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề công việc không được trống").max(160),
  subjectId: z.string().uuid().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().datetime().nullable().optional(),
});

export const updateTodoSchema = z.object({
  isCompleted: z.boolean().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  title: z.string().trim().min(1).max(160).optional(),
});

export const createRoadmapSchema = z.object({
  title: z.string().trim().min(1, "Tên lộ trình không được trống").max(120),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().min(1).max(50).default("General"),
  items: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(140),
        estimatedMinutes: z.coerce.number().int().min(5).max(1200).default(60),
      })
    )
    .min(1, "Lộ trình cần ít nhất 1 bước học"),
});

export const updateRoadmapItemSchema = z.object({
  status: z.enum(["todo", "in_progress", "done"]),
});
