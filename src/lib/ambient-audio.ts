export type AmbientType = "none" | "brown" | "rain" | "cafe" | "binaural";

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private nodes: AudioNode[] = [];

  start(type: AmbientType, volume = 0.25) {
    this.stop();
    if (type === "none" || typeof window === "undefined") return;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.gain.value = volume;
    gain.connect(ctx.destination);

    if (type === "binaural") {
      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();
      const panL = ctx.createStereoPanner();
      const panR = ctx.createStereoPanner();
      oscL.frequency.value = 200;
      oscR.frequency.value = 210;
      panL.pan.value = -0.8;
      panR.pan.value = 0.8;
      oscL.connect(panL).connect(gain);
      oscR.connect(panR).connect(gain);
      oscL.start();
      oscR.start();
      this.nodes = [oscL, oscR, panL, panR];
    } else {
      const bufferSize = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        const coeff = type === "brown" ? 0.02 : type === "cafe" ? 0.04 : 0.06;
        data[i] = (lastOut + coeff * white) / (1 + coeff);
        lastOut = data[i] ?? 0;
        data[i] = (data[i] ?? 0) * (type === "brown" ? 3.2 : 1.7);
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = type === "cafe" ? "bandpass" : "lowpass";
      filter.frequency.value = type === "brown" ? 380 : type === "cafe" ? 650 : 1200;

      source.connect(filter).connect(gain);
      source.start();
      this.nodes = [source, filter];
    }

    this.ctx = ctx;
    this.gainNode = gain;
  }

  playBell() {
    if (typeof window === "undefined") return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.15);
  }

  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  stop() {
    try {
      for (const n of this.nodes) {
        if ("stop" in n && typeof (n as OscillatorNode).stop === "function") {
          (n as OscillatorNode).stop();
        }
      }
      this.ctx?.close();
    } catch {
      // ignore
    }
    this.nodes = [];
    this.gainNode = null;
    this.ctx = null;
  }
}

export const ambientEngine = new AmbientAudioEngine();
