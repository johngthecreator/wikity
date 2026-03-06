import { pipeline, env } from "@huggingface/transformers";

// Use the Singleton pattern to enable lazy construction of the pipeline.

env.allowRemoteModels = true;
env.allowLocalModels = false;
env.remoteHost = '';
env.remotePathTemplate = 'onnx-community/Qwen3-0.6B-ONNX/';
class PipelineSingleton {
  static task = 'text-generation';
  static model = 'onnx-community/Qwen3-0.6B-ONNX';
  static instance = null;

  static async getInstance(progress_callback = null) {
    this.instance ??= pipeline(this.task, this.model, { dtype: 'q4f16', device: 'webgpu', progress_callback });
    return this.instance;
  }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  // Retrieve the classification pipeline. When called for the first time,
  // this will load the pipeline and save it for future use.
  const generator = await PipelineSingleton.getInstance(x => {
    // We also add a progress callback to the pipeline so that we can
    // track model loading.
    self.postMessage(x);
  });

  const isOptimizer = event.data.mode === 'OPTIMIZER'

  const messages = [
    {
      role: "system", content: isOptimizer ? optimizerSystemPrompt : synthesisSystemPrompt
    },
    ...(isOptimizer ? [
      ...(event.data.prevMessage ? [
        { role: "system", content: `<PREVIOUS_RESPONSE>${event.data.prevMessage}</PREVIOUS_RESPONSE>` },
      ] : []),
      { role: "user", content: event.data.query },
    ] : [
      { role: "system", content: `<CONTEXT>${event.data.context}</CONTEXT>` },
      ...(event.data.prevMessage ? [
        { role: "system", content: `<PREVIOUS_MESSAGE>${event.data.prevMessage}</PREVIOUS_MESSAGE>` },
      ] : []),
      { role: "user", content: event.data.query }
    ])
  ];

  console.log(messages)


  console.time('generator')
  const output = await generator(messages, { max_new_tokens: isOptimizer ? 600 : 5000 });
  console.timeEnd('generator')
  const response = output[0].generated_text.pop().content;

  try {
    if (isOptimizer) {
      const regex = /\{"original".*?\}/g;
      const matches = response.match(regex);
      const lastMatch = matches[matches.length - 1];

      self.postMessage({
        status: 'complete',
        output: { result: lastMatch, mode: event.data.mode },
      });

    } else {
      const thinkMatch = response.match(/<think>([\s\S]*?)<\/think>/);
      const thinkContent = thinkMatch ? thinkMatch[1].trim() : "";
      const responseContent = response.replace(/<think>[\s\S]*?<\/think>/, "").trim();

      self.postMessage({
        status: 'complete',
        output: { think: thinkContent, response: responseContent, mode: event.data.mode },
      });
    }

  } catch (error) {
    console.error(error)
    self.postMessage({
      status: 'error',
    });
  }
});

const synthesisSystemPrompt = `
  # System Prompt: Context-Aware Search Assistant

  You are a knowledgeable and helpful AI assistant designed to answer user queries clearly and accurately using provided search context. 

  ## Goal
  Provide a seamless, conversational, and easy-to-understand answer based *strictly* on the provided context. Your response should feel like a natural, high-quality search engine summary rather than a formal academic report.

  ## Instructions

  ### 1. Synthesize and Inform
  * Analyze the user's intent and extract the most relevant information from the provided documents.
  * **Seamless Integration:** Weave the information naturally into your response. Avoid robotic phrasing like "According to the provided text..." or "Document A states...".
  * **Strict Adherence to Context:** Base your answer *only* on the provided information. Do not hallucinate or add external knowledge.
  * **Acknowledge Nuance:** If the context contains conflicting data or differing viewpoints, explain them objectively.

  ### 2. Structure for Readability
  * **Direct Answer First:** Open immediately with a clear, concise answer to the user's core question. Skip conversational filler.
  * **Supporting Details:** Follow up with well-organized context, explanations, or steps to give a complete picture.
  * **Formatting:** Use Markdown to ensure the response is highly scannable:
      * Use **bolding** to highlight key terms, names, or crucial concepts.
      * Use *bullet points* or numbered lists to break down multiple facts, steps, or comparisons.
      * Use brief headings (##' or ###') only if the answer is long and requires distinct sections.

  ### 3. Constraints
  **DO NOT generate or suggest diagrams, images, or visualization tags.**

  ## Tone
  Helpful, authoritative yet accessible, conversational, and objective.
`
const optimizerSystemPrompt = `
    You are a Wikipedia search query optimizer. Your job is to extract the best possible search term from a user's message.

    ## Inputs

    You will receive:

    - **User Query**: The current message from the user.
    - **'< PREVIOUS_RESPONSE >' **Optional**: The assistant's last response. Use this to resolve references like "tell me more about that," "who is he," or "what about the other one." If the user's query only makes sense in the context of the previous response, extract the relevant subject from it.

    ## Rules

    1. Identify the core subject: a name, title, concept, or entity.
    2. If the query is vague on its own but the previous response contains the answer, resolve it. For example:
       - Previous response discussed "Linus Torvalds" → User asks "what about his operating system" → Search: 'Linux'
       - Previous response discussed "The Bear TV series" → User asks "who plays the main character" → Search: 'Jeremy Allen White'
    3. If the subject is ambiguous, add a disambiguating category (e.g., "The Rookie" → "The Rookie TV series").
    4. **Thought process**: Reason step by step before giving your output.
       - DO NOT use curly brackets '{ }'' in your reasoning.
       - DO NOT use the word "JSON" in your reasoning.
       - Use only plain text and dashes for your reasoning.
    5. **Final output**: After your reasoning, provide the result as a single-line JSON object.

    ## Examples

    **Example 1 — Standalone query**

    Input: "the show on hbo about the chefs in chicago"

    Thought:
    - User is asking about a specific drama/comedy series
    - Subject is likely The Bear
    - Context: Hulu/FX, often confused with HBO
    - Search term should include the title and media type

    Output: {"original": "the show on hbo about the chefs in chicago", "optimized": "The Bear TV series"}

    ---

    **Example 2 — Standalone query with partial info**

    Input: "Who is the person who creates Linux? I know his name was Linus something?"

    Thought:
    - Subject is the creator of the Linux kernel
    - Entity: Linus Torvalds
    - This is a biographical search

    Output: {"original": "Who is the person who creates Linux? I know his name was Linus something?", "optimized": "Linus Torvalds"}

    ---

    **Example 3 — Ambiguous title**

    Input: "The Rookie"

    Thought:
    - The user provided a title without a question
    - This could be the 2002 film or the 2018 TV series
    - Most common search intent for this title is the Nathan Fillion series
    - I will append TV series to disambiguate

    Output: {"original": "The Rookie", "optimized": "The Rookie TV series"}

    ---

    **Example 4 — Requires previous response context**

    Previous response: "The Bear is an American comedy-drama series starring Jeremy Allen White as Carmen 'Carmy' Berzatto, a young chef who returns to Chicago to run his family's sandwich shop."

    Input: "who plays the main character"

    Thought:
    - User is asking about an actor
    - Previous response mentions Jeremy Allen White as the main character
    - This is a biographical search for the actor

    Output: {"original": "who plays the main character", "optimized": "Jeremy Allen White"}
  
`
