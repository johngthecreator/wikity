
import { useEffect, useState } from "react";
import { useResearchWorkflow } from "../hooks/useResearchWorkflow"
import { InputGroup, InputGroupTextarea, InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";
import MessageBox, { type Message } from "@/components/custom/MessageBox";

const LLMStates = {
  UNDERSTANDING_QUERY: 'Thinking...',
  SEARCHING: 'Researching...',
  ANSWERING: 'Preparing answer...',
  ERROR: 'Something went wrong. Try again in a few seconds.'
} as const;

export default function Wiki() {

  const [query, setQuery] = useState<string>("")
  const [messages, setMessages] = useState<Message[]>([])

  const { startFlow, processingState, flowOutput } = useResearchWorkflow();

  useEffect(() => {
    if (flowOutput) {
      setMessages(prev => [...prev, { role: "system", content: flowOutput.response, thought: flowOutput.think }])
    }
  }, [flowOutput])

  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-0 items-center justify-center gap-3 overflow-none p-2">
      <div className="w-full py-7 lg:w-1/2 flex flex-col flex-1 overflow-y-auto min-h-0 mask-t-from-90% mask-b-from-90% no-scrollbar">
        {messages.reverse().map((msg) => <MessageBox role={msg.role} content={msg.content} thought={msg.thought} />)}
        {processingState !== "DONE" && processingState !== "ERROR" &&
          <h2 className="text-gray-400 italic">{LLMStates[processingState]}</h2>
        }
      </div>
      <InputGroup className="w-full lg:w-1/2">
        <InputGroupTextarea
          onChange={e => setQuery(e.target.value)}
          value={query}
          id="block-end-textarea"
          placeholder="Write a comment..."
        />
        <InputGroupAddon align="block-end">
          <InputGroupButton variant="default" size="sm" className="ml-auto"
            disabled={query.length === 0} onClick={() => {
              const role = messages.at(-1)?.role
              const content = messages.at(-1)?.content as string
              startFlow(query, (role === 'system' ? content : null));
              setMessages(prev => [...prev, { role: "user", content: query, thought: undefined }])
              setQuery("");
            }}
          >
            Search
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}
