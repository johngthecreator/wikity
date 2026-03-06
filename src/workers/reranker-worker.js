import { AutoTokenizer, AutoModelForSequenceClassification, env } from "@huggingface/transformers";

env.allowRemoteModels = true;
env.allowLocalModels = false;
env.remoteHost = '';
env.remotePathTemplate = 'mixedbread-ai/mxbai-rerank-xsmall-v1/';

// Use the Singleton pattern to enable lazy construction of the pipeline.
class PipelineSingleton {
  static model_id = 'mixedbread-ai/mxbai-rerank-xsmall-v1';
  static model = null;
  static tokenizer = null;

  static async getInstance(progress_callback = null) {
    this.model ??= await AutoModelForSequenceClassification.from_pretrained(this.model_id, { device: 'wasm', progress_callback });
    this.tokenizer ??= await AutoTokenizer.from_pretrained(this.model_id, { device: 'wasm', progress_callback });
    return { model: this.model, tokenizer: this.tokenizer }
  }

}

async function rank(model, tokenizer, query, documents, {
  top_k = undefined,
  return_documents = false,
} = {}) {
  const inputs = tokenizer(
    new Array(documents.length).fill(query),
    {
      text_pair: documents,
      padding: true,
      truncation: true,
    }
  )
  const { logits } = await model(inputs);
  return logits
    .sigmoid()
    .tolist()
    .map(([score], i) => ({
      corpus_id: i,
      score,
      ...(return_documents ? { text: documents[i] } : {})
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, top_k);
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  // Retrieve the classification pipeline. When called for the first time,
  // this will load the pipeline and save it for future use.
  const reranker = await PipelineSingleton.getInstance(x => {
    self.postMessage(x);
  });

  const query = event.data.query;
  const documents = event.data.corpus;

  const results = await rank(reranker.model, reranker.tokenizer, query, documents, { return_documents: true, top_k: 3 });

  // Send the output back to the main thread
  self.postMessage({
    status: 'complete',
    output: results,
  });
});
