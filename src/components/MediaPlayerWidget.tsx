"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  ExternalLink,
  FolderOpen,
  Link2,
  ListMusic,
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
  platform: "youtube" | "tiktok" | "facebook" | "instagram" | "audio" | "other";
}

interface OnlineSearchHit {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  url: string;
  kind: "video" | "playlist";
}

interface ParsedEmbed {
  platform: SavedMediaLink["platform"];
  embedUrl: string | null;
  directAudioUrl: string | null;
  label: string;
}

const DEFAULT_LINKS: SavedMediaLink[] = [
  {
    id: "preset-lofi",
    title: "Lofi Girl — Beats to Relax/Study",
    url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    platform: "youtube",
  },
  {
    id: "preset-piano",
    title: "Nhạc Piano nhẹ tập trung ôn thi",
    url: "https://www.youtube.com/watch?v=4oStw0r33so",
    platform: "youtube",
  },
  {
    id: "preset-rain",
    title: "Tiếng mưa đêm & Piano thư giãn",
    url: "https://www.youtube.com/watch?v=mPZkdNFkNps",
    platform: "youtube",
  },
  {
    id: "preset-synth",
    title: "Synthwave Radio — Chill Code Beats",
    url: "https://www.youtube.com/watch?v=4xDzrJKXOOY",
    platform: "youtube",
  },
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
  const [sourceTab, setSourceTab] = useState<"search" | "link" | "local">("search");
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

  // Online links + Loop 1
  const [savedLinks, setSavedLinks] = useState<SavedMediaLink[]>(DEFAULT_LINKS);
  const [linkFilter, setLinkFilter] = useState<"all" | "youtube" | "tiktok" | "facebook" | "instagram">("all");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [activeLink, setActiveLink] = useState<SavedMediaLink | null>(null);
  const [loopLink, setLoopLink] = useState(true); // Default ON so pasted link loops cleanly instead of jumping!
  const [sleepSecsLeft, setSleepSecsLeft] = useState(0);

  // Multi-platform Online Search
  const [searchPlatform, setSearchPlatform] = useState<
    "yt-video" | "yt-playlist" | "tiktok" | "facebook" | "instagram"
  >("yt-video");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchHits, setSearchHits] = useState<OnlineSearchHit[]>([]);
  const [fallbackSearchUrl, setFallbackSearchUrl] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef<LocalTrack[]>([]);
  tracksRef.current = tracks;

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kronoflow-media-links");
      if (raw) {
        const parsed = JSON.parse(raw) as SavedMediaLink[];
        if (Array.isArray(parsed) && parsed.length > 0) setSavedLinks(parsed);
      }
    } catch {
      // ignore
    }
    return () => {
      for (const t of tracksRef.current) {
        URL.revokeObjectURL(t.url);
      }
    };
  }, []);

  useEffect(() => {
    if (sleepSecsLeft <= 0) return;
    const id = setInterval(() => {
      setSleepSecsLeft((prev) => {
        if (prev <= 1) {
          if (audioRef.current) audioRef.current.pause();
          setPlaying(false);
          setActiveLink(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [sleepSecsLeft]);

  const persistLinks = (next: SavedMediaLink[]) => {
    setSavedLinks(next);
    try {
      localStorage.setItem("kronoflow-media-links", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const currentTrack = tracks[trackIdx] ?? null;

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
  }, [currentTrack, playing]);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added: LocalTrack[] = Array.from(files).map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: f.name.replace(/\.[^/.]+$/, ""),
      url: URL.createObjectURL(f),
      sizeKb: Math.max(1, Math.round(f.size / 1024)),
    }));
    setTracks((prev) => {
      const next = [...prev, ...added];
      if (prev.length === 0) {
        setTrackIdx(0);
        setPlaying(true);
      }
      return next;
    });
    setSourceTab("local");
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

  const nextTrack = () => {
    if (tracks.length === 0) return;
    if (shuffle && tracks.length > 1) {
      setTrackIdx(Math.floor(Math.random() * tracks.length));
    } else {
      setTrackIdx((i) => (i + 1) % tracks.length);
    }
    setPlaying(true);
  };

  const prevTrack = () => {
    if (tracks.length === 0) return;
    setTrackIdx((i) => (i - 1 + tracks.length) % tracks.length);
    setPlaying(true);
  };

  const removeTrack = (id: string) => {
    setTracks((prev) => {
      const target = prev.find((t) => t.id === id);
      if (target) URL.revokeObjectURL(target.url);
      const next = prev.filter((t) => t.id !== id);
      if (trackIdx >= next.length) setTrackIdx(Math.max(0, next.length - 1));
      if (next.length === 0) setPlaying(false);
      return next;
    });
  };

  const playAndSaveLink = (title: string, url: string) => {
    const parsed = parseMediaLink(url, loopLink);
    const existing = savedLinks.find((x) => x.url === url);
    if (existing) {
      setActiveLink(existing);
      return;
    }
    const item: SavedMediaLink = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim() || `${parsed.label} — ${url.slice(0, 32)}`,
      url: url.trim(),
      platform: parsed.platform,
    };
    persistLinks([item, ...savedLinks]);
    setActiveLink(item);
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    playAndSaveLink(linkTitle, linkUrl.trim());
    setLinkTitle("");
    setLinkUrl("");
  };

  const handleOnlineSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    if (searchPlatform === "tiktok") {
      window.open(`https://www.tiktok.com/search?q=${encodeURIComponent(q)}`, "kf_search_popout", "width=520,height=680");
      return;
    }
    if (searchPlatform === "facebook") {
      window.open(`https://www.facebook.com/search/videos/?q=${encodeURIComponent(q)}`, "kf_search_popout", "width=520,height=680");
      return;
    }
    if (searchPlatform === "instagram") {
      const tag = q.replace(/\s+/g, "");
      window.open(`https://www.instagram.com/explore/tags/${encodeURIComponent(tag)}/`, "kf_search_popout", "width=520,height=680");
      return;
    }

    setSearching(true);
    setSearchHits([]);
    try {
      const kind = searchPlatform === "yt-playlist" ? "playlist" : "video";
      const res = await fetch(`/api/media-search?q=${encodeURIComponent(q)}&type=${kind}`);
      if (res.ok) {
        const json = (await res.json()) as { data?: OnlineSearchHit[]; fallbackUrl?: string };
        setSearchHits(Array.isArray(json.data) ? json.data : []);
        setFallbackSearchUrl(json.fallbackUrl ?? "");
      }
    } catch {
      setFallbackSearchUrl(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`);
    } finally {
      setSearching(false);
    }
  };

  const stepSavedLink = (delta: number) => {
    if (savedLinks.length === 0) return;
    const curIdx = activeLink ? savedLinks.findIndex((x) => x.id === activeLink.id) : -1;
    const nextIdx = curIdx === -1 ? 0 : (curIdx + delta + savedLinks.length) % savedLinks.length;
    const target = savedLinks[nextIdx];
    if (target) setActiveLink(target);
  };

  const activeEmbed = activeLink ? parseMediaLink(activeLink.url, loopLink) : null;
  const hasActiveMedia = Boolean(currentTrack || activeLink);
  const filteredSaved = savedLinks.filter((l) => linkFilter === "all" || l.platform === linkFilter);
  const sidePos = dockRight ? "right-4" : "left-4";

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
            nextTrack();
          }
        }}
        className="hidden"
      />

      {!open && hasActiveMedia && (
        <div
          className={`no-print fixed bottom-4 ${sidePos} z-40 flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 px-3 py-1.5 text-xs shadow-lg backdrop-blur`}
        >
          <Music2 className="h-3.5 w-3.5 animate-pulse text-[var(--accent)]" />
          <span className="max-w-[160px] truncate font-medium text-[var(--text-primary)]">
            {sourceTab === "local" && currentTrack
              ? currentTrack.name
              : activeLink?.title ?? "Nhạc tập trung"}
          </span>
          {sourceTab === "local" && currentTrack && (
            <button
              type="button"
              onClick={togglePlay}
              className="rounded-full bg-[var(--accent-soft)] p-1 text-[var(--accent)]"
              title={playing ? "Tạm dừng" : "Phát"}
            >
              {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
          )}
          <button
            type="button"
            onClick={onToggleOpen}
            className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Mở trình phát
          </button>
        </div>
      )}

      {/* Keep mounted so YouTube iframe continues playing seamlessly when minimized */}
      <div
        className={
          open
            ? `no-print fixed bottom-4 ${sidePos} z-50 max-h-[86vh] w-[min(95vw,440px)] overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 p-4 shadow-2xl backdrop-blur-md transition-all duration-300`
            : "pointer-events-none fixed -left-[9999px] top-0 h-1 w-1 overflow-hidden opacity-0"
        }
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
          <div className="flex items-center gap-2">
            <Music2 className="h-4 w-4 text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Trình phát Nhạc Đa nền tảng
            </span>
          </div>
          <div className="flex items-center gap-1">
            <select
              value={sleepSecsLeft > 0 ? Math.ceil(sleepSecsLeft / 60) : 0}
              onChange={(e) => setSleepSecsLeft(Number(e.target.value) * 60)}
              title="Hẹn giờ tự tắt nhạc"
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]"
            >
              <option value={0}>Hẹn tắt</option>
              <option value={15}>15p</option>
              <option value={25}>25p</option>
              <option value={45}>45p</option>
              <option value={60}>60p</option>
            </select>
            {sleepSecsLeft > 0 && (
              <span className="font-mono text-[10px] font-semibold text-amber-600">
                {fmtSec(sleepSecsLeft)}
              </span>
            )}
            <button
              type="button"
              onClick={() => setDockRight((v) => !v)}
              title="Đổi góc hiển thị (Trái / Phải)"
              className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onToggleOpen}
              title="Thu gọn (nhạc vẫn phát nền)"
              className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveLink(null);
                if (audioRef.current) audioRef.current.pause();
                setPlaying(false);
                onToggleOpen();
              }}
              title="Tắt hẳn nhạc & đóng"
              className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-rose-500/10 hover:text-rose-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ACTIVE EMBED PLAYER (ALWAYS VISIBLE ABOVE TABS WHEN PLAYING A LINK) */}
        {activeLink && activeEmbed && sourceTab !== "local" && (
          <div className="mt-3 space-y-2 rounded-xl border border-[var(--accent)]/35 bg-[var(--bg-canvas)] p-2.5">
            <div className="flex items-center justify-between gap-1.5 text-[11px]">
              <span className="truncate font-semibold text-[var(--text-primary)]">
                [{activeEmbed.label}] {activeLink.title}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => stepSavedLink(-1)}
                  title="Bài trước"
                  className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                >
                  <SkipBack className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => stepSavedLink(1)}
                  title="Bài tiếp theo"
                  className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                >
                  <SkipForward className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setLoopLink((v) => !v)}
                  title={loopLink ? "Đang bật Lặp lại 1 bài (nhấn để tắt)" : "Bật Lặp lại 1 bài (tránh tự chuyển video khác)"}
                  className={`inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition ${
                    loopLink
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                  }`}
                >
                  <Repeat className="h-3 w-3" /> {loopLink ? "Lặp 1" : "Lặp"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    window.open(activeLink.url, "kronoflow_media_popout", "width=460,height=640")
                  }
                  title="Mở cửa sổ nổi"
                  className="rounded-md border border-[var(--border-subtle)] p-1 text-[var(--accent)]"
                >
                  <ExternalLink className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLink(null)}
                  className="rounded-md p-1 text-[var(--text-muted)] hover:text-rose-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

            {activeEmbed.directAudioUrl ? (
              <audio
                controls
                autoPlay
                loop={loopLink}
                src={activeEmbed.directAudioUrl}
                className="w-full"
              />
            ) : activeEmbed.embedUrl ? (
              <div className="overflow-hidden rounded-lg bg-black/90">
                <iframe
                  key={`${activeLink.id}-${loopLink ? "loop" : "once"}`}
                  src={activeEmbed.embedUrl}
                  title={activeLink.title}
                  className="h-44 w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <p className="text-[11px] text-[var(--text-muted)]">
                Nhấn biểu tượng <strong>Pop-out</strong> góc trên để phát trong cửa sổ nổi gọn.
              </p>
            )}
          </div>
        )}

        {/* SOURCE MODE TABS */}
        <div className="mt-3 flex gap-1 rounded-xl bg-[var(--bg-elevated)] p-1 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setSourceTab("search")}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 ${
              sourceTab === "search" ? "bg-[var(--bg-surface)] text-[var(--accent)] shadow-sm" : "text-[var(--text-muted)]"
            }`}
          >
            <Search className="h-3.5 w-3.5" /> Tìm Online
          </button>
          <button
            type="button"
            onClick={() => setSourceTab("link")}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 ${
              sourceTab === "link" ? "bg-[var(--bg-surface)] text-[var(--accent)] shadow-sm" : "text-[var(--text-muted)]"
            }`}
          >
            <Link2 className="h-3.5 w-3.5" /> Link ({savedLinks.length})
          </button>
          <button
            type="button"
            onClick={() => setSourceTab("local")}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 ${
              sourceTab === "local" ? "bg-[var(--bg-surface)] text-[var(--accent)] shadow-sm" : "text-[var(--text-muted)]"
            }`}
          >
            <FolderOpen className="h-3.5 w-3.5" /> Máy tính ({tracks.length})
          </button>
        </div>

        {/* TAB 1: MULTI-PLATFORM ONLINE SEARCH */}
        <div className={sourceTab === "search" ? "mt-3 space-y-2.5" : "hidden"}>
          <div className="flex flex-wrap gap-1 text-[10px] font-medium">
            {(
              [
                ["yt-video", "YouTube Video"],
                ["yt-playlist", "YT Playlist"],
                ["tiktok", "TikTok"],
                ["facebook", "Facebook"],
                ["instagram", "Instagram"],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setSearchPlatform(k);
                  setSearchHits([]);
                }}
                className={`rounded-lg border px-2 py-1 ${
                  searchPlatform === k
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          <form onSubmit={handleOnlineSearch} className="flex gap-1.5">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                searchPlatform.startsWith("yt")
                  ? "Tìm nhạc / video / playlist YouTube (VD: lofi piano)..."
                  : `Nhập từ khóa tìm trên ${searchPlatform}...`
              }
              className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={searching}
              className="btn-primary inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              <Search className="h-3.5 w-3.5" /> {searching ? "..." : "Tìm"}
            </button>
          </form>

          {searchPlatform.startsWith("yt") ? (
            <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
              {searchHits.map((hit) => (
                <div
                  key={hit.id}
                  className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2 text-xs"
                >
                  {hit.thumbnail && (
                    <img
                      src={hit.thumbnail}
                      alt=""
                      className="h-10 w-16 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-[var(--text-primary)]">{hit.title}</div>
                    <div className="truncate text-[10px] text-[var(--text-muted)]">
                      {hit.author} · {hit.kind === "playlist" ? "Playlist" : "Video"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => playAndSaveLink(hit.title, hit.url)}
                    className="btn-primary shrink-0 rounded-lg px-2 py-1 text-[10px] font-medium"
                  >
                    Phát
                  </button>
                </div>
              ))}
              {!searching && searchHits.length === 0 && fallbackSearchUrl && (
                <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-3 text-center text-[11px] text-[var(--text-muted)]">
                  Không tải được kết quả trực tiếp lúc này.{" "}
                  <a
                    href={fallbackSearchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-[var(--accent)] underline"
                  >
                    Mở tìm kiếm YouTube ngay →
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2.5 text-[11px] text-[var(--text-muted)]">
              Nhấn <strong>Tìm</strong> để mở cửa sổ tìm kiếm {searchPlatform} gọn, sau đó chép link video/nhạc dán sang tab <strong>Link</strong> để phát &amp; bật nút <strong>Lặp 1</strong> nhé.
            </p>
          )}
        </div>

        {/* TAB 2: PASTE LINK & SAVED PLAYLIST */}
        <div className={sourceTab === "link" ? "mt-3 space-y-2.5" : "hidden"}>
          <form onSubmit={handleAddLink} className="space-y-1.5">
            <input
              type="url"
              required
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Dán link YouTube, TikTok, Facebook, Instagram, .mp3..."
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <div className="flex gap-1.5">
              <input
                type="text"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="Tên gợi nhớ (tùy chọn)..."
                className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                className="btn-primary inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium"
              >
                <Plus className="h-3.5 w-3.5" /> Phát &amp; Lưu
              </button>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
            <span className="inline-flex items-center gap-1 font-medium uppercase text-[var(--text-muted)]">
              <ListMusic className="h-3 w-3" /> Đã lưu ({filteredSaved.length})
            </span>
            <div className="flex gap-1">
              {(["all", "youtube", "tiktok", "facebook", "instagram"] as const).map((pf) => (
                <button
                  key={pf}
                  type="button"
                  onClick={() => setLinkFilter(pf)}
                  className={`rounded px-1.5 py-0.5 uppercase ${
                    linkFilter === pf
                      ? "bg-[var(--accent)] font-semibold text-white"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {pf === "all" ? "Tất cả" : pf === "youtube" ? "YT" : pf === "tiktok" ? "TT" : pf === "facebook" ? "FB" : "IG"}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
            {filteredSaved.map((lk) => (
              <div
                key={lk.id}
                className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-xs ${
                  activeLink?.id === lk.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-canvas)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveLink(lk)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  <Play className="h-3 w-3 shrink-0 text-[var(--accent)]" />
                  <span className="truncate font-medium text-[var(--text-primary)]">{lk.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    persistLinks(savedLinks.filter((x) => x.id !== lk.id));
                    if (activeLink?.id === lk.id) setActiveLink(null);
                  }}
                  className="text-[var(--text-muted)] hover:text-rose-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* TAB 3: LOCAL AUDIO FILES */}
        <div className={sourceTab === "local" ? "mt-3 space-y-3" : "hidden"}>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-3 text-center text-xs text-[var(--text-secondary)] hover:border-[var(--accent)]">
            <FolderOpen className="mb-1 h-4 w-4 text-[var(--accent)]" />
            <span className="font-medium">Chọn nhiều tệp nhạc từ máy tính</span>
            <span className="text-[10px] text-[var(--text-muted)]">
              Hỗ trợ .mp3, .wav, .m4a, .ogg, .flac, .webm
            </span>
            <input
              type="file"
              accept="audio/*,video/webm,video/mp4"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFilesSelected(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {currentTrack && (
            <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
              <div className="truncate text-xs font-semibold text-[var(--text-primary)]">
                {currentTrack.name}
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--text-muted)]">
                <span>{fmtSec(curTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, duration)}
                  value={curTime}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setCurTime(v);
                    if (audioRef.current) audioRef.current.currentTime = v;
                  }}
                  className="h-1 flex-1 accent-[var(--accent)]"
                />
                <span>{fmtSec(duration)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShuffle((s) => !s)}
                    title="Xáo trộn"
                    className={`rounded-lg p-1.5 ${
                      shuffle ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-muted)]"
                    }`}
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={prevTrack}
                    className="rounded-lg p-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                  >
                    <SkipBack className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={togglePlay} className="btn-primary rounded-full p-2">
                    {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={nextTrack}
                    className="rounded-lg p-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoopMode((m) => (m === "all" ? "one" : "all"))}
                    title={loopMode === "one" ? "Đang bật Lặp 1 bài" : "Đang lặp cả danh sách"}
                    className={`inline-flex items-center gap-0.5 rounded-lg px-1.5 py-1 text-[10px] font-bold ${
                      loopMode === "one"
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    <Repeat className="h-3.5 w-3.5" /> {loopMode === "one" ? "1" : "∞"}
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
                    className="h-1 w-16 accent-[var(--accent)]"
                  />
                </div>
              </div>
            </div>
          )}

          {tracks.length > 0 && (
            <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
              {tracks.map((tr, idx) => (
                <div
                  key={tr.id}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-xs ${
                    idx === trackIdx
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-canvas)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setTrackIdx(idx);
                      setPlaying(true);
                    }}
                    className="min-w-0 flex-1 truncate text-left font-medium text-[var(--text-primary)]"
                  >
                    {idx + 1}. {tr.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTrack(tr.id)}
                    className="text-[var(--text-muted)] hover:text-rose-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
