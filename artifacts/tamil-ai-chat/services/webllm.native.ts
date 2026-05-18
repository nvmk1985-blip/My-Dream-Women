// Native stub — @mlc-ai/web-llm is web-only (WebGPU).
// Metro picks this file on Android/iOS; the real webllm.ts is used on web.

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
export async function getModelSizeLabel(): Promise<string> { return 'Not supported on mobile'; }
export async function loadModel(_onProgress: (p: DownloadProgress) => void): Promise<void> {}
export async function chatWithGemma(
  _messages: { role: string; content: string }[],
  _systemPrompt?: string,
): Promise<string> {
  return 'Offline chat is not available on mobile.';
}
export function unloadModel(): void {}
