import { requestSearch } from './api-client.ts'
import { SearchError, type SearchServiceConfig } from './search.types.ts'

export function createSearchService(config: SearchServiceConfig, fetchImpl?: typeof fetch) {
  return {
    async search(query: string, signal?: AbortSignal): Promise<unknown> {
      if (!config.http.enabled) {
        throw new SearchError('live_disabled', 'API requests are disabled until a reviewed, authorized endpoint is configured.')
      }
      return requestSearch(config.http, query, { signal, fetchImpl })
    },
  }
}

export function getSearchServiceConfig(env: Record<string, string | boolean | undefined>): SearchServiceConfig {
  return {
    http: {
      enabled: env.VITE_LIVE_API_ENABLED === 'true',
      baseUrl: typeof env.VITE_API_BASE_URL === 'string' ? env.VITE_API_BASE_URL : '',
      route: typeof env.VITE_API_ROUTE === 'string' ? env.VITE_API_ROUTE : '',
      queryParameter: typeof env.VITE_API_QUERY_PARAMETER === 'string' ? env.VITE_API_QUERY_PARAMETER : 'q',
      timeoutMs: Number(env.VITE_API_TIMEOUT_MS) || 8000,
    },
  }
}
