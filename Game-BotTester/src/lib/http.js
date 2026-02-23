const DEFAULT_TIMEOUT_MS = 10000;

async function requestJson(url, options = {}) {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available. Use Node 18+.');
  }

  const controller = new AbortController();
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(new Error(`Request timeout: ${timeoutMs}ms`)), timeoutMs);

  try {
    const headers = { ...(options.headers || {}) };
    if (options.body != null && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body != null ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    let payload;
    const text = await res.text();
    try {
      payload = text ? JSON.parse(text) : {};
    } catch (error) {
      payload = { raw: text };
    }

    return {
      ok: res.ok,
      status: res.status,
      headers: res.headers,
      payload,
    };
  } finally {
    clearTimeout(timer);
  }
}

function unwrapReply(res, context = 'request') {
  const body = res?.payload || {};
  const data = body.data ?? {};
  if (!res.ok) {
    const message = body.message || `${context} failed with HTTP ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.body = body;
    throw error;
  }
  return { message: body.message, data, headers: res.headers, status: res.status, raw: body };
}

module.exports = { requestJson, unwrapReply };
