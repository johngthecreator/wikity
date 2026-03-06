import ky from "ky";
import { useReranker } from "./useReranker";
import { useEffect, useState } from "react";

interface SearchResult {
  ns: number
  pageid: number
  size: number
  snippet: string
  timestamp: string
  title: string
  wordcount: number
}

interface GetPageResponse {
  query: {
    pages: {
      [key: string]: PageDetails;
    };
  }
}

interface PageDetails {
  pageid: number;
  ns: number;
  title: string;
  extract: string;
}

export function useWikipediaTool() {

  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [summaries, setSummaries] = useState<string[] | null>(null);
  const [optimizedSearchQuery, setOptimizedSearchQuery] = useState<string | null>(null);

  const { run, output } = useReranker();
  useEffect(() => {
    (async () => {
      if (optimizedSearchQuery) {
        const wikiData: any = await ky.get(`https://en.wikipedia.org/w/api.php?action=query&list=search&origin=*&srsearch=${encodeURIComponent(optimizedSearchQuery)}&format=json`).json()
        const rerankerCorpus = searchResultRerankerConstruction(wikiData.query?.search);
        const searchResults = wikiData.query?.search
        setSearchResults(searchResults)
        run(optimizedSearchQuery, rerankerCorpus)
      }
    })();
  }, [optimizedSearchQuery])

  useEffect(() => {
    (async () => {
      if (searchResults && output) {
        const searchResultsSummaries = await Promise.all(output.map(async (rerankerOutput) => {
          const pageData = await wikiGetPageTool(searchResults[rerankerOutput.corpus_id].pageid)
          return pageData.query.pages[searchResults[rerankerOutput.corpus_id].pageid].extract
        }))
        setSummaries(searchResultsSummaries);
      }
    })();
  }, [output])

  function getWikipediaResults(searchQuery: string) {
    setOptimizedSearchQuery(searchQuery)
  }

  return { summaries, getWikipediaResults }
}

function searchResultRerankerConstruction(searchResults: SearchResult[]) {
  return searchResults.map(searchResult => searchResult.snippet.replace(/<[^>]*>/g, ''))
}

async function wikiGetPageTool(pageId: number): Promise<GetPageResponse> {
  // add   &exintro if you want just the summary and remove it if you want the full page
  // might add a local rag later?
  const wikiPage: any = await ky.get(`https://en.wikipedia.org/w/api.php?action=query&format=json&pageids=${pageId}&prop=extracts&exlimit=max&explaintext&exintro&origin=*`).json()
  return wikiPage;
}
