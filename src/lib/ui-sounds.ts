export type UiSoundStyle = "wood" | "bubble";

let sharedAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    sharedAudioCtx = new Ctor();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function isUiSoundsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("kronoflow-ui-sounds") === "on";
}

export function setUiSoundsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("kronoflow-ui-sounds", enabled ? "on" : "off");
}

export function getUiSoundStyle(): UiSoundStyle {
  if (typeof window === "undefined") return "wood";
  return localStorage.getItem("kronoflow-ui-sound-style") === "bubble" ? "bubble" : "wood";
}

export function setUiSoundStyle(style: UiSoundStyle): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("kronoflow-ui-sound-style", style);
}

export function playUiTick(kind: "check" | "flip" | "tab" = "check", force = false): void {
  if (typeof window === "undefined") return;
  if (!force && !isUiSoundsEnabled()) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const style = getUiSoundStyle();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (style === "bubble") {
      osc.type = "sine";
      const fStart = kind === "check" ? 420 : kind === "flip" ? 360 : 320;
      const fEnd = kind === "check" ? 880 : kind === "flip" ? 640 : 520;
      osc.frequency.setValueAtTime(fStart, now);
      osc.frequency.exponentialRampToValueAtTime(fEnd, now + 0.085);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } else {
      osc.type = "triangle";
      const fStart = kind === "check" ? 720 : kind === "flip" ? 560 : 480;
      const fEnd = kind === "check" ? 1040 : kind === "flip" ? 720 : 600;
      osc.frequency.setValueAtTime(fStart, now);
      osc.frequency.exponentialRampToValueAtTime(fEnd, now + 0.055);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch {
    // ignore audio block
  }
}
