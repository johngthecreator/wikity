import { useEffect, useRef, useState } from "react";

type WorkerStatus = 'idle' | 'loading' | 'generating' | 'complete' | 'error' | 'ready'

interface RerankerResult {
  corpus_id: number,
  score: number,
  text: string,
}

export function useReranker() {
  const workerRef = useRef<Worker | null>(null);
  const [output, setOutput] = useState<RerankerResult[] | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<WorkerStatus>('idle');

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/reranker-worker.js", import.meta.url),
      { type: 'module' }
    )

    workerRef.current.onmessage = (event) => {
      const data = event.data;
      console.log("data", data)

      if (data.status === 'complete') {
        setOutput(data.output)
        setStatus('complete');
      } else {
        setProgress(data.progress);
        setStatus('loading');
      }
    }
    workerRef.current.onerror = () => {
      setStatus('error')
    }

    return () => {
      workerRef.current?.terminate();
    }
  }, [])

  const run = (query: string, corpus: string[]) => {
    setStatus('generating');
    workerRef.current?.postMessage({ query, corpus })
  }

  return { run, output, status, progress };
}
