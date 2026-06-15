import { NextRequest, NextResponse } from "next/server";

export interface Article {
  title: string;
  link: string;
  source_name: string;
  pubDate: string;
  description: string | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang");
  const topic = searchParams.get("topic") || "";

  if (!lang) {
    return NextResponse.json({ error: "lang_required" }, { status: 400 });
  }

  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  // timeframe is a paid-only param on NewsData.io free tier — omit it
  const params = new URLSearchParams({
    apikey: apiKey,
    language: lang,
    ...(topic ? { q: topic } : {}),
  });

  let data: { status: string; results?: Article[]; message?: string };
  try {
    const res = await fetch(`https://newsdata.io/api/1/news?${params}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("NewsData error", res.status, text);
      return NextResponse.json({ error: "source_unavailable" }, { status: 503 });
    }
    data = await res.json();
  } catch (e) {
    console.error("Fetch failed", e);
    return NextResponse.json({ error: "source_unavailable" }, { status: 503 });
  }

  if (data.status !== "success" || !data.results?.length) {
    return NextResponse.json({ error: "no_results" }, { status: 404 });
  }

  // Shuffle server-side so caller always gets a single random article
  const results = data.results;
  const idx = Math.floor(Math.random() * results.length);
  const article = results[idx];

  return NextResponse.json({
    title: article.title,
    link: article.link,
    source_name: article.source_name,
    pubDate: article.pubDate,
    description: article.description ?? null,
  } satisfies Article);
}
