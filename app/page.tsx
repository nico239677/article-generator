"use client";

import { useState } from "react";
import type { Article } from "./api/article/route";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "de", name: "German" },
  { code: "pt", name: "Portuguese" },
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Chinese" },
  { code: "ko", name: "Korean" },
  { code: "it", name: "Italian" },
  { code: "nl", name: "Dutch" },
  { code: "ru", name: "Russian" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "sv", name: "Swedish" },
  { code: "pl", name: "Polish" },
  { code: "tr", name: "Turkish" },
  { code: "id", name: "Indonesian" },
  { code: "vi", name: "Vietnamese" },
  { code: "th", name: "Thai" },
  { code: "uk", name: "Ukrainian" },
];

const ERROR_MESSAGES: Record<string, string> = {
  no_results: "No articles found — try a broader topic, different language, or higher word limit.",
  source_unavailable: "News source unavailable. Try again in a moment.",
  quota_exceeded: "Daily request limit reached. Try again tomorrow.",
  server_misconfigured: "Server configuration error.",
  invalid_media: "Unknown media — try a different name (e.g. lemonde, bbc, cnn).",
};

export default function Home() {
  const [lang, setLang] = useState("fr");
  const [topic, setTopic] = useState("");
  const [media, setMedia] = useState("");
  const [maxWordsEnabled, setMaxWordsEnabled] = useState(false);
  const [maxWords, setMaxWords] = useState(300);
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setArticle(null);

    const params = new URLSearchParams({ lang });
    if (topic.trim()) params.set("topic", topic.trim());
    if (media.trim()) params.set("media", media.trim());
    if (maxWordsEnabled) params.set("maxWords", String(maxWords));

    try {
      const res = await fetch(`/api/article?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(ERROR_MESSAGES[data.error] ?? "Something went wrong.");
      } else {
        setArticle(data);
      }
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-16 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Random Article</h1>
        <p className="text-gray-400 mt-1 text-sm">
          A random article from the last 7 days. No algorithm.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name} ({l.code})
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Topic (optional)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <input
          type="text"
          placeholder="Media (optional, e.g. lemonde, bbc, cnn)"
          value={media}
          onChange={(e) => setMedia(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={maxWordsEnabled}
            onChange={(e) => setMaxWordsEnabled(e.target.checked)}
            className="rounded border-gray-700 bg-gray-800 focus:ring-blue-500"
          />
          Max word count
          <input
            type="number"
            min={10}
            step={10}
            value={maxWords}
            disabled={!maxWordsEnabled}
            onChange={(e) => setMaxWords(Math.max(10, parseInt(e.target.value, 10) || 10))}
            className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          words
        </label>

        <button
          onClick={generate}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Finding article…
            </>
          ) : (
            "Give me an article"
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {article && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              {article.source_name}
            </span>
            <span className="text-xs text-gray-600">
              {new Date(article.pubDate).toLocaleDateString()}
            </span>
          </div>

          <h2 className="text-lg font-semibold leading-snug">{article.title}</h2>

          <span className="text-xs text-gray-500">{article.wordCount} words</span>

          {article.description && (
            <p className="text-sm text-gray-400 leading-relaxed">{article.description}</p>
          )}

          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
          >
            Read article →
          </a>
        </div>
      )}
    </main>
  );
}
