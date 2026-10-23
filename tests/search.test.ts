import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildSearchUrl, requestSearch } from '../src/features/search/api-client.ts'
import { normalizeResponse } from '../src/features/search/normalize-response.ts'
import { searchMock } from '../src/features/search/mock-adapter.ts'
import { createSearchService, getSearchServiceConfig } from '../src/features/search/search.service.ts'
import { SearchError, type HttpAdapterConfig, type SearchRecord } from '../src/features/search/search.types.ts'
import { validateQuery } from '../src/features/search/search.validation.ts'

const httpConfig: HttpAdapterConfig = {
  enabled: true,
  baseUrl: 'https://proxy.example.test/api/',
  phoneRoute: 'search/phone',
  identityRoute: '/search/identity',
  queryParameter: 'query',
  timeoutMs: 1000,
}

const validRecord: SearchRecord = {
  id: 'DEMO-1', title: 'Fictional sample', category: 'Demo', status: 'Verified',
  updatedAt: '2026-10-20', description: 'Synthetic fixture', owner: 'Demo team', region: 'Test region',
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
}

test('validates phone and identity modes independently', () => {
  assert.equal(validateQuery('phone', ' 202-555-0101 '), '202-555-0101')
  assert.equal(validateQuery('identity', 'DEMO-ID-0001'), 'DEMO-ID-0001')
  assert.throws(() => validateQuery('phone', 'call me'), (error: unknown) => error instanceof SearchError && error.code === 'invalid_input')
  assert.throws(() => validateQuery('phone', '123'), /phone number/)
  assert.throws(() => validateQuery('identity', '<script>alert(1)</script>'), (error: unknown) => error instanceof SearchError && error.code === 'invalid_input')
  assert.throws(() => validateQuery('identity', 'x'.repeat(81)), /80 characters/)
  assert.throws(() => validateQuery('identity', '  '), /Enter a value/)
})

test('constructs URLs with a configured route and safely encodes query values', () => {
  const url = buildSearchUrl(httpConfig, 'phone', '+1 (202) 555-0101 & test')
  assert.equal(url.origin, 'https://proxy.example.test')
  assert.equal(url.pathname, '/api/search/phone')
  assert.equal(url.searchParams.get('query'), '+1 (202) 555-0101 & test')
  const identityUrl = buildSearchUrl(httpConfig, 'identity', 'DEMO-ID-0001')
  assert.equal(identityUrl.pathname, '/api/search/identity')
  assert.throws(() => buildSearchUrl({ ...httpConfig, baseUrl: 'http://example.test' }, 'phone', '1234567'), /HTTPS/)
  assert.throws(() => buildSearchUrl({ ...httpConfig, phoneRoute: 'https://other.example/steal' }, 'phone', '1234567'), /relative route/)
})

test('mock adapter returns deterministic results for both modes and empty searches', async () => {
  const phoneResults = await searchMock('phone', '202-555-0101')
  assert.equal(phoneResults.length, 1)
  assert.equal(phoneResults[0].id, 'DEMO-2048')
  const identityResults = await searchMock('identity', 'DEMO-ID-0002')
  assert.equal(identityResults.length, 1)
  assert.equal(identityResults[0].id, 'DEMO-7316')
  assert.deepEqual(await searchMock('identity', 'DEMO-ID-9999'), [])
})

test('normalizes success and empty canonical response payloads', () => {
  assert.deepEqual(normalizeResponse({ records: [validRecord] }), [validRecord])
  assert.deepEqual(normalizeResponse({ records: [] }), [])
})

test('rejects malformed payloads and invalid fields but treats hostile HTML as plain data', () => {
  assert.throws(() => normalizeResponse('<html>not json</html>'), (error: unknown) => error instanceof SearchError && error.code === 'invalid_response')
  assert.throws(() => normalizeResponse({}), /valid records list/)
  assert.throws(() => normalizeResponse({ records: [{ ...validRecord, id: 42 }] }), /invalid record identifier/)
  const hostile = '<img src=x onerror="alert(1)">'
  const normalized = normalizeResponse({ records: [{ ...validRecord, title: hostile }] })
  assert.equal(normalized[0].title, hostile)
  const markup = renderToStaticMarkup(createElement('p', null, normalized[0].title))
  assert.match(markup, /&lt;img/)
  assert.doesNotMatch(markup, /<img/)
})

