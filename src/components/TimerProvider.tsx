"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ambientEngine, AmbientType } from "@/lib/ambient-audio";
import { formatDuration } from "@/lib/utils";

export type TimerMode = "pomodoro" | "deep_work" | "short_break" | "long_break";

export const MODE_CONFIG: Record<TimerMode, { label: string; minutes: number }> = {
  pomodoro: { label: "Pomodoro 25'", minutes: 25 },
  deep_work: { label: "Deep Work 50'", minutes: 50 },
  short_break: { label: "Nghỉ ngắn 5'", minutes: 5 },
  long_break: { label: "Nghỉ dài 15'", minutes: 15 },
};

interface TimerContextValue {
  mode: TimerMode;
  customMinutes: number;
  selectedSubjectId: string;
  notes: string;
  secondsLeft: number;
  isRunning: boolean;
  activeSessionId: string | null;
  statusMessage: string | null;
  ambient: AmbientType;
  volume: number;
  setSelectedSubjectId: (id: string) => void;
  setNotes: (n: string) => void;
  changeMode: (m: TimerMode) => void;
  changeDuration: (mins: number) => void;
  changeAmbient: (a: AmbientType) => void;
  changeVolume: (v: number) => void;
  start: () => Promise<void>;
  pause: () => void;
  reset: () => Promise<void>;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({
  onSessionCompleted,
  children,
}: {
  onSessionCompleted: () => void;
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [customMinutes, setCustomMinutes] = useState(25);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [ambient, setAmbient] = useState<AmbientType>("none");
  const [volume, setVolume] = useState(0.25);

  const workerRef = useRef<Worker | null>(null);
  const stateRef = useRef({ activeSessionId, customMinutes, notes, onSessionCompleted });
  stateRef.current = { activeSessionId, customMinutes, notes, onSessionCompleted };

  useEffect(() => {
    const worker = new Worker("/workers/timer-worker.js");
    workerRef.current = worker;

    worker.onmessage = async (event) => {
      const { type, remainingSeconds } = event.data;
      if (type === "TICK") {
        setSecondsLeft(remainingSeconds);
      }
      if (type === "DONE") {
        setIsRunning(false);
        ambientEngine.stop();
        ambientEngine.playBell();
          if (localStorage.getItem("kronoflow-auto-break") === "on" && true) {
            setMode("short_break");
            setCustomMinutes(5);
            setSecondsLeft(5 * 60);
          }
        setAmbient("none");
        const { activeSessionId: sid, customMinutes: mins, notes: curNotes, onSessionCompleted: cb } =
          stateRef.current;

        if (sid) {
          await fetch(`/api/sessions/${sid}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "completed",
              actualMinutes: mins,
              notes: curNotes.trim() || undefined,
            }),
          });
          setActiveSessionId(null);
        }

        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification("KronoFlow — Hoàn thành phiên tập trung!", {
            body: `Bạn vừa hoàn thành ${mins} phút tập trung.`,
          });
        }

        setStatusMessage("Đã hoàn thành phiên học, phát chuông và lưu vào PostgreSQL.");
        cb();
      }
    };

    return () => {
      worker.terminate();
      ambientEngine.stop();
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isRunning) {
      document.title = `${formatDuration(secondsLeft)} · KronoFlow`;
    } else {
      document.title = "KronoFlow — Không gian học tập & quản lý thời gian";
    }
  }, [isRunning, secondsLeft]);

  useEffect(() => {
    if (!isRunning) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isRunning]);

  const changeMode = (nextMode: TimerMode) => {
    if (isRunning) return;
    const mins = MODE_CONFIG[nextMode].minutes;
    setMode(nextMode);
    setCustomMinutes(mins);
    setSecondsLeft(mins * 60);
    setStatusMessage(null);
  };

  const changeDuration = (mins: number) => {
    if (isRunning) return;
    setCustomMinutes(mins);
    setSecondsLeft(mins * 60);
  };

  const changeAmbient = (next: AmbientType) => {
    setAmbient(next);
    if (next === "none") ambientEngine.stop();
    else ambientEngine.start(next, volume);
  };

  const changeVolume = (v: number) => {
    setVolume(v);
    ambientEngine.setVolume(v);
  };

  const start = async () => {
    if (isRunning) return;
    setStatusMessage(null);
    if (!activeSessionId) {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selectedSubjectId || null,
          mode,
          plannedMinutes: customMinutes,
          notes: notes.trim() || undefined,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setActiveSessionId(json.data?.id ?? null);
      }
    }
    setIsRunning(true);
    workerRef.current?.postMessage({ type: "START", durationSeconds: secondsLeft });
  };

  const pause = () => {
    setIsRunning(false);
    workerRef.current?.postMessage({ type: "PAUSE" });
  };

  const reset = async () => {
    setIsRunning(false);
    workerRef.current?.postMessage({ type: "RESET" });
    if (activeSessionId) {
      const elapsedMinutes = Math.max(0, Math.round((customMinutes * 60 - secondsLeft) / 60));
      await fetch(`/api/sessions/${activeSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "aborted", actualMinutes: elapsedMinutes }),
      });
      setActiveSessionId(null);
      onSessionCompleted();
    }
    setSecondsLeft(customMinutes * 60);
  };

  return (
    <TimerContext.Provider
      value={{
        mode,
        customMinutes,
        selectedSubjectId,
        notes,
        secondsLeft,
        isRunning,
        activeSessionId,
        statusMessage,
        ambient,
        volume,
        setSelectedSubjectId,
        setNotes,
        changeMode,
        changeDuration,
        changeAmbient,
        changeVolume,
        start,
        pause,
        reset,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
}
