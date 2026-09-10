const DEFAULT_TIMEOUT_MS = 12_000;

export async function fetchApi(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort();

  init.signal?.addEventListener("abort", abortFromCaller, { once: true });

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted && !init.signal?.aborted) {
      throw new Error("Le serveur met trop de temps à répondre.", { cause: error });
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
    init.signal?.removeEventListener("abort", abortFromCaller);
  }
}