test('HTTP adapter returns canonical records for both modes', async () => {
  const urls: URL[] = []
  const fetchImpl: typeof fetch = async (input) => {
    urls.push(new URL(String(input)))
    return jsonResponse({ records: [validRecord] })
  }
  const phone = await requestSearch(httpConfig, 'phone', '202-555-0101', { fetchImpl })
  const identity = await requestSearch(httpConfig, 'identity', 'DEMO-ID-0001', { fetchImpl })
  assert.equal(phone[0].id, 'DEMO-1')
  assert.equal(identity[0].id, 'DEMO-1')
  assert.equal(urls[0].pathname, '/api/search/phone')
  assert.equal(urls[1].pathname, '/api/search/identity')
})

test('HTTP status failures are mapped without exposing response bodies', async () => {
  await assert.rejects(requestSearch(httpConfig, 'phone', '202-555-0101', {
    fetchImpl: async () => new Response('sensitive backend details', { status: 503 }),
  }), (error: unknown) => error instanceof SearchError && error.code === 'http' && error.status === 503 && error.retryable && !error.message.includes('sensitive'))
  await assert.rejects(requestSearch(httpConfig, 'identity', 'DEMO-ID-0001', {
    fetchImpl: async () => new Response('', { status: 403 }),
  }), (error: unknown) => error instanceof SearchError && error.status === 403 && !error.retryable)
  for (const status of [400, 401, 429, 500]) {
    await assert.rejects(requestSearch(httpConfig, 'phone', '202-555-0101', {
      fetchImpl: async () => new Response('', { status }),
    }), (error: unknown) => error instanceof SearchError && error.status === status && error.retryable === (status === 429 || status === 500))
  }
})

test('malformed JSON and schema mismatch become controlled errors', async () => {
  await assert.rejects(requestSearch(httpConfig, 'phone', '202-555-0101', {
    fetchImpl: async () => new Response('{bad json', { status: 200 }),
  }), (error: unknown) => error instanceof SearchError && error.code === 'invalid_json')
  await assert.rejects(requestSearch(httpConfig, 'phone', '202-555-0101', {
    fetchImpl: async () => jsonResponse({ items: [validRecord] }),
  }), (error: unknown) => error instanceof SearchError && error.code === 'invalid_response')
})

test('timeout and network failures are distinct and retryable', async () => {
  const quickTimeout = { ...httpConfig, timeoutMs: 100 }
  const neverResponds: typeof fetch = (_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  })
  await assert.rejects(requestSearch(quickTimeout, 'phone', '202-555-0101', { fetchImpl: neverResponds }), (error: unknown) => error instanceof SearchError && error.code === 'timeout' && error.retryable)
  await assert.rejects(requestSearch(httpConfig, 'phone', '202-555-0101', {
    fetchImpl: async () => { throw new TypeError('offline') },
  }), (error: unknown) => error instanceof SearchError && error.code === 'network' && error.retryable)
})

test('aborts a pending request and never sends a request when live adapter is disabled', async () => {
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(requestSearch(httpConfig, 'phone', '202-555-0101', { signal: controller.signal }), (error: unknown) => error instanceof SearchError && error.code === 'aborted')
  await assert.rejects(requestSearch({ ...httpConfig, enabled: false }, 'phone', '202-555-0101'), (error: unknown) => error instanceof SearchError && error.code === 'live_disabled')
})

test('propagates cancellation of an in-flight request', async () => {
  const controller = new AbortController()
  const pendingFetch: typeof fetch = (_input, init) => new Promise((_resolve, reject) => {
    if (init?.signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    controller.abort()
  })
  await assert.rejects(requestSearch(httpConfig, 'phone', '202-555-0101', { signal: controller.signal, fetchImpl: pendingFetch }), (error: unknown) => error instanceof SearchError && error.code === 'aborted')
})

test('a failed request can be retried without changing mode or query', async () => {
  let attempts = 0
  const fetchImpl: typeof fetch = async () => {
    attempts += 1
    if (attempts === 1) throw new TypeError('temporary connection failure')
    return jsonResponse({ records: [validRecord] })
  }
  await assert.rejects(requestSearch(httpConfig, 'identity', 'DEMO-ID-0001', { fetchImpl }), (error: unknown) => error instanceof SearchError && error.retryable)
  const retryResult = await requestSearch(httpConfig, 'identity', 'DEMO-ID-0001', { fetchImpl })
  assert.equal(attempts, 2)
  assert.equal(retryResult[0].id, 'DEMO-1')
})

test('service defaults to mock and requires explicit opt-in for live mode', async () => {
  const defaults = getSearchServiceConfig({})
  assert.equal(defaults.adapter, 'mock')
  assert.equal(defaults.http.enabled, false)
  const service = createSearchService({ ...defaults, adapter: 'http' })
  await assert.rejects(service.search('phone', '202-555-0101'), /Live search is disabled/)
})
