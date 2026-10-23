import { requestSearch } from './api-client.ts'
import { searchMock } from './mock-adapter.ts'
import { SearchError, type SearchMode, type SearchRecord, type SearchServiceConfig } from './search.types.ts'
import { validateQuery } from './search.validation.ts'

export function createSearchService(config: SearchServiceConfig, fetchImpl?: typeof fetch) {
  return {
    async search(mode: SearchMode, input: string, signal?: AbortSignal): Promise<SearchRecord[]> {
      const query = validateQuery(mode, input)
      if (config.adapter === 'mock') return searchMock(mode, query, signal)
      if (!config.http.enabled) {
        throw new SearchError('live_disabled', 'Live search is disabled. This app is using fictional demo records until an authorized API contract is verified.')
      }
      return requestSearch(config.http, mode, query, { signal, fetchImpl })
    },
  }
}

export function getSearchServiceConfig(env: Record<string, string | boolean | undefined>): SearchServiceConfig {
  const adapter = env.VITE_SEARCH_ADAPTER === 'http' ? 'http' : 'mock'
  return {
    adapter,
    http: {
      // This opt-in does not establish authorization; only enable after a trusted proxy is reviewed.
      enabled: env.VITE_LIVE_API_ENABLED === 'true',
      baseUrl: typeof env.VITE_API_BASE_URL === 'string' ? env.VITE_API_BASE_URL : '',
      phoneRoute: typeof env.VITE_API_PHONE_ROUTE === 'string' ? env.VITE_API_PHONE_ROUTE : '',
      identityRoute: typeof env.VITE_API_IDENTITY_ROUTE === 'string' ? env.VITE_API_IDENTITY_ROUTE : '',
      queryParameter: typeof env.VITE_API_QUERY_PARAMETER === 'string' ? env.VITE_API_QUERY_PARAMETER : '',
      timeoutMs: Number(env.VITE_API_TIMEOUT_MS) || 8000,
    },
  }
}
