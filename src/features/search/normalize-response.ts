import { SearchError } from './search.types.ts'

/** Validate that a successful response is JSON-serializable without imposing an app-specific schema. */
export function normalizeResponse(value: unknown): unknown {
  if (value === undefined) {
    throw new SearchError('invalid_json', 'The search service returned no JSON response.')
  }
  try {
    const serialized = JSON.stringify(value)
    if (serialized === undefined || serialized.length > 1_000_000) {
      throw new SearchError('invalid_json', 'The search service response is too large to display.')
    }
  } catch (cause) {
    if (cause instanceof SearchError) throw cause
    throw new SearchError('invalid_json', 'The search service returned an unreadable JSON response.')
  }
  return value
}
