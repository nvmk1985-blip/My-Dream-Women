declare module 'cui-llama.rn' {
  export interface LlamaInitOptions {
    model: string;
    use_mlock?: boolean;
    n_ctx?: number;
    n_batch?: number;
    n_gpu_layers?: number;
  }

  export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }

  export interface CompletionOptions {
    messages: ChatMessage[];
    n_predict?: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    min_p?: number;
    repeat_penalty?: number;
    stop?: string[];
  }

  export interface CompletionResult {
    text: string;
    timings?: {
      predicted_per_second?: number;
    };
  }

  export interface LlamaContext {
    completion(
      options: CompletionOptions,
      onToken?: (data: { token: string }) => void,
    ): Promise<CompletionResult>;
    release(): Promise<void>;
  }

  export function initLlama(options: LlamaInitOptions): Promise<LlamaContext>;
}
