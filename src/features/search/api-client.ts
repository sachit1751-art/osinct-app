import { normalizeResponse } from './normalize-response.ts'
import { SearchError, type HttpAdapterConfig, type SearchMode, type SearchRecord } from './search.types.ts'

export function buildSearchUrl(config: Pick<HttpAdapterConfig, 'baseUrl' | 'phoneRoute' | 'identityRoute' | 'queryParameter'>, mode: SearchMode, query: string): URL {
  let base: URL
  try {
    base = new URL(config.baseUrl)
  } catch {
    throw new SearchError('live_disabled', 'Live search is not configured with a valid API base URL.')
  }
  const localHttp = base.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(base.hostname)
  if (base.protocol !== 'https:' && !localHttp) {
    throw new SearchError('live_disabled', 'Live search requires HTTPS, except for a local development server.')
  }
  if (base.username || base.password || base.search || base.hash || !/^[A-Za-z0-9_.-]{1,80}$/.test(config.queryParameter)) {
    throw new SearchError('live_disabled', 'The live API configuration is invalid.')
  }
  const route = mode === 'phone' ? config.phoneRoute : config.identityRoute
  if (!route || route.trim() !== route || route.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(route)) {
    throw new SearchError('live_disabled', 'A relative route must be configured for this search mode.')
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
  mode: SearchMode,
  query: string,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<SearchRecord[]> {
  if (!config.enabled) throw new SearchError('live_disabled', 'Live search is disabled. Configure an authorized proxy and verify its contract before enabling it.')
  const url = buildSearchUrl(config, mode, query)
  const controller = new AbortController()
  let timedOut = false
  const timeoutMs = Math.max(100, Math.min(config.timeoutMs || 8000, 30000))
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const forwardAbort = () => controller.abort()
  if (options.signal?.aborted) {
    clearTimeout(timer)
    throw new SearchError('aborted', 'Search cancelled.')
  }
  options.signal?.addEventListener('abort', forwardAbort, { once: true })

  try {
    const fetchImpl = options.fetchImpl ?? fetch
    let response: Response
    try {
      response = await fetchImpl(url, { method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal, credentials: 'same-origin', redirect: 'error', cache: 'no-store' })
    } catch {
      if (timedOut) throw new SearchError('timeout', 'The search took too long. Check your connection and try again.', { retryable: true })
      if (options.signal?.aborted) throw new SearchError('aborted', 'Search cancelled.')
      throw new SearchError('network', 'Could not connect to the authorized search service. Check the connection and try again.', { retryable: true })
    }
    if (!response.ok) {
      const retryable = response.status === 408 || response.status === 429 || response.status >= 500
      throw new SearchError('http', `The search service returned HTTP ${response.status}. ${retryable ? 'You can retry this request.' : 'Check the request configuration or access permissions.'}`, { retryable, status: response.status })
    }
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      if (timedOut) throw new SearchError('timeout', 'The search took too long. Check your connection and try again.', { retryable: true })
      throw new SearchError('invalid_json', 'The search service returned unreadable JSON.', { retryable: true })
    }
    return normalizeResponse(payload)
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', forwardAbort)
  }
}
