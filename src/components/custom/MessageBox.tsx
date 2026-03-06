import { Item, ItemContent, ItemDescription } from "@/components/ui/item";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronRightIcon } from "lucide-react"
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import Markdown from 'react-markdown';


export interface Message {
  role: "system" | "user"
  content: string
  thought?: string
}

export default function MessageBox({ role, content, thought }: Message) {
  return (
    <Item variant="outline" className={`w-auto max-w-3/4 mb-4 ${role === 'system' ? "self-start" : "self-end"}`}>
      <ItemContent>
        {(thought && role === 'system') &&
          <Collapsible>
            <CollapsibleTrigger className="group">
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-transparent !px-0 w-full justify-start transition-none"
              >
                Thought
                <ChevronRightIcon className="transition-transform rotate-90 group-data-[state=open]:rotate-270" />
              </Button>

            </CollapsibleTrigger>
            <CollapsibleContent>
              <ItemDescription>
                {thought}
              </ItemDescription>
              <Separator className="my-4" />
            </CollapsibleContent>
          </Collapsible>
        }
        <Markdown>
          {content}
        </Markdown>
      </ItemContent>
    </Item >
  )
}