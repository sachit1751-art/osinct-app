export type SearchMode = 'phone' | 'identity'

export type SearchRecord = {
  id: string
  title: string
  category: string
  status: string
  updatedAt: string
  description: string
  owner: string
  region: string
}

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; mode: SearchMode }
  | { status: 'success'; records: SearchRecord[]; mode: SearchMode; query: string }
  | { status: 'empty'; mode: SearchMode; query: string }
  | { status: 'error'; message: string; retryable: boolean; mode: SearchMode; query: string; diagnostic?: string }

export type SearchErrorCode = 'invalid_input' | 'live_disabled' | 'timeout' | 'network' | 'http' | 'invalid_json' | 'invalid_response' | 'aborted'

export class SearchError extends Error {
  readonly code: SearchErrorCode
  readonly retryable: boolean
  readonly status?: number

  constructor(code: SearchErrorCode, message: string, options: { retryable?: boolean; status?: number } = {}) {
    super(message)
    this.name = 'SearchError'
    this.code = code
    this.retryable = options.retryable ?? false
    this.status = options.status
  }
}

export type HttpAdapterConfig = {
  enabled: boolean
  baseUrl: string
  phoneRoute: string
  identityRoute: string
  queryParameter: string
  timeoutMs: number
}

export type SearchServiceConfig = {
  adapter: 'mock' | 'http'
  http: HttpAdapterConfig
}
