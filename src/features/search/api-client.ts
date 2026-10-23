import { normalizeResponse } from './normalize-response.ts'
import { SearchError, type HttpAdapterConfig } from './search.types.ts'

export function buildSearchUrl(config: Pick<HttpAdapterConfig, 'baseUrl' | 'route' | 'queryParameter'>, query: string): URL {
  let base: URL
  try {
    base = new URL(config.baseUrl)
  } catch {
    throw new SearchError('live_disabled', 'Configure a valid API base URL before searching.')
  }
  const localHttp = base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(base.hostname)
  if (base.protocol !== 'https:' && !localHttp) {
    throw new SearchError('live_disabled', 'The configured API must use HTTPS, except for localhost development.')
  }
  if (base.username || base.password || base.search || base.hash || !/^[A-Za-z0-9_.-]{1,80}$/.test(config.queryParameter)) {
    throw new SearchError('live_disabled', 'The API configuration is invalid.')
  }
  const route = config.route
  if (!route || route.trim() !== route || route.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(route)) {
    throw new SearchError('live_disabled', 'Configure a relative API route.')
  }
  const basePath = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`
  base.pathname = basePath
  const url = new URL(route.replace(/^\/+/, ''), base)
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || url.search || url.hash) {
    throw new SearchError('live_disabled', 'The configured API route is invalid.')
  }
  url.searchParams.set(config.queryParameter, query)
  return url
}

export async function requestSearch(
  config: HttpAdapterConfig,
  query: string,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<unknown> {
  if (!config.enabled) throw new SearchError('live_disabled', 'API requests are disabled. Configure a reviewed, authorized API first.')
  const url = buildSearchUrl(config, query)
  const controller = new AbortController()
  let timedOut = false
  const timeoutMs = Math.max(100, Math.min(config.timeoutMs || 8000, 30000))
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, timeoutMs)
  const forwardAbort = () => controller.abort()
  if (options.signal?.aborted) {
    clearTimeout(timer)
    throw new SearchError('aborted', 'Search cancelled.')
  }
  options.signal?.addEventListener('abort', forwardAbort, { once: true })
  try {
    let response: Response
    try {
      response = await (options.fetchImpl ?? fetch)(url, {
        method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal,
        credentials: 'same-origin', redirect: 'error', cache: 'no-store',
      })
    } catch {
      if (timedOut) throw new SearchError('timeout', 'The request timed out. Try again.', { retryable: true })
      if (options.signal?.aborted) throw new SearchError('aborted', 'Search cancelled.')
      throw new SearchError('network', 'Could not connect to the configured API.', { retryable: true })
    }
    if (!response.ok) {
      const retryable = response.status === 408 || response.status === 429 || response.status >= 500
      throw new SearchError('http', `The API returned HTTP ${response.status}.`, { retryable, status: response.status })
    }
    let payload: unknown
    try { payload = await response.json() } catch {
      throw new SearchError('invalid_json', 'The API response was not valid JSON.', { retryable: true })
    }
    return normalizeResponse(payload)
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', forwardAbort)
  }
}
