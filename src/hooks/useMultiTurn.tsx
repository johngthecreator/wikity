import { useEffect, useReducer, useRef } from "react";
import { searchWikipedia } from "@/tools/wikipedia";
import useWebLLM, { type Message, type ToolCall } from "./useWebLLM";

export default function useMultiTurn() {
  const [state, dispatch] = useReducer(agentReducer, initialState);
  const { chat } = useWebLLM();
  const runningRef = useRef(false);

  useEffect(() => {
    if (runningRef.current) return;

    if (state.status === Status.REASON) {
      runningRef.current = true;
      const windowMessages = slidingWindow(state.messages);
      console.log(windowMessages)
      chat(windowMessages).then((resp) => {
        runningRef.current = false;
        const content = resp.choices[0].message.content ?? ''
        console.log(resp.usage)
        const match = content.match(/<think>([\s\S]*?)<\/think>\s*([\s\S]*)/);
        // const thinkBlock = match?.[1]?.trim() ?? '';
        const response = match?.[2]?.trim() ?? '';

        const cleaned = response.replace(/("content"\s*:\s*")([\s\S]*?)("\s*})/,
          (_, prefix, content, suffix) => prefix + content.replace(/"/g, "'") + suffix
        );

        console.log(cleaned)
        const result = JSON.parse(cleaned)

        console.log(state.messages)

        if (result.action === 'search') {
          dispatch({ type: ActionType.REASON_OR_RESPOND, hasTool: true, tool: result.tool as ToolCall })
        } else {
          dispatch({ type: ActionType.REASON_OR_RESPOND, hasTool: false, content: result.content, tool: null })
        }
      })


    } else if (state.status === Status.ACT && state.toolCall) {
      runningRef.current = true;
      if (state.toolCall.toolName === "wikipedia_search") {
        console.log(state.toolCall.args)
        searchWikipedia(state.toolCall.args).then((resp) => {
          runningRef.current = false;
          console.log(resp.join(" | "));
          dispatch({ type: ActionType.TOOL_RESULT, tool: state.toolCall as ToolCall, content: resp.join(' | ') })
        })
      }
    }

  }, [state.status])

  function start(userQuery: string) {
    dispatch({ type: ActionType.START, message: { role: "user", content: userQuery } })
  }

  function slidingWindow(messages: Message[]) {
    const system = messages[0];
    const reminder: Message = {
      role: "user",
      content: '<REMINDER> Respond with JSON only: {"action": "search", "tool":{"toolName":"wikipedia_search","args":"query"}} or {"action": "respond", "content": "your answer"} </REMINDER>'
    };
    const rest = messages.slice(1);
    let tokens = Math.ceil((system.content.length + reminder.content.length) / 4);
    const keep: Message[] = [];

    for (let i = rest.length - 1; i >= 0; i--) {
      const msgTokens = Math.ceil(rest[i].content.length / 4);
      if (tokens + msgTokens > 2000) break;
      keep.unshift(rest[i]);
      tokens += msgTokens;
    }

    if (keep.length === 0 && rest.length > 0) {
      keep.push(rest[rest.length - 1]);
    }

    return [system, ...keep, reminder];
  }


  return { start, state }
}

function agentReducer(state: ReducerState, action: ReducerAction) {
  switch (action.type) {
    case ActionType.START:
      return {
        ...state,
        status: Status.REASON,
        messages: [...state.messages, action.message],
        isLoading: true
      }
    case ActionType.REASON_OR_RESPOND:
      console.log(action)
      console.log(action.hasTool)
      if (action.hasTool) {
        return {
          ...state,
          status: Status.ACT,
          toolCall: action.tool,
          isLoading: true
        }
      }
      return {
        ...state,
        status: Status.DONE,
        finalAnswer: action.content,
        messages: [...state.messages,
        {
          role: "assistant" as const,
          content: action.content,
        }
        ],
        isLoading: false
      }
    case ActionType.TOOL_RESULT:
      return {
        ...state,
        status: Status.REASON,
        messages: [...state.messages,
        {
          role: "user" as const,
          content: `<TOOL_USED> ${JSON.stringify(action.tool)} </TOOL_USED>\n<RESULTS>${action.content || 'NO RESULTS FOUND. Do not make up an answer. Respond that you could not find enough information.'}</RESULTS>`,
        }
        ]
      }
    default:
      return state;
  }
}

const Status = {
  DONE: "done",
  REASON: "reason",
  ACT: "act",
} as const;
type Status = typeof Status[keyof typeof Status];

const ActionType = {
  START: "START",
  REASON_OR_RESPOND: "REASON_OR_RESPOND",
  TOOL_RESULT: "TOOL_RESULT",
} as const;
type ActionType = typeof ActionType[keyof typeof ActionType];

type ReducerAction =
  | { type: typeof ActionType.TOOL_RESULT, tool: ToolCall, content: string }
  | { type: typeof ActionType.START, message: Message }
  | { type: typeof ActionType.REASON_OR_RESPOND; hasTool: true; tool: ToolCall }
  | { type: typeof ActionType.REASON_OR_RESPOND; hasTool: false; content: string; tool: null };

interface ReducerState {
  status: Status,
  messages: Message[],
  toolCall: ToolCall | null,
  finalAnswer: string | null,
  isLoading: boolean
}

const SYSTEM_PROMPT = `You are a helpful assistant that can search Wikipedia for information.

When you receive a user query, think step by step:
1. Does the query involve a specific person, place, event, historical topic, organization, or any proper noun? If yes, ALWAYS search first — do not answer from memory.
2. Is the query asking for factual, biographical, geographical, or historical information? If yes, ALWAYS search first.
3. Only respond directly if the conversation context already contains the answer from a previous search, or if the query is purely conversational (e.g. greetings, clarifications, opinions).

You MUST respond with a JSON object in one of these two formats:

If you need to search Wikipedia:
{"action": "search", "tool":{"toolName":"wikipedia_search","args": "optimized search query"}}

If you can respond directly:
{"action": "respond", "content": "your response here"}

Rules:
- Always respond with valid JSON only, no other text
- When searching, optimize the query for Wikipedia (use proper nouns, titles, specific terms)
- Only search when the conversation context doesn't already contain the answer
- After receiving search results, synthesize a clear answer using ONLY the provided context
- If the search results are empty or do not contain enough information to answer the question, respond with {"action": "respond", "content": "I couldn't find enough information to answer that question. Try rephrasing or asking something else."}
- NEVER make up or guess information that is not present in the search results
- IMPORTANT: In the "content" value, use single quotes ('') instead of double quotes ("") to avoid breaking the JSON format. For example: {"action": "respond", "content": "He said 'hello' to her"}`;

const initialState: ReducerState = {
  status: Status.DONE,
  messages: [{ role: "system", content: SYSTEM_PROMPT }],
  toolCall: null,
  finalAnswer: null,
  isLoading: false
};

