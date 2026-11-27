import { NextResponse } from "next/server";

interface SearchHit {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  url: string;
  kind: "video" | "playlist";
  duration: string;
  views: string;
}

function readText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const obj = node as Record<string, unknown>;
  if (typeof obj.simpleText === "string") return obj.simpleText;
  if (typeof obj.content === "string") return obj.content;
  if (Array.isArray(obj.runs)) {
    return obj.runs
      .map((r) =>
        r && typeof r === "object" && typeof (r as Record<string, unknown>).text === "string"
          ? (r as Record<string, unknown>).text
          : ""
      )
      .join("");
  }
  return "";
}

function extractThumbFromSources(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const obj = node as Record<string, unknown>;
  const sources = obj.sources ?? obj.thumbnails;
  if (Array.isArray(sources) && sources.length > 0) {
    const pick = (sources[sources.length - 1] ?? sources[0]) as Record<string, unknown> | undefined;
    if (pick && typeof pick.url === "string") return pick.url;
  }
  return "";
}

function parseVideoObject(vr: Record<string, unknown>, out: SearchHit[], seen: Set<string>) {
  const vid = typeof vr.videoId === "string" ? vr.videoId : "";
  if (!vid || seen.has(vid)) return;
  seen.add(vid);
  const title = readText(vr.title) || "YouTube Video";
  const author =
    readText(vr.ownerText) || readText(vr.longBylineText) || readText(vr.shortBylineText) || "YouTube";
  let duration = readText(vr.lengthText);
  if (!duration && Array.isArray(vr.thumbnailOverlays)) {
    for (const ov of vr.thumbnailOverlays) {
      if (ov && typeof ov === "object") {
        const ts = (ov as Record<string, unknown>).thumbnailOverlayTimeStatusRenderer as
          | Record<string, unknown>
          | undefined;
        if (ts) {
          const txt = readText(ts.text);
          if (txt) {
            duration = txt;
            break;
          }
        }
      }
    }
  }
  const views = readText(vr.shortViewCountText) || readText(vr.viewCountText) || "";
  out.push({
    id: vid,
    title,
    author,
    thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${vid}`,
    kind: "video",
    duration: duration.trim(),
    views: views.trim(),
  });
}

function parsePlaylistObject(pr: Record<string, unknown>, out: SearchHit[], seen: Set<string>) {
  const pid = typeof pr.playlistId === "string" ? pr.playlistId : "";
  if (!pid || seen.has(pid)) return;
  seen.add(pid);
  const title = readText(pr.title) || "YouTube Playlist";
  const author = readText(pr.shortBylineText) || readText(pr.longBylineText) || "YouTube Playlist";
  let thumb = "";
  if (Array.isArray(pr.thumbnails) && pr.thumbnails.length > 0) {
    const first = pr.thumbnails[0] as Record<string, unknown> | undefined;
    if (first) thumb = extractThumbFromSources(first);
  }
  const countStr = typeof pr.videoCount === "string" ? `${pr.videoCount} video` : readText(pr.videoCountText);
  out.push({
    id: pid,
    title,
    author,
    thumbnail: thumb,
    url: `https://www.youtube.com/playlist?list=${pid}`,
    kind: "playlist",
    duration: countStr || "Playlist",
    views: "",
  });
}

function parseLockupObject(
  lv: Record<string, unknown>,
  wantType: "video" | "playlist",
  out: SearchHit[],
  seen: Set<string>
) {
  const cid = typeof lv.contentId === "string" ? lv.contentId : "";
  const contentType = typeof lv.contentType === "string" ? lv.contentType : "";
  const isPlaylist =
    contentType.includes("PLAYLIST") ||
    cid.startsWith("PL") ||
    cid.startsWith("RD") ||
    cid.startsWith("OLAK");

  if (wantType === "playlist" && !isPlaylist) return;
  if (wantType === "video" && isPlaylist) return;
  if (!cid || seen.has(cid)) return;
  seen.add(cid);

  const meta = lv.metadata as Record<string, unknown> | undefined;
  const lmv = meta?.lockupMetadataViewModel as Record<string, unknown> | undefined;
  const title = readText(lmv?.title) || (isPlaylist ? "YouTube Playlist" : "YouTube Video");

  let author = "YouTube";
  const cMeta = lmv?.metadata as Record<string, unknown> | undefined;
  const cmvm = cMeta?.contentMetadataViewModel as Record<string, unknown> | undefined;
  if (cmvm && Array.isArray(cmvm.metadataRows) && cmvm.metadataRows.length > 0) {
    const row0 = cmvm.metadataRows[0] as Record<string, unknown> | undefined;
    if (row0 && Array.isArray(row0.metadataParts) && row0.metadataParts.length > 0) {
      const p0 = row0.metadataParts[0] as Record<string, unknown> | undefined;
      const aTxt = readText(p0?.text);
      if (aTxt) author = aTxt;
    }
  }

  let thumb = "";
  const cImg = lv.contentImage as Record<string, unknown> | undefined;
  const colThumb = cImg?.collectionThumbnailViewModel as Record<string, unknown> | undefined;
  const primThumb = (colThumb?.primaryThumbnail ?? cImg) as Record<string, unknown> | undefined;
  const tvm = primThumb?.thumbnailViewModel as Record<string, unknown> | undefined;
  if (tvm?.image) thumb = extractThumbFromSources(tvm.image);
  if (!thumb && !isPlaylist && cid.length === 11) {
    thumb = `https://i.ytimg.com/vi/${cid}/hqdefault.jpg`;
  }

  out.push({
    id: cid,
    title,
    author,
    thumbnail: thumb,
    url: isPlaylist
      ? `https://www.youtube.com/playlist?list=${cid}`
      : `https://www.youtube.com/watch?v=${cid}`,
    kind: isPlaylist ? "playlist" : "video",
    duration: isPlaylist ? "Playlist" : "",
    views: "",
  });
}

