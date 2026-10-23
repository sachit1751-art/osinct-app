import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSearchUrl, requestSearch } from '../src/features/search/api-client.ts'
import { normalizeResponse } from '../src/features/search/normalize-response.ts'
import { createSearchService, getSearchServiceConfig } from '../src/features/search/search.service.ts'
import { SearchError, type HttpAdapterConfig } from '../src/features/search/search.types.ts'
import { validateQuery } from '../src/features/search/search.validation.ts'

const config: HttpAdapterConfig = {
  enabled: true,
  baseUrl: 'https://api.example.test/v1/',
  route: 'search',
  queryParameter: 'q',
  timeoutMs: 1000,
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
}

test('query validation only trims and enforces a safe length', () => {
  assert.equal(validateQuery('  example query  '), 'example query')
  assert.throws(() => validateQuery('  '), /Enter a search value/)
  assert.throws(() => validateQuery('x'.repeat(501)), /500 characters/)
  assert.equal(validateQuery('letters & punctuation + symbols'), 'letters & punctuation + symbols')
})

test('builds a same-origin relative endpoint and encodes query values', () => {
  const url = buildSearchUrl(config, '+hello & world')
  assert.equal(url.href, 'https://api.example.test/v1/search?q=%2Bhello+%26+world')
  assert.throws(() => buildSearchUrl({ ...config, baseUrl: 'http://example.test' }, 'test'), /HTTPS/)
  assert.throws(() => buildSearchUrl({ ...config, route: 'https://other.example/steal' }, 'test'), /relative API route/)
  assert.throws(() => buildSearchUrl({ ...config, route: '../private' }, 'test'), /route is invalid/)
})

test('returns the API JSON response unchanged rather than enforcing invented fields', async () => {
  const payload = { status: 'ok', data: [{ name: 'Example', arbitrary: { nested: true } }], total: 1 }
  const result = await requestSearch(config, 'sample', { fetchImpl: async () => jsonResponse(payload) })
  assert.deepEqual(result, payload)
  assert.deepEqual(normalizeResponse([{ whatever: 1 }]), [{ whatever: 1 }])
  assert.deepEqual(normalizeResponse({ message: 'ok' }), { message: 'ok' })
  assert.deepEqual(normalizeResponse([]), [])
})

test('malformed JSON and oversized responses are rejected safely', async () => {
  await assert.rejects(requestSearch(config, 'sample', { fetchImpl: async () => new Response('{bad json') }), (error: unknown) => error instanceof SearchError && error.code === 'invalid_json')
  assert.throws(() => normalizeResponse('x'.repeat(1_000_001)), /too large/)
})

test('HTTP failures do not expose response bodies', async () => {
  await assert.rejects(requestSearch(config, 'sample', { fetchImpl: async () => new Response('secret backend detail', { status: 503 }) }), (error: unknown) => error instanceof SearchError && error.status === 503 && error.retryable && !error.message.includes('secret'))
  await assert.rejects(requestSearch(config, 'sample', { fetchImpl: async () => new Response('', { status: 403 }) }), (error: unknown) => error instanceof SearchError && error.status === 403 && !error.retryable)
})

test('timeout, network failures, and cancellation are handled', async () => {
  const quickTimeout = { ...config, timeoutMs: 100 }
  const neverResponds: typeof fetch = (_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  })
  await assert.rejects(requestSearch(quickTimeout, 'sample', { fetchImpl: neverResponds }), (error: unknown) => error instanceof SearchError && error.code === 'timeout' && error.retryable)
  await assert.rejects(requestSearch(config, 'sample', { fetchImpl: async () => { throw new TypeError('offline') } }), (error: unknown) => error instanceof SearchError && error.code === 'network')
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(requestSearch(config, 'sample', { signal: controller.signal }), (error: unknown) => error instanceof SearchError && error.code === 'aborted')
})

test('live requests remain disabled by default', async () => {
  const defaults = getSearchServiceConfig({})
  assert.equal(defaults.http.enabled, false)
  await assert.rejects(createSearchService(defaults).search('sample'), /API requests are disabled/)
})
