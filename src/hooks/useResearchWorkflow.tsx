import { useEffect, useState } from "react";
import { TextGenerationResponseSchema, useTextGeneration } from "./useTextGeneration";
import { useWikipediaTool } from "./useWikipediaTool";


export function useResearchWorkflow() {
  const [originalQuery, setOriginalQuery] = useState<string | null>(null);
  const [processingState, setProcessingState] = useState<"DONE" | "UNDERSTANDING_QUERY" | "SEARCHING" | "ANSWERING" | "ERROR">("DONE");
  const [prevMessage, setPrevMessage] = useState<string | null>(null);

  const { run, queryOutput, synthesisOutput, status } = useTextGeneration();

  const { summaries, getWikipediaResults } = useWikipediaTool();

  useEffect(() => {
    (async () => {

      try {
        const data = queryOutput ? TextGenerationResponseSchema.parse(JSON.parse(queryOutput)) : null
        if (data) {
          setOriginalQuery(data.original)
          getWikipediaResults(data.optimized)
        }
      } catch (error) {
        setProcessingState("ERROR")
        console.error(error);
      }
    })();
  }, [queryOutput])

  useEffect(() => {
    (async () => {
      try {
        if (summaries && originalQuery) {
          setProcessingState("ANSWERING")
          const summaryContext = summaries?.join(' | ')
          console.log(prevMessage)
          run(originalQuery, 'SYNTHESIZER', summaryContext, prevMessage ?? undefined)
        }
      } catch (error) {
        setProcessingState("ERROR")
        console.error(error);
      }
    })();
  }, [summaries])

  useEffect(() => {
    setProcessingState("DONE")
  }, [synthesisOutput])

  useEffect(() => {
    if (status === "error") {
      setProcessingState("ERROR")
    }
  }, [status])


  const startFlow = (query: string, prevMessage: string | null) => {
    setProcessingState("UNDERSTANDING_QUERY")
    setPrevMessage(prevMessage);
    run(query, 'OPTIMIZER', undefined, prevMessage ?? undefined);
  }

  return { startFlow, processingState, flowOutput: synthesisOutput }

}
