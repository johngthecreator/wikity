
import { useEffect, useRef, useState } from "react";
import { InputGroup, InputGroupTextarea, InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";
import MessageBox from "@/components/custom/MessageBox";
import useMultiTurn from "@/hooks/useMultiTurn";

const LLMStates = {
  reason: 'Thinking...',
  act: 'Researching...',
  ERROR: 'Something went wrong. Try again in a few seconds.'
} as const;

export default function Wiki() {

  const [query, setQuery] = useState<string>("")
  const { start, state } = useMultiTurn();

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.messages]);

  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-0 items-center justify-center gap-3 overflow-none p-2">
      <div ref={containerRef} className="w-full py-7 lg:w-1/2 flex flex-col flex-1 overflow-y-auto min-h-0 mask-t-from-90% mask-b-from-90% no-scrollbar">
        {state.messages.reverse().filter(msg => msg.role !== 'system' && !/<\/?TOOL_USED>/.test(msg.content) && !/<\/?REMINDER>/.test(msg.content)).map((msg) => <MessageBox role={msg.role} content={msg.content} />)}
        {state.status !== "done" &&
          <h2 className="text-gray-400 italic">{LLMStates[state.status]}</h2>
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
              start(query);
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
