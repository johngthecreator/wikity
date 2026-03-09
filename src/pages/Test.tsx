import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useMultiTurn from "@/hooks/useMultiTurn";
import ky from "ky";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";

export default function Test() {
  const [userMessage, setUserMessage] = useState<string>("");
  const [response, setResponse] = useState<string | null>(null);

  const { start, state } = useMultiTurn();

  async function callThing() {
    const data = await ky.get('https://www.reddit.com/r/frontend/hot.json').json()
    console.log(data);
  }

  useEffect(() => {
    if (state.finalAnswer) {
      setResponse(state.finalAnswer)
    }
  }, [state.finalAnswer])

  return (
    <div>
      <h2>Test</h2>
      <Input onChange={e => setUserMessage(e.target.value)} value={userMessage} />
      {response &&
        <Markdown>{response}</Markdown>
      }
      <Button onClick={callThing}>Click</Button>
    </div>
  )
}
