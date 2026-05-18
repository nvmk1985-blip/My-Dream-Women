// WebLLM (Gemma in-browser) is web-only — fully stubbed on mobile.
// @mlc-ai/web-llm is NOT bundled to avoid Hermes/Metro crashes.

export type DownloadProgress = {
  progress: number;
  text: string;
};

export function isWebGPUSupported(): boolean { return false; }
export function isModelCached(): boolean { return false; }
export async function validateCacheStorage(): Promise<boolean> { return false; }
export function isEngineReady(): boolean { return false; }
export async function hasShaderF16(): Promise<boolean> { return false; }
export async function getModelVariant(): Promise<'f16' | 'f32'> { return 'f32'; }
export async function getModelSizeLabel(): Promise<string> { return 'Not available on mobile'; }

export async function loadModel(_onProgress: (p: DownloadProgress) => void): Promise<void> {
  throw new Error('WebLLM is not supported on mobile.');
}

export async function chatWithGemma(
  _messages: { role: string; content: string }[],
  _systemPrompt?: string,
): Promise<string> {
  throw new Error('WebLLM is not supported on mobile.');
}

export function unloadModel(): void {}
