export type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; response: unknown; query: string }
  | { status: 'empty'; query: string }
  | { status: 'error'; message: string; retryable: boolean; query: string; diagnostic?: string }

export type SearchErrorCode = 'invalid_input' | 'live_disabled' | 'timeout' | 'network' | 'http' | 'invalid_json' | 'aborted'

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
  route: string
  queryParameter: string
  timeoutMs: number
}

export type SearchServiceConfig = {
  http: HttpAdapterConfig
}
