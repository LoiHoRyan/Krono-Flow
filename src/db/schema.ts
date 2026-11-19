import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  doublePrecision,
  check,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const sessionModeEnum = pgEnum("session_mode", [
  "pomodoro",
  "short_break",
  "long_break",
  "deep_work",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "running",
  "completed",
  "aborted",
]);

export const todoPriorityEnum = pgEnum("todo_priority", [
  "low",
  "medium",
  "high",
]);

export const roadmapStatusEnum = pgEnum("roadmap_item_status", [
  "todo",
  "in_progress",
  "done",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  bio: text("bio").notNull().default("Tập trung mỗi ngày — Xây dựng kỷ luật bền vững"),
  dailyGoalMinutes: integer("daily_goal_minutes").notNull().default(120),
  streakFreezes: integer("streak_freezes").notNull().default(3),
  frozenDates: text("frozen_dates").notNull().default("[]"),
  theme: text("theme").notNull().default("ivory"),
  wallpaper: text("wallpaper").notNull().default("none"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#2563eb"),
    targetHours: integer("target_hours").notNull().default(20),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("subjects_user_idx").on(table.userId),
    check("subjects_target_hours_positive", sql`${table.targetHours} > 0`),
  ]
);

export const studySessions = pgTable(
  "study_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    mode: sessionModeEnum("mode").notNull().default("pomodoro"),
    status: sessionStatusEnum("status").notNull().default("running"),
    plannedMinutes: integer("planned_minutes").notNull(),
    actualMinutes: integer("actual_minutes").notNull().default(0),
    notes: text("notes"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [
    index("sessions_user_started_idx").on(table.userId, table.startedAt),
    check("sessions_planned_positive", sql`${table.plannedMinutes} > 0`),
    check("sessions_actual_non_negative", sql`${table.actualMinutes} >= 0`),
  ]
);

export const todos = pgTable(
  "todos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    priority: todoPriorityEnum("priority").notNull().default("medium"),
    isUrgent: boolean("is_urgent").notNull().default(false),
    isCompleted: boolean("is_completed").notNull().default(false),
    dueDate: timestamp("due_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("todos_user_idx").on(table.userId)]
);

export const roadmaps = pgTable(
  "roadmaps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").notNull().default("General"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("roadmaps_user_idx").on(table.userId)]
);

export const roadmapItems = pgTable(
  "roadmap_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roadmapId: uuid("roadmap_id")
      .notNull()
      .references(() => roadmaps.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    estimatedMinutes: integer("estimated_minutes").notNull().default(60),
    status: roadmapStatusEnum("status").notNull().default("todo"),
    sortOrder: integer("sort_order").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("roadmap_items_roadmap_idx").on(table.roadmapId, table.sortOrder),
    check("roadmap_item_est_positive", sql`${table.estimatedMinutes} > 0`),
  ]
);

export const studyNotes = pgTable(
  "study_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("notes_user_idx").on(table.userId)]
);

export const flashcards = pgTable(
  "flashcards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    front: text("front").notNull(),
    back: text("back").notNull(),
    mastery: integer("mastery").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("flashcards_user_idx").on(table.userId),
    check("flashcards_mastery_range", sql`${table.mastery} >= 0 AND ${table.mastery} <= 5`),
  ]
);

export const exams = pgTable(
  "exams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    examDate: timestamp("exam_date", { withTimezone: true }).notNull(),
    color: text("color").notNull().default("#d97706"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("exams_user_date_idx").on(table.userId, table.examDate)]
);

export const scheduleSlots = pgTable(
  "schedule_slots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(), // 1 (T2) -> 7 (CN)
    startTime: text("start_time").notNull(), // "08:00"
    endTime: text("end_time").notNull(), // "10:00"
    title: text("title").notNull(),
    location: text("location"),
    color: text("color").notNull().default("#2563eb"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("schedule_user_day_idx").on(table.userId, table.dayOfWeek),
    check("schedule_day_valid", sql`${table.dayOfWeek} >= 1 AND ${table.dayOfWeek} <= 7`),
  ]
);

export const grades = pgTable(
  "grades",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseName: text("course_name").notNull(),
    credits: integer("credits").notNull().default(3),
    score10: doublePrecision("score_10").notNull(),
    semester: text("semester").notNull().default("HK1"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("grades_user_idx").on(table.userId),
    check("grades_credits_pos", sql`${table.credits} > 0`),
    check("grades_score_range", sql`${table.score10} >= 0 AND ${table.score10} <= 10`),
  ]
);
