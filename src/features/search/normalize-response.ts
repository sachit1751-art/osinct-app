import { SearchError, type SearchRecord } from './search.types.ts'

const MAX_RECORDS = 100
const MAX_FIELD_LENGTH = 500

function safeString(value: unknown, field: string, maxLength = MAX_FIELD_LENGTH): string {
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new SearchError('invalid_response', `The service returned an invalid ${field} field.`, { retryable: false })
  }
  return value
}

function normalizeRecord(value: unknown, index: number): SearchRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SearchError('invalid_response', `The service returned an invalid record at position ${index + 1}.`)
  }
  const record = value as Record<string, unknown>
  return {
    id: safeString(record.id, 'record identifier', 100),
    title: safeString(record.title, 'title'),
    category: safeString(record.category, 'category'),
    status: safeString(record.status, 'status', 80),
    updatedAt: safeString(record.updatedAt, 'updated date', 100),
    description: safeString(record.description, 'description'),
    owner: safeString(record.owner, 'owner', 160),
    region: safeString(record.region, 'region', 160),
  }
}

/** Canonical proxy contract: { "records": SearchRecord[] }. This is not inferred from the legacy API. */
export function normalizeResponse(value: unknown): SearchRecord[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SearchError('invalid_response', 'The service response was not a JSON object.')
  }
  const records = (value as Record<string, unknown>).records
  if (!Array.isArray(records) || records.length > MAX_RECORDS) {
    throw new SearchError('invalid_response', 'The service response did not contain a valid records list.')
  }
  return records.map(normalizeRecord)
}
