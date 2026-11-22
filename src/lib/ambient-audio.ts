export type AmbientChannel = "rain" | "brown" | "cafe" | "binaural";
export type AmbientType = "none" | AmbientChannel;
export type BellStyle = "soft" | "zen" | "bright";

interface ChannelState {
  gain: GainNode;
  nodes: AudioNode[];
}

class MultiChannelAmbientEngine {
  private ctx: AudioContext | null = null;
  private channels = new Map<AmbientChannel, ChannelState>();

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx || this.ctx.state === "closed") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setChannelVolume(channel: AmbientChannel, volume: number) {
    const v = Math.max(0, Math.min(1, volume));
    const existing = this.channels.get(channel);

    if (v <= 0.01) {
      if (existing) {
        this.stopChannel(channel);
      }
      return;
    }

    if (existing) {
      existing.gain.gain.value = v;
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx) return;

    const gain = ctx.createGain();
    gain.gain.value = v;
    gain.connect(ctx.destination);

    let nodes: AudioNode[] = [];
    if (channel === "binaural") {
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
      nodes = [oscL, oscR, panL, panR];
    } else {
      const bufferSize = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        const coeff = channel === "brown" ? 0.02 : channel === "cafe" ? 0.04 : 0.06;
        data[i] = (lastOut + coeff * white) / (1 + coeff);
        lastOut = data[i] ?? 0;
        data[i] = (data[i] ?? 0) * (channel === "brown" ? 3.0 : 1.5);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = channel === "cafe" ? "bandpass" : "lowpass";
      filter.frequency.value = channel === "brown" ? 380 : channel === "cafe" ? 650 : 1200;

      source.connect(filter).connect(gain);
      source.start();
      nodes = [source, filter];
    }

    this.channels.set(channel, { gain, nodes });
  }

  stopChannel(channel: AmbientChannel) {
    const ch = this.channels.get(channel);
    if (!ch) return;
    try {
      for (const n of ch.nodes) {
        if ("stop" in n && typeof (n as OscillatorNode).stop === "function") {
          (n as OscillatorNode).stop();
        }
      }
      ch.gain.disconnect();
    } catch {
      // ignore
    }
    this.channels.delete(channel);
  }

  // Giữ tương thích ngược với TimerProvider
  start(type: AmbientType, volume = 0.25) {
    this.stop();
    if (type !== "none") this.setChannelVolume(type, volume);
  }

  setVolume(volume: number) {
    for (const ch of this.channels.values()) {
      ch.gain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  stop() {
    for (const key of Array.from(this.channels.keys())) {
      this.stopChannel(key);
    }
  }

  playBell(styleOverride?: BellStyle) {
    if (typeof window === "undefined") return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const saved = (localStorage.getItem("kronoflow-bell") as BellStyle | null) ?? "soft";
    const style = styleOverride ?? saved;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (style === "zen") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(432, now);
      osc.frequency.exponentialRampToValueAtTime(430, now + 1.8);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 2.05);
    } else if (style === "bright") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(784, now);
      osc.frequency.setValueAtTime(1046, now + 0.14);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.95);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.15);
    }
  }
}

export const ambientEngine = new MultiChannelAmbientEngine();
