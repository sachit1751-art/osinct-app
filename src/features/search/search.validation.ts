import { SearchError, type SearchMode } from './search.types.ts'

const PHONE_ALLOWED = /^[+\d().\s-]+$/
const IDENTITY_ALLOWED = /^[A-Za-z0-9][A-Za-z0-9_-]{2,79}$/

export function validateQuery(mode: SearchMode, input: string): string {
  const query = input.trim()
  if (!query) throw new SearchError('invalid_input', 'Enter a value to search.', { retryable: false })
  if (query.length > 80) throw new SearchError('invalid_input', 'Keep the search value to 80 characters or fewer.', { retryable: false })

  if (mode === 'phone') {
    const digits = query.replace(/\D/g, '')
    if (!PHONE_ALLOWED.test(query) || digits.length < 7 || digits.length > 15) {
      throw new SearchError('invalid_input', 'Enter a phone number using 7–15 digits. Spaces, +, parentheses, dots, and hyphens are allowed.', { retryable: false })
    }
  } else if (!IDENTITY_ALLOWED.test(query)) {
    throw new SearchError('invalid_input', 'Use a demo reference with 3–80 letters, numbers, hyphens, or underscores.', { retryable: false })
  }

  return query
}
