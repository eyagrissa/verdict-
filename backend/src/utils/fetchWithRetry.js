const DEFAULT_TIMEOUT_MS = 15000;

/**
 * fetch with AbortController timeout, one network retry, clear errors.
 */
async function fetchWithRetry(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const attempt = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await attempt();
  } catch (err) {
    const isAbort = err.name === "AbortError";
    const isNetwork =
      err.name === "TypeError" ||
      err.code === "ECONNRESET" ||
      err.code === "ENOTFOUND" ||
      err.code === "ETIMEDOUT" ||
      err.cause?.code === "ECONNRESET";

    if (isAbort) {
      throw new Error(`Timeout après ${timeoutMs / 1000}s`);
    }

    // Retry once on network failure
    if (isNetwork) {
      try {
        return await attempt();
      } catch (retryErr) {
        if (retryErr.name === "AbortError") {
          throw new Error(`Timeout après ${timeoutMs / 1000}s (après retry)`);
        }
        throw new Error(
          `Erreur réseau après retry: ${retryErr.message || String(retryErr)}`
        );
      }
    }

    throw err;
  }
}

module.exports = { fetchWithRetry, DEFAULT_TIMEOUT_MS };
