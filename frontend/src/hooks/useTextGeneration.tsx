import { useEffect, useRef, useState } from "react";
import * as z from "zod";


type WorkerStatus = 'idle' | 'loading' | 'generating' | 'complete' | 'error' | 'ready'

export const TextGenerationResponseSchema = z.object({
  original: z.string(),
  optimized: z.string()
})

export const SynthesisGenerationResponseSchema = z.object({
  think: z.string(),
  response: z.string()
})

export function useTextGeneration() {
  const workerRef = useRef<Worker | null>(null);
  const [queryOutput, setQueryOutput] = useState<string | null>(null);
  const [synthesisOutput, setSynthesisOutput] = useState<z.Infer<typeof SynthesisGenerationResponseSchema> | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<WorkerStatus>('idle');

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/text-generation-worker.js", import.meta.url),
      { type: 'module' }
    )

    workerRef.current.onmessage = (event) => {
      const data = event.data;

      if (data.status === 'complete') {
        if (data.output.mode === 'OPTIMIZER') {
          setQueryOutput(data.output.result)
        } else {
          setSynthesisOutput(data.output)
        }
        setStatus('complete');
      } else if (data.status === 'error') {
        setStatus('error');
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

  const run = (query: string, mode: string, context?: string, prevMessage?: string) => {
    setStatus('generating');
    workerRef.current?.postMessage({ query, mode, context, prevMessage })
  }

  return { run, synthesisOutput, queryOutput, status, progress };
}
