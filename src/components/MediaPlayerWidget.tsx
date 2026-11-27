"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  CloudRain,
  ExternalLink,
  FolderOpen,
  History,
  Link2,
  ListMusic,
  ListPlus,
  Minimize2,
  Music2,
  Pause,
  Play,
  Plus,
  Repeat,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  VolumeX,
  Waves,
  X,
} from "lucide-react";

interface LocalTrack {
  id: string;
  name: string;
  url: string;
  sizeKb: number;
}

interface SavedMediaLink {
  id: string;
  title: string;
  url: string;
  platform: "youtube" | "spotify" | "soundcloud" | "tiktok" | "facebook" | "instagram" | "audio" | "other";
}

interface OnlineSearchHit {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  url: string;
  kind: "video" | "playlist";
  duration?: string;
  views?: string;
}

interface ParsedEmbed {
  platform: SavedMediaLink["platform"];
  embedUrl: string | null;
  directAudioUrl: string | null;
  label: string;
}

const LINKS_STORAGE_KEY = "kronoflow-media-links";
const RECENT_SEARCH_KEY = "kronoflow-media-recent-searches-v1";
const QUICK_SEARCH_CHIPS = [
  "lofi hip hop study",
  "nhạc piano không lời tập trung",
  "tiếng mưa đêm học bài",
  "study with me 2 hours",
  "nhạc không lời chill",
];

type AmbientChannel = "rain" | "brown" | "white" | "ocean";

const AMBIENT_META: { id: AmbientChannel; label: string; desc: string }[] = [
  { id: "rain", label: "Tiếng mưa nhẹ", desc: "Lọc tần số mềm, dịu tai khi đọc sách" },
  { id: "brown", label: "Brown Noise", desc: "Trầm ấm, cắt tiếng ồn phòng cực tốt" },
  { id: "white", label: "White Noise", desc: "Tần số đều, giúp giữ mạch tập trung" },
  { id: "ocean", label: "Sóng biển êm", desc: "Nhịp thở lên xuống nhẹ nhàng thư giãn" },
];

function parseMediaLink(raw: string, loopOne: boolean): ParsedEmbed {
  const url = raw.trim();
  if (!url) {
    return { platform: "other", embedUrl: null, directAudioUrl: null, label: "Liên kết" };
  }

  if (/\.(mp3|wav|ogg|m4a|flac|aac)(\?.*)?$/i.test(url)) {
    return { platform: "audio", embedUrl: null, directAudioUrl: url, label: "Tệp âm thanh" };
  }

  const ytPlaylist = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  const ytVideo =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/) ??
    null;

  if (ytVideo && ytVideo[1]) {
    const vid = ytVideo[1];
    const loopParams = loopOne
      ? `&loop=1&playlist=${vid}`
      : ytPlaylist && ytPlaylist[1]
      ? `&list=${ytPlaylist[1]}`
      : "";
    return {
      platform: "youtube",
      embedUrl: `https://www.youtube.com/embed/${vid}?autoplay=1&rel=0${loopParams}`,
      directAudioUrl: null,
      label: "YouTube",
    };
  }
  if (ytPlaylist && ytPlaylist[1] && /youtube\.com|youtu\.be/i.test(url)) {
    const loopQ = loopOne ? "&loop=1" : "";
    return {
      platform: "youtube",
      embedUrl: `https://www.youtube.com/embed/videoseries?list=${ytPlaylist[1]}&autoplay=1${loopQ}`,
      directAudioUrl: null,
      label: "YouTube Playlist",
    };
  }

  const sp = url.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode)\/([a-zA-Z0-9]+)/i);
  if (sp && sp[1] && sp[2]) {
    return {
      platform: "spotify",
      embedUrl: `https://open.spotify.com/embed/${sp[1]}/${sp[2]}?utm_source=generator`,
      directAudioUrl: null,
      label: "Spotify",
    };
  }

  if (/soundcloud\.com\//i.test(url)) {
    return {
      platform: "soundcloud",
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%236366f1&auto_play=true&hide_related=true&show_comments=false&show_user=true`,
      directAudioUrl: null,
      label: "SoundCloud",
    };
  }

  if (/tiktok\.com/i.test(url)) {
    const ttId = url.match(/\/video\/(\d+)/);
    return {
      platform: "tiktok",
      embedUrl: ttId && ttId[1] ? `https://www.tiktok.com/embed/v2/${ttId[1]}` : null,
      directAudioUrl: null,
      label: "TikTok",
    };
  }

  if (/facebook\.com|fb\.watch/i.test(url)) {
    return {
      platform: "facebook",
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
      directAudioUrl: null,
      label: "Facebook",
    };
  }

  if (/instagram\.com/i.test(url)) {
    const ig = url.match(/instagram\.com\/(p|reel|tv)\/([a-zA-Z0-9_-]+)/i);
    return {
      platform: "instagram",
      embedUrl: ig && ig[1] && ig[2] ? `https://www.instagram.com/${ig[1]}/${ig[2]}/embed` : null,
      directAudioUrl: null,
      label: "Instagram",
    };
  }

  return { platform: "other", embedUrl: null, directAudioUrl: null, label: "Liên kết ngoài" };
}

