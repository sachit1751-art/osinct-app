import { SearchError } from './search.types.ts'

export function validateQuery(input: string): string {
  const query = input.trim()
  if (!query) throw new SearchError('invalid_input', 'Enter a search value.')
  if (query.length > 500) throw new SearchError('invalid_input', 'Keep the search value to 500 characters or fewer.')
  return query
}
