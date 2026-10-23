import type { SearchMode, SearchRecord } from './search.types.ts'

type DemoEntry = SearchRecord & { phoneSearchKey: string; identitySearchKey: string }

// Entirely fictional fixtures. Never replace these with scraped or leaked personal records.
const demoRecords: DemoEntry[] = [
  { id: 'DEMO-2048', title: 'Northstar relay', category: 'Infrastructure', status: 'Verified', updatedAt: '2026-10-20', description: 'Sample relay record in the northern service zone. This entry contains fictional operational data.', owner: 'Operations demo team', region: 'North zone', phoneSearchKey: '2025550101', identitySearchKey: 'DEMO-ID-0001' },
  { id: 'DEMO-7316', title: 'Cedar gateway', category: 'Network equipment', status: 'In review', updatedAt: '2026-10-18', description: 'Sample gateway record awaiting a routine configuration review.', owner: 'Network demo team', region: 'West zone', phoneSearchKey: '2025550102', identitySearchKey: 'DEMO-ID-0002' },
  { id: 'DEMO-0912', title: 'Harbor sensor', category: 'Monitoring', status: 'Verified', updatedAt: '2026-10-15', description: 'Sample environmental sensor with a fictional inspection record.', owner: 'Field demo team', region: 'Coastal zone', phoneSearchKey: '2025550103', identitySearchKey: 'DEMO-ID-0003' },
]

export async function searchMock(mode: SearchMode, query: string, signal?: AbortSignal): Promise<SearchRecord[]> {
  if (signal?.aborted) throw new DOMException('Search cancelled.', 'AbortError')
  const normalizedQuery = mode === 'phone' ? query.replace(/\D/g, '') : query.toLowerCase()
  const records = demoRecords.filter((record) => {
    const key = mode === 'phone' ? record.phoneSearchKey : record.identitySearchKey.toLowerCase()
    return key.includes(normalizedQuery) || record.id.toLowerCase() === normalizedQuery
  }).map(({ phoneSearchKey: _phone, identitySearchKey: _identity, ...record }) => record)
  return records
}