function fmtSec(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function MediaPlayerWidget({
  open,
  onToggleOpen,
}: {
  open: boolean;
  onToggleOpen: () => void;
}) {
  const [sourceTab, setSourceTab] = useState<"search" | "link" | "ambient" | "local">("search");
  const [dockRight, setDockRight] = useState(false);

  // Local audio playlist
  const [tracks, setTracks] = useState<LocalTrack[]>([]);
  const [trackIdx, setTrackIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loopMode, setLoopMode] = useState<"all" | "one">("one");
  const [shuffle, setShuffle] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [curTime, setCurTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Online links (starts clean with NO hardcoded broken presets) + Up Next Queue
  const [savedLinks, setSavedLinks] = useState<SavedMediaLink[]>([]);
  const [queue, setQueue] = useState<SavedMediaLink[]>([]);
  const [linkFilter, setLinkFilter] = useState<
    "all" | "youtube" | "spotify" | "soundcloud" | "tiktok" | "facebook" | "instagram"
  >("all");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [activeLink, setActiveLink] = useState<SavedMediaLink | null>(null);
  const [loopLink, setLoopLink] = useState(true);
  const [sleepSecsLeft, setSleepSecsLeft] = useState(0);

  // Multi-platform Online Search (up to 30 results + duration filter + recent history)
  const [searchPlatform, setSearchPlatform] = useState<
    "yt-video" | "yt-playlist" | "tiktok" | "facebook" | "instagram"
  >("yt-video");
  const [searchFilter, setSearchFilter] = useState<"all" | "short" | "long" | "live" | "recent">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchHits, setSearchHits] = useState<OnlineSearchHit[]>([]);
  const [fallbackSearchUrl, setFallbackSearchUrl] = useState("");

  // Pure Web Audio API Ambient Noise Mixer (0 external links, never breaks)
  const [ambientVol, setAmbientVol] = useState<Record<AmbientChannel, number>>({
    rain: 0,
    brown: 0,
    white: 0,
    ocean: 0,
  });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientGainsRef = useRef<Partial<Record<AmbientChannel, GainNode>>>({});
  const ambientStartedRef = useRef(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef<LocalTrack[]>([]);
  tracksRef.current = tracks;

  // Load saved links (auto-removing any legacy broken preset-* items) + recent searches
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LINKS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (item): item is SavedMediaLink =>
              Boolean(item) &&
              typeof item === "object" &&
              typeof (item as SavedMediaLink).id === "string" &&
              !(item as SavedMediaLink).id.startsWith("preset-") &&
              typeof (item as SavedMediaLink).url === "string"
          );
          setSavedLinks(cleaned);
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(cleaned));
          }
        }
      }
      const rawRecent = localStorage.getItem(RECENT_SEARCH_KEY);
      if (rawRecent) {
        const parsedRecent = JSON.parse(rawRecent) as unknown;
        if (Array.isArray(parsedRecent)) {
          setRecentSearches(parsedRecent.filter((s): s is string => typeof s === "string").slice(0, 6));
        }
      }
    } catch {
      // ignore storage errors
    }
    return () => {
      for (const t of tracksRef.current) {
        URL.revokeObjectURL(t.url);
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  // Sleep Auto-Stop timer
  useEffect(() => {
    if (sleepSecsLeft <= 0) return;
    const id = setInterval(() => {
      setSleepSecsLeft((prev) => {
        if (prev <= 1) {
          if (audioRef.current) audioRef.current.pause();
          setPlaying(false);
          setActiveLink(null);
          setAmbientVol({ rain: 0, brown: 0, white: 0, ocean: 0 });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [sleepSecsLeft]);

  const ensureAmbientEngine = () => {
    if (ambientStartedRef.current && audioCtxRef.current) {
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;
    const bufferSize = ctx.sampleRate * 4;

    const makeNoiseBuffer = (type: "white" | "pink" | "brown") => {
      const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const out = buf.getChannelData(0);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === "white") {
          out[i] = white * 0.25;
        } else if (type === "pink") {
          b0 = 0.99765 * b0 + white * 0.099046;
          b1 = 0.963 * b1 + white * 0.2965164;
          b2 = 0.57 * b2 + white * 1.0526913;
          out[i] = (b0 + b1 + b2 + white * 0.1848) * 0.08;
        } else {
          lastOut = (lastOut + 0.02 * white) / 1.02;
          out[i] = lastOut * 1.4;
        }
      }
      return buf;
    };

    const setupChannel = (
      ch: AmbientChannel,
      noiseType: "white" | "pink" | "brown",
      filterType: BiquadFilterType,
      freq: number,
      modulateLfo: boolean
    ) => {
      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuffer(noiseType);
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = freq;

      const gain = ctx.createGain();
      gain.gain.value = 0;

      if (modulateLfo) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.14;
        lfoGain.gain.value = 260;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
      }

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      ambientGainsRef.current[ch] = gain;
    };

    setupChannel("rain", "pink", "bandpass", 1100, false);
    setupChannel("brown", "brown", "lowpass", 420, false);
    setupChannel("white", "white", "lowpass", 3600, false);
    setupChannel("ocean", "pink", "lowpass", 520, true);
    ambientStartedRef.current = true;
  };

  useEffect(() => {
    const anyOn = Object.values(ambientVol).some((v) => v > 0);
    if (anyOn) ensureAmbientEngine();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    (["rain", "brown", "white", "ocean"] as AmbientChannel[]).forEach((ch) => {
      const g = ambientGainsRef.current[ch];
      if (g) {
        g.gain.setTargetAtTime((ambientVol[ch] ?? 0) * 0.55, ctx.currentTime, 0.08);
      }
    });
  }, [ambientVol]);

  const persistLinks = (next: SavedMediaLink[]) => {
    setSavedLinks(next);
    try {
      localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const recordRecentSearch = (q: string) => {
    const cleaned = q.trim();
    if (!cleaned) return;
    setRecentSearches((prev) => {
      const next = [cleaned, ...prev.filter((x) => x.toLowerCase() !== cleaned.toLowerCase())].slice(0, 6);
      try {
        localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const currentTrack = tracks[trackIdx] ?? null;
  const ambientActive = Object.values(ambientVol).some((v) => v > 0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
  }, [volume]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !currentTrack) return;
    el.src = currentTrack.url;
    if (playing) {
      el.play().catch(() => setPlaying(false));
    }
  }, [trackIdx, currentTrack?.id]);

  const handleAddFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added: LocalTrack[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f) continue;
      added.push({
        id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name.replace(/\.[^/.]+$/, ""),
        url: URL.createObjectURL(f),
        sizeKb: Math.max(1, Math.round(f.size / 1024)),
      });
    }
    setTracks((prev) => {
      const next = [...prev, ...added];
      if (prev.length === 0 && next.length > 0) {
        setTrackIdx(0);
        setPlaying(true);
      }
      return next;
    });
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el || !currentTrack) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const playNext = () => {
    if (tracks.length === 0) return;
    if (shuffle && tracks.length > 1) {
      let n = trackIdx;
      while (n === trackIdx) n = Math.floor(Math.random() * tracks.length);
      setTrackIdx(n);
    } else {
      setTrackIdx((i) => (i + 1) % tracks.length);
    }
    setPlaying(true);
  };

  const playPrev = () => {
    if (tracks.length === 0) return;
    setTrackIdx((i) => (i - 1 + tracks.length) % tracks.length);
    setPlaying(true);
  };

  const removeTrack = (idx: number) => {
    const target = tracks[idx];
    if (target) URL.revokeObjectURL(target.url);
    const next = tracks.filter((_, i) => i !== idx);
    setTracks(next);
    if (next.length === 0) {
      setPlaying(false);
      setTrackIdx(0);
    } else if (idx <= trackIdx) {
      setTrackIdx(Math.max(0, trackIdx - 1));
    }
  };

  const handleAddLink = (playNow: boolean) => {
    const u = linkUrl.trim();
    if (!u) return;
    const parsed = parseMediaLink(u, loopLink);
    const item: SavedMediaLink = {
      id: `lnk-${Date.now()}`,
      title: linkTitle.trim() || `${parsed.label} — ${u.slice(0, 34)}`,
      url: u,
      platform: parsed.platform,
    };
    persistLinks([item, ...savedLinks]);
    setLinkTitle("");
    setLinkUrl("");
    if (playNow) setActiveLink(item);
  };

  const addToQueue = (item: SavedMediaLink) => {
    setQueue((prev) => (prev.some((x) => x.url === item.url) ? prev : [...prev, item]));
  };

  const handleOnlineSearch = async (overrideQuery?: string, overrideFilter?: typeof searchFilter) => {
    const q = (overrideQuery ?? searchQuery).trim();
    if (!q) return;
    if (overrideQuery !== undefined) setSearchQuery(q);
    const activeFilter = overrideFilter ?? searchFilter;
    recordRecentSearch(q);

    if (searchPlatform === "tiktok") {
      window.open(`https://www.tiktok.com/search?q=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer");
      return;
    }
    if (searchPlatform === "facebook") {
      window.open(`https://www.facebook.com/watch/search/?q=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer");
      return;
    }
    if (searchPlatform === "instagram") {
      window.open(`https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer");
      return;
    }

    setSearching(true);
    setFallbackSearchUrl("");
    try {
      const typeParam = searchPlatform === "yt-playlist" ? "playlist" : "video";
      const res = await fetch(
        `/api/media-search?q=${encodeURIComponent(q)}&type=${typeParam}&filter=${activeFilter}&limit=30`
      );
      if (res.ok) {
        const json = (await res.json()) as { data?: OnlineSearchHit[]; fallbackUrl?: string };
        setSearchHits(Array.isArray(json.data) ? json.data : []);
        setFallbackSearchUrl(json.fallbackUrl ?? "");
      } else {
        setSearchHits([]);
      }
    } catch {
      setSearchHits([]);
    } finally {
      setSearching(false);
    }
  };

  const playSearchHit = (hit: OnlineSearchHit, saveAlso: boolean) => {
    const item: SavedMediaLink = {
      id: `yt-${hit.id}`,
      title: hit.title,
      url: hit.url,
      platform: "youtube",
    };
    setActiveLink(item);
    if (saveAlso && !savedLinks.some((x) => x.url === item.url)) {
      persistLinks([item, ...savedLinks]);
    }
  };

  const filteredLinks = savedLinks.filter((l) => linkFilter === "all" || l.platform === linkFilter);
  const navPool = queue.length > 0 ? queue : filteredLinks;

  const stepActiveLink = (dir: 1 | -1) => {
    if (navPool.length === 0) return;
    const idx = activeLink ? navPool.findIndex((x) => x.url === activeLink.url) : -1;
    const nextIdx = idx === -1 ? 0 : (idx + dir + navPool.length) % navPool.length;
    const pick = navPool[nextIdx];
    if (pick) setActiveLink(pick);
  };

  const activeParsed = activeLink ? parseMediaLink(activeLink.url, loopLink) : null;
  const nowPlayingTitle = activeLink
    ? activeLink.title
    : playing && currentTrack
    ? currentTrack.name
    : ambientActive
    ? "Âm thanh nền tập trung"
    : "";

  const stopAllPlayback = () => {
    setActiveLink(null);
    if (audioRef.current) audioRef.current.pause();
    setPlaying(false);
    setAmbientVol({ rain: 0, brown: 0, white: 0, ocean: 0 });
  };

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          if (loopMode === "one" && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          } else {
            playNext();
          }
        }}
      />

      {/* FLOATING MINI-PLAYER PILL when minimized & active */}
      {!open && nowPlayingTitle && (
        <div
          className={`no-print fixed bottom-20 z-50 flex max-w-[300px] items-center gap-2 rounded-full border border-[var(--accent)]/40 bg-[var(--bg-surface)]/95 px-3 py-1.5 shadow-xl backdrop-blur-md transition-all ${
            dockRight ? "right-4" : "left-4"
          }`}
        >
          <span className="flex items-end gap-0.5 h-3.5 shrink-0">
            <span className="w-0.5 h-2 animate-pulse rounded-full bg-[var(--accent)]" />
            <span className="w-0.5 h-3.5 animate-pulse rounded-full bg-[var(--accent)]" />
            <span className="w-0.5 h-2.5 animate-pulse rounded-full bg-[var(--accent)]" />
          </span>
          <button
            type="button"
            onClick={onToggleOpen}
            className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--accent)]"
            title={`Mở trình phát: ${nowPlayingTitle}`}
          >
            {nowPlayingTitle}
          </button>
          {activeLink && (
            <button
              type="button"
              onClick={() => setLoopLink((v) => !v)}
              title={loopLink ? "Đang bật Lặp 1" : "Đang tắt Lặp 1"}
              className={`rounded-full p-1 text-[10px] ${
                loopLink ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
              }`}
            >
              <Repeat className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={stopAllPlayback}
            title="Dừng phát tất cả"
            className="rounded-full p-1 text-[var(--text-muted)] hover:bg-rose-500/15 hover:text-rose-500"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Keep mounted even when closed so active YouTube/audio keeps playing in background */}
      <div
        className={`no-print fixed bottom-20 z-50 w-[94vw] max-w-[440px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-2xl transition-all duration-200 ${
          dockRight ? "right-4" : "left-4"
        } ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
        aria-hidden={!open}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Music2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold">Nhạc & Âm nền tập trung</p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Tìm 30 kết quả · Lặp 1 · Âm nền offline
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDockRight((v) => !v)}
              title="Đổi vị trí góc Trái / Phải"
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onToggleOpen}
              title="Thu gọn (nhạc vẫn phát nền)"
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 4 Tabs */}
        <div className="mb-3 grid grid-cols-4 gap-1 rounded-xl bg-[var(--bg-elevated)] p-1 text-[11px]">
          <button
            type="button"
            onClick={() => setSourceTab("search")}
            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 font-semibold transition ${
              sourceTab === "search" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <Search className="h-3 w-3" /> Tìm
          </button>
          <button
            type="button"
            onClick={() => setSourceTab("link")}
            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 font-semibold transition ${
              sourceTab === "link" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <Link2 className="h-3 w-3" /> Link
          </button>
          <button
            type="button"
            onClick={() => setSourceTab("ambient")}
            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 font-semibold transition ${
              sourceTab === "ambient" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <CloudRain className="h-3 w-3" /> Âm nền{ambientActive ? " •" : ""}
          </button>
          <button
            type="button"
            onClick={() => setSourceTab("local")}
            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 font-semibold transition ${
              sourceTab === "local" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-secondary)]"
            }`}
          >
            <FolderOpen className="h-3 w-3" /> Máy
          </button>
        </div>

        {/* Sleep Auto-Stop Timer */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-1.5 rounded-xl bg-[var(--bg-elevated)] px-2.5 py-1.5 text-[11px]">
          <span className="font-medium text-[var(--text-muted)]">
            Hẹn giờ tắt:{sleepSecsLeft > 0 ? ` còn ${fmtSec(sleepSecsLeft)}` : " Tắt"}
          </span>
          <div className="flex items-center gap-1">
            {[15, 25, 45, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSleepSecsLeft(m * 60)}
                className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] font-semibold hover:border-[var(--accent)]"
              >
                {m}p
              </button>
            ))}
            {sleepSecsLeft > 0 && (
              <button
                type="button"
                onClick={() => setSleepSecsLeft(0)}
                className="rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-500"
              >
                Hủy
              </button>
            )}
          </div>
        </div>

        {/* ACTIVE ONLINE EMBED PLAYER */}
        {activeLink && (
          <div className="mb-3 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[var(--border-subtle)] px-2.5 py-1.5">
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{activeLink.title}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setLoopLink((v) => !v)}
                  title="Bật/tắt lặp lại đúng 1 bài này"
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold transition ${
                    loopLink
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]"
                  }`}
                >
                  <Repeat className="h-3 w-3" /> {loopLink ? "Lặp 1: BẬT" : "Lặp 1: TẮT"}
                </button>
                {navPool.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => stepActiveLink(-1)}
                      title="Bài trước"
                      className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
                    >
                      <SkipBack className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => stepActiveLink(1)}
                      title="Bài tiếp"
                      className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
                    >
                      <SkipForward className="h-3 w-3" />
                    </button>
                  </>
                )}
                <a
                  href={activeLink.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--accent)]"
                  title="Mở trang gốc"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setActiveLink(null)}
                  className="rounded p-1 text-[var(--text-muted)] hover:text-rose-500"
                  title="Đóng trình phát"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {activeParsed?.directAudioUrl ? (
              <div className="p-2.5">
                <audio
                  key={`${activeLink.id}-${loopLink ? "loop" : "once"}`}
                  src={activeParsed.directAudioUrl}
                  controls
                  autoPlay
                  loop={loopLink}
                  className="w-full"
                />
              </div>
            ) : activeParsed?.embedUrl ? (
              <iframe
                key={`${activeLink.id}-${loopLink ? "loop" : "once"}`}
                src={activeParsed.embedUrl}
                title={activeLink.title}
                className={activeParsed.platform === "spotify" ? "h-40 w-full" : "h-48 w-full"}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="p-3 text-center text-xs text-[var(--text-muted)]">
                Nền tảng này hạn chế nhúng trực tiếp. Bấm biểu tượng góc phải để mở gốc.
              </div>
            )}
          </div>
        )}

        {/* TAB 1: MULTI-PLATFORM ONLINE SEARCH (UP TO 30 RESULTS) */}
        {sourceTab === "search" && (
          <div className="space-y-2.5">
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["yt-video", "YT Video"],
                  ["yt-playlist", "YT Playlist"],
                  ["tiktok", "TikTok"],
                  ["facebook", "Facebook"],
                  ["instagram", "Instagram"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSearchPlatform(id)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition ${
                    searchPlatform === id
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {searchPlatform === "yt-video" && (
              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                {(
                  [
                    ["all", "Tất cả"],
                    ["short", "< 4 phút"],
                    ["long", "> 20 phút"],
                    ["live", "Đang Live"],
                    ["recent", "Mới nhất"],
                  ] as const
                ).map(([fid, flabel]) => (
                  <button
                    key={fid}
                    type="button"
                    onClick={() => {
                      setSearchFilter(fid);
                      if (searchQuery.trim()) void handleOnlineSearch(searchQuery, fid);
                    }}
                    className={`rounded-md border px-2 py-0.5 font-medium transition ${
                      searchFilter === fid
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]"
                    }`}
                  >
                    {flabel}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleOnlineSearch();
              }}
              className="flex gap-1.5"
            >
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchPlatform === "yt-video"
                    ? "Tìm bài hát, nhạc học bài, lofi..."
                    : searchPlatform === "yt-playlist"
                    ? "Tìm danh sách phát YouTube..."
                    : "Nhập từ khóa để tìm trên nền tảng..."
                }
                className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                disabled={searching}
                className="btn-primary inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
              >
                <Search className="h-3.5 w-3.5" /> {searching ? "Đang tìm..." : "Tìm"}
              </button>
            </form>

            {/* Recent Searches */}
            {recentSearches.length > 0 && !searching && (
              <div className="flex flex-wrap items-center gap-1">
                <History className="h-3 w-3 text-[var(--text-muted)]" />
                {recentSearches.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void handleOnlineSearch(q)}
                    className="max-w-[140px] truncate rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Skeleton Loading */}
            {searching && (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="flex animate-pulse items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2"
                  >
                    <div className="h-11 w-20 shrink-0 rounded-lg bg-[var(--border-subtle)]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-4/5 rounded bg-[var(--border-subtle)]" />
                      <div className="h-2.5 w-1/2 rounded bg-[var(--border-subtle)]" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results List (up to 30 hits) */}
            {!searching && searchHits.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  <span>Tìm thấy {searchHits.length} kết quả</span>
                  {queue.length > 0 && (
                    <span className="font-semibold text-[var(--accent)]">Hàng đợi: {queue.length} bài</span>
                  )}
                </div>
                <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                  {searchHits.map((hit) => (
                    <div
                      key={`${hit.kind}-${hit.id}`}
                      className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1.5 transition hover:border-[var(--accent)]/50"
                    >
                      <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-black/20">
                        {hit.thumbnail ? (
                          <img src={hit.thumbnail} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                            <ListMusic className="h-4 w-4" />
                          </div>
                        )}
                        {hit.duration && (
                          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 py-0.2 text-[9px] font-bold text-white">
                            {hit.duration}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-xs font-semibold">{hit.title}</p>
                        <p className="truncate text-[10px] text-[var(--text-muted)]">
                          {hit.author}
                          {hit.views ? ` · ${hit.views}` : ""}
                        </p>
                        <div className="mt-1 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => playSearchHit(hit, false)}
                            className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-white hover:opacity-90"
                          >
                            <Play className="h-2.5 w-2.5" /> Phát
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              addToQueue({
                                id: `q-${hit.id}`,
                                title: hit.title,
                                url: hit.url,
                                platform: "youtube",
                              })
                            }
                            title="Thêm vào hàng đợi"
                            className="inline-flex items-center gap-0.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] font-semibold hover:border-[var(--accent)]"
                          >
                            <ListPlus className="h-2.5 w-2.5" /> Đợi
                          </button>
                          <button
                            type="button"
                            onClick={() => playSearchHit(hit, true)}
                            title="Phát & Lưu vào danh sách"
                            className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] font-semibold hover:border-[var(--accent)]"
                          >
                            Lưu
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty / Suggestions State */}
            {!searching && searchHits.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-3 text-center">
                <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                  Gõ tên bài hát, nghệ sĩ hoặc chọn nhanh gợi ý tìm kiếm:
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {QUICK_SEARCH_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => void handleOnlineSearch(chip)}
                      className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[10px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                {fallbackSearchUrl && (
                  <a
                    href={fallbackSearchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Mở trực tiếp trên YouTube
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PASTE LINK + PERSONAL SAVED LINKS + QUEUE */}
        {sourceTab === "link" && (
          <div className="space-y-2.5">
            <div className="space-y-1.5">
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="Dán link YouTube, Spotify, SoundCloud, TikTok, FB, MP3..."
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
              />
              <div className="flex gap-1.5">
                <input
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="Tên gợi nhớ (tuỳ chọn)..."
                  className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => handleAddLink(true)}
                  className="btn-primary inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" /> Phát
                </button>
              </div>
            </div>

            {/* Up Next Queue */}
            {queue.length > 0 && (
              <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)]/30 p-2">
                <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-[var(--accent)]">
                  <span>Hàng đợi phát tiếp ({queue.length})</span>
                  <button
                    type="button"
                    onClick={() => setQueue([])}
                    className="text-[10px] font-semibold text-rose-500 hover:underline"
                  >
                    Xóa hàng đợi
                  </button>
                </div>
                <div className="max-h-24 space-y-1 overflow-y-auto">
                  {queue.map((q) => (
                    <div key={q.id} className="flex items-center justify-between gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setActiveLink(q)}
                        className="truncate text-left font-medium hover:text-[var(--accent)]"
                      >
                        ▶ {q.title}
                      </button>
                      <button
                        type="button"
                        onClick={() => setQueue((prev) => prev.filter((x) => x.id !== q.id))}
                        className="text-[var(--text-muted)] hover:text-rose-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Platform Filter Pills */}
            <div className="flex flex-wrap gap-1">
              {(["all", "youtube", "spotify", "soundcloud", "tiktok", "facebook", "instagram"] as const).map(
                (pf) => (
                  <button
                    key={pf}
                    type="button"
                    onClick={() => setLinkFilter(pf)}
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      linkFilter === pf
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                    }`}
                  >
                    {pf === "all" ? `Tất cả (${savedLinks.length})` : pf}
                  </button>
                )
              )}
            </div>

            {filteredLinks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-center text-xs text-[var(--text-muted)]">
                Chưa có link nào được lưu. Dán link ở trên hoặc sang tab <strong>Tìm</strong> để tìm và lưu bài yêu thích của bạn.
              </div>
            ) : (
              <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                {filteredLinks.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs transition ${
                      activeLink?.id === item.id
                        ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                        : "bg-[var(--bg-elevated)] hover:bg-[var(--accent-soft)]/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveLink(item)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <Play className="h-3 w-3 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </button>
                    <span className="shrink-0 rounded bg-[var(--bg-surface)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--text-muted)]">
                      {item.platform}
                    </span>
                    <button
                      type="button"
                      onClick={() => persistLinks(savedLinks.filter((x) => x.id !== item.id))}
                      className="text-[var(--text-muted)] hover:text-rose-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PURE WEB AUDIO AMBIENT NOISE MIXER */}
        {sourceTab === "ambient" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between rounded-xl bg-[var(--bg-elevated)] px-3 py-2 text-[11px]">
              <div className="flex items-center gap-1.5 font-semibold">
                <Waves className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>Tạo trực tiếp trên trình duyệt (0 link chết)</span>
              </div>
              {ambientActive && (
                <button
                  type="button"
                  onClick={() => setAmbientVol({ rain: 0, brown: 0, white: 0, ocean: 0 })}
                  className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-500"
                >
                  <VolumeX className="h-3 w-3" /> Tắt hết
                </button>
              )}
            </div>
            <div className="space-y-2">
              {AMBIENT_META.map((ch) => {
                const val = ambientVol[ch.id] ?? 0;
                return (
                  <div
                    key={ch.id}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold">{ch.label}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{ch.desc}</p>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-[var(--accent)]">
                        {Math.round(val * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={val}
                      onChange={(e) =>
                        setAmbientVol((prev) => ({ ...prev, [ch.id]: Number(e.target.value) }))
                      }
                      className="w-full accent-[var(--accent)]"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: LOCAL MP3/WAV PLAYLIST */}
        {sourceTab === "local" && (
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--accent)]/60 bg-[var(--accent-soft)]/40 px-3 py-2.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)]">
              <Plus className="h-4 w-4" /> Chọn tệp nhạc từ máy (.mp3, .wav, .m4a, .ogg)
              <input
                type="file"
                accept="audio/*"
                multiple
                className="hidden"
                onChange={(e) => handleAddFiles(e.target.files)}
              />
            </label>

            {currentTrack ? (
              <div className="rounded-xl bg-[var(--bg-elevated)] p-3">
                <p className="truncate text-xs font-bold">{currentTrack.name}</p>
                <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-[var(--text-muted)]">
                  <span>{fmtSec(curTime)}</span>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(1, duration)}
                    value={curTime}
                    onChange={(e) => {
                      const t = Number(e.target.value);
                      if (audioRef.current) audioRef.current.currentTime = t;
                      setCurTime(t);
                    }}
                    className="flex-1 accent-[var(--accent)]"
                  />
                  <span>{fmtSec(duration)}</span>
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShuffle((v) => !v)}
                      title="Phát ngẫu nhiên"
                      className={`rounded-lg p-1.5 ${
                        shuffle ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-muted)]"
                      }`}
                    >
                      <Shuffle className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoopMode((m) => (m === "all" ? "one" : "all"))}
                      title={loopMode === "one" ? "Lặp 1 bài" : "Lặp danh sách"}
                      className={`rounded-lg px-1.5 py-1 text-[10px] font-bold ${
                        loopMode === "one"
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--accent-soft)] text-[var(--accent)]"
                      }`}
                    >
                      <Repeat className="inline h-3 w-3" /> {loopMode === "one" ? "1" : "∞"}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={playPrev} className="rounded-lg p-1.5 hover:bg-[var(--bg-surface)]">
                      <SkipBack className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow"
                    >
                      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button type="button" onClick={playNext} className="rounded-lg p-1.5 hover:bg-[var(--bg-surface)]">
                      <SkipForward className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Volume2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-14 accent-[var(--accent)]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-3 text-center text-xs text-[var(--text-muted)]">
                Chưa có tệp nhạc nào. Chọn từ máy để phát offline không cần mạng.
              </p>
            )}

            {tracks.length > 0 && (
              <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
                {tracks.map((tr, i) => (
                  <div
                    key={tr.id}
                    className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs ${
                      i === trackIdx ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent)]" : "hover:bg-[var(--bg-elevated)]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setTrackIdx(i);
                        setPlaying(true);
                      }}
                      className="min-w-0 flex-1 truncate text-left"
                    >
                      {i + 1}. {tr.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTrack(i)}
                      className="text-[var(--text-muted)] hover:text-rose-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
