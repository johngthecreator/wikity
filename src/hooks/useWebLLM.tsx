import { CreateWebWorkerMLCEngine, type MLCEngineInterface } from "@mlc-ai/web-llm";
import { useEffect, useRef, useState } from "react";


export interface ToolCall {
  toolName: string,
  args: string
}

export interface Message {
  role: "system" | "user" | "assistant",
  content: string,

}

export default function useWebLLM() {

  const ENGINE_TIMEOUT = 5 * 60 * 1000;

  const [engine, setEngine] = useState<MLCEngineInterface | null>(null);
  const unloaded = useRef<boolean>(false);
  const appConfig = {
    model_list: [{
      model: "https://pub-c715da35c2f84e228a518634bec87d72.r2.dev/mlc-ai/Qwen3-1.7B-q4f32_1-MLC/",
      model_id: "Qwen3-1.7B-q4f32_1-MLC",
      model_lib: "https://pub-c715da35c2f84e228a518634bec87d72.r2.dev/mlc-ai/Qwen3-1.7B-q4f32_1-MLC/resolve/main/Qwen3-1.7B-q4f32_1-ctx4k_cs1k-webgpu.wasm",
      overrides: {
        context_window_size: 4096,
      },
    }]
  };

  const initProgressCallback = (initProgress: any) => {
    console.log(initProgress);
  }

  const engineConfig = {
    appConfig,
    initProgressCallback,
  };

  useEffect(() => {
    let cancelled = false;

    const worker = new Worker(new URL("../workers/mlc-worker.ts", import.meta.url), { type: "module" });

    CreateWebWorkerMLCEngine(worker, "Qwen3-1.7B-q4f32_1-MLC", engineConfig)
      .then(async (engine) => {
        if (cancelled) {
          engine.unload();
          worker.terminate();
          unloaded.current = true;
        }
        setEngine(engine)
      })
      .catch((e) => console.error("engine error:", e));
    return () => {
      cancelled = true;
      worker.terminate();
      setEngine(null);
    };
  }, [])

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleVisibilityChange = () => {
      if (document.hidden && engine) {
        timeoutId = setTimeout(() => {
          engine.unload();
          unloaded.current = true;
        }, ENGINE_TIMEOUT)
      } else {
        clearTimeout(timeoutId)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [engine])

  async function chat(messages: Message[]) {
    if (!engine) throw new Error("Engine not loaded")
    if (unloaded.current) {
      await engine?.reload('Qwen3-1.7B-q4f32_1-MLC');
      unloaded.current = false;
    }

    return await engine?.chat.completions.create({ messages })

  }
  return { chat }
}
