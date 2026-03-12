import ky from "ky";

interface SearchResult {
  ns: number;
  pageid: number;
  size: number;
  snippet: string;
  timestamp: string;
  title: string;
  wordcount: number;
}

interface GetPageResponse {
  query: {
    pages: {
      [key: string]: {
        pageid: number;
        ns: number;
        title: string;
        extract: string;
      };
    };
  };
}

interface RerankerResult {
  corpus_id: number;
  score: number;
  text: string;
}

function rerank(query: string, corpus: string[]): Promise<RerankerResult[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/reranker-worker.js", import.meta.url),
      { type: "module" }
    );
    worker.onmessage = (e) => {
      if (e.data.status === "complete") {
        resolve(e.data.output);
        worker.terminate();
      }
    };
    worker.onerror = (e) => {
      reject(e);
      worker.terminate();
    };
    worker.postMessage({ query, corpus });
  });
}

export async function searchWikipedia(query: string): Promise<string[]> {
  const wikiData: any = await ky
    .get(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&origin=*&srsearch=${encodeURIComponent(query)}&format=json`
    )
    .json();

  const results: SearchResult[] = wikiData.query?.search;
  if (!results?.length) return [];

  const corpus = results.map((r) =>
    r.snippet.replace(/<[^>]*>/g, "")
  );
  const ranked = await rerank(query, corpus);

  const summaries = await Promise.all(
    ranked.filter(rank => rank.score >= 0.80).map(async (r) => {
      const page: GetPageResponse = await ky
        .get(
          `https://en.wikipedia.org/w/api.php?action=query&format=json&pageids=${results[r.corpus_id].pageid}&prop=extracts&exlimit=max&explaintext&exintro&origin=*`
        )
        .json();
      return page.query.pages[results[r.corpus_id].pageid].extract;
    })
  );

  return summaries;
}
