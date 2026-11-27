import { NextResponse } from "next/server";

interface SearchHit {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  url: string;
  kind: "video" | "playlist";
}

function readText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const obj = node as Record<string, unknown>;
  if (typeof obj.simpleText === "string") return obj.simpleText;
  if (Array.isArray(obj.runs)) {
    return obj.runs
      .map((r) => (r && typeof r === "object" && typeof (r as Record<string, unknown>).text === "string" ? (r as Record<string, unknown>).text : ""))
      .join("");
  }
  return "";
}

function collectHits(node: unknown, wantType: "video" | "playlist", out: SearchHit[], seen: Set<string>) {
  if (!node || typeof node !== "object" || out.length >= 10) return;
  if (Array.isArray(node)) {
    for (const item of node) {
      if (out.length >= 10) break;
      collectHits(item, wantType, out, seen);
    }
    return;
  }
  const obj = node as Record<string, unknown>;

  if (wantType === "video" && obj.videoRenderer && typeof obj.videoRenderer === "object") {
    const vr = obj.videoRenderer as Record<string, unknown>;
    const vid = typeof vr.videoId === "string" ? vr.videoId : "";
    if (vid && !seen.has(vid)) {
      seen.add(vid);
      const title = readText(vr.title) || "YouTube Video";
      const author = readText(vr.ownerText) || readText(vr.longBylineText) || "YouTube";
      out.push({
        id: vid,
        title,
        author,
        thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${vid}`,
        kind: "video",
      });
    }
    return;
  }

  if (wantType === "playlist" && obj.playlistRenderer && typeof obj.playlistRenderer === "object") {
    const pr = obj.playlistRenderer as Record<string, unknown>;
    const pid = typeof pr.playlistId === "string" ? pr.playlistId : "";
    if (pid && !seen.has(pid)) {
      seen.add(pid);
      const title = readText(pr.title) || "YouTube Playlist";
      const author = readText(pr.shortBylineText) || readText(pr.longBylineText) || "YouTube Playlist";
      let thumb = "";
      if (Array.isArray(pr.thumbnails) && pr.thumbnails.length > 0) {
        const first = pr.thumbnails[0] as Record<string, unknown> | undefined;
        if (first && Array.isArray(first.thumbnails) && first.thumbnails.length > 0) {
          const t0 = first.thumbnails[0] as Record<string, unknown> | undefined;
          if (t0 && typeof t0.url === "string") thumb = t0.url;
        }
      }
      out.push({
        id: pid,
        title,
        author,
        thumbnail: thumb,
        url: `https://www.youtube.com/playlist?list=${pid}`,
        kind: "playlist",
      });
    }
    return;
  }

  for (const val of Object.values(obj)) {
    if (out.length >= 10) break;
    if (val && typeof val === "object") {
      collectHits(val, wantType, out, seen);
    }
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const typeParam = searchParams.get("type") === "playlist" ? "playlist" : "video";

  if (!q) {
    return NextResponse.json({ data: [], fallbackUrl: "https://www.youtube.com" });
  }

  const sp = typeParam === "playlist" ? "&sp=EgIQAw%253D%253D" : "";
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}${sp}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
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
    const marker = "var ytInitialData = ";
    const startIdx = html.indexOf(marker);
    if (startIdx === -1) {
      return NextResponse.json({ data: [], fallbackUrl: searchUrl });
    }
    const jsonStart = startIdx + marker.length;
    const jsonEnd = html.indexOf(";</script>", jsonStart);
    if (jsonEnd === -1) {
      return NextResponse.json({ data: [], fallbackUrl: searchUrl });
    }

    const parsed = JSON.parse(html.slice(jsonStart, jsonEnd)) as unknown;
    const hits: SearchHit[] = [];
    collectHits(parsed, typeParam, hits, new Set<string>());
    return NextResponse.json({ data: hits, fallbackUrl: searchUrl });
  } catch {
    return NextResponse.json({ data: [], fallbackUrl: searchUrl });
  }
}