function collectHits(
  node: unknown,
  wantType: "video" | "playlist",
  maxHits: number,
  out: SearchHit[],
  seen: Set<string>
) {
  if (!node || typeof node !== "object" || out.length >= maxHits) return;
  if (Array.isArray(node)) {
    for (const item of node) {
      if (out.length >= maxHits) break;
      collectHits(item, wantType, maxHits, out, seen);
    }
    return;
  }
  const obj = node as Record<string, unknown>;

  if (wantType === "video") {
    const vNode = (obj.videoRenderer ?? obj.compactVideoRenderer ?? obj.gridVideoRenderer) as
      | Record<string, unknown>
      | undefined;
    if (vNode && typeof vNode === "object") {
      parseVideoObject(vNode, out, seen);
      return;
    }
  }

  if (wantType === "playlist" && obj.playlistRenderer && typeof obj.playlistRenderer === "object") {
    parsePlaylistObject(obj.playlistRenderer as Record<string, unknown>, out, seen);
    return;
  }

  if (obj.lockupViewModel && typeof obj.lockupViewModel === "object") {
    parseLockupObject(obj.lockupViewModel as Record<string, unknown>, wantType, out, seen);
    return;
  }

  for (const val of Object.values(obj)) {
    if (out.length >= maxHits) break;
    if (val && typeof val === "object") {
      collectHits(val, wantType, maxHits, out, seen);
    }
  }
}

function extractYtInitialData(html: string): unknown | null {
  const markers = ["var ytInitialData = ", 'window["ytInitialData"] = '];
  for (const marker of markers) {
    const startIdx = html.indexOf(marker);
    if (startIdx === -1) continue;
    const jsonStart = startIdx + marker.length;
    const jsonEnd = html.indexOf(";</script>", jsonStart);
    if (jsonEnd === -1) continue;
    try {
      return JSON.parse(html.slice(jsonStart, jsonEnd)) as unknown;
    } catch {
      continue;
    }
  }
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const typeParam = searchParams.get("type") === "playlist" ? "playlist" : "video";
  const filterParam = (searchParams.get("filter") ?? "all").trim();
  const limitRaw = Number(searchParams.get("limit") ?? "30");
  const maxHits = Number.isFinite(limitRaw) ? Math.min(35, Math.max(10, Math.round(limitRaw))) : 30;

  if (!q) {
    return NextResponse.json({ data: [], fallbackUrl: "https://www.youtube.com" });
  }

  let sp = "";
  if (typeParam === "playlist") {
    sp = "&sp=EgIQAw%253D%253D";
  } else if (filterParam === "short") {
    sp = "&sp=EgIYAQ%253D%253D";
  } else if (filterParam === "long") {
    sp = "&sp=EgIYAg%253D%253D";
  } else if (filterParam === "live") {
    sp = "&sp=EgJAAQ%253D%253D";
  } else if (filterParam === "recent") {
    sp = "&sp=CAI%253D";
  }

  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}${sp}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8",
      },
      cache: "no-store",
    });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json({ data: [], fallbackUrl: searchUrl });
    }

    const html = await res.text();
    const parsed = extractYtInitialData(html);
    if (!parsed) {
      return NextResponse.json({ data: [], fallbackUrl: searchUrl });
    }

    const hits: SearchHit[] = [];
    collectHits(parsed, typeParam, maxHits, hits, new Set<string>());
    return NextResponse.json({ data: hits, fallbackUrl: searchUrl });
  } catch {
    return NextResponse.json({ data: [], fallbackUrl: searchUrl });
  }
}
