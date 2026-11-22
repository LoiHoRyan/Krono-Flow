export function isUiSoundsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("kronoflow-ui-sounds") === "on";
}

export function setUiSoundsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("kronoflow-ui-sounds", enabled ? "on" : "off");
}

export function playUiTick(kind: "check" | "flip" = "check"): void {
  if (typeof window === "undefined" || !isUiSoundsEnabled()) return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = kind === "check" ? "sine" : "triangle";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(kind === "check" ? 660 : 480, now);
    osc.frequency.exponentialRampToValueAtTime(kind === "check" ? 980 : 620, now + 0.06);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch {
    // ignore audio block
  }
}
