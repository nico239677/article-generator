import { NextRequest, NextResponse } from "next/server";

export interface Article {
  title: string;
  link: string;
  source_name: string;
  pubDate: string;
  description: string | null;
  content: string | null;
  wordCount: number;
}

interface NewsDataResult {
  title: string;
  link: string;
  source_name: string;
  pubDate: string;
  description: string | null;
  content?: string | null;
}

const PAID_ONLY_PLACEHOLDER = "ONLY AVAILABLE IN PAID PLANS";

function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function fullContent(article: NewsDataResult): string | null {
  // free tier locks `content` behind a placeholder string — only return real content
  if (article.content && !article.content.includes(PAID_ONLY_PLACEHOLDER)) {
    return article.content;
  }
  return null;
}

function articleWordCount(article: NewsDataResult): number {
  const content = fullContent(article);
  return content ? countWords(content) : countWords(article.description);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang");
  const topic = searchParams.get("topic") || "";
  const media = searchParams.get("media") || "";
  const maxWordsParam = searchParams.get("maxWords");
  const maxWords = maxWordsParam ? parseInt(maxWordsParam, 10) : null;

  if (!lang) {
    return NextResponse.json({ error: "lang_required" }, { status: 400 });
  }
  if (maxWordsParam && (Number.isNaN(maxWords) || (maxWords as number) <= 0)) {
    return NextResponse.json({ error: "invalid_max_words" }, { status: 400 });
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
    ...(media ? { domain: media } : {}),
  });

  let data: {
    status: string;
    results?: NewsDataResult[];
    message?: string;
    results_error?: { code?: string; message?: string };
  };
  try {
    const res = await fetch(`https://newsdata.io/api/1/news?${params}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("NewsData error", res.status, text);
      if (media && text.includes("UnsupportedFilter") && text.includes("domain")) {
        return NextResponse.json({ error: "invalid_media" }, { status: 422 });
      }
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

  let results = data.results;
  if (maxWords) {
    results = results.filter((r) => articleWordCount(r) <= maxWords);
    if (!results.length) {
      return NextResponse.json({ error: "no_results" }, { status: 404 });
    }
  }

  // Shuffle server-side so caller always gets a single random article
  const idx = Math.floor(Math.random() * results.length);
  const article = results[idx];

  return NextResponse.json({
    title: article.title,
    link: article.link,
    source_name: article.source_name,
    pubDate: article.pubDate,
    description: article.description ?? null,
    content: fullContent(article),
    wordCount: articleWordCount(article),
  } satisfies Article);
}
