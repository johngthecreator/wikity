import { useEffect, useRef, useState } from "react";
import * as z from "zod";


type WorkerStatus = 'idle' | 'loading' | 'generating' | 'complete' | 'error' | 'ready'

export const SynthesisGenerationResponseSchema = z.object({
  think: z.string(),
  response: z.string()
})

export function useSynthesisGeneration() {
  const workerRef = useRef<Worker | null>(null);
  const [output, setOutput] = useState<z.Infer<typeof SynthesisGenerationResponseSchema> | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<WorkerStatus>('idle');

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/synthesis-generation-worker.js", import.meta.url),
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

  const run = (prompt: string, context?: string) => {
    setStatus('generating');
    workerRef.current?.postMessage({ query: prompt, context: context })
  }

  return { run, output, status, progress };
}
