import assert from 'node:assert/strict'
import { getEventListeners } from 'node:events'
import { readFile } from 'node:fs/promises'
import { setImmediate, setTimeout as delay } from 'node:timers/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/api.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
})
const moduleSource = outputText
  .replaceAll('import.meta.env.DEV', 'false')
  .replaceAll('import.meta.env.VITE_API_BASE_URL', JSON.stringify('https://api.example.test'))
const { serverApis, ApiError } = await import('data:text/javascript;base64,' + Buffer.from(moduleSource).toString('base64'))
const offersOptions = { query: 'test', page: 0, size: 8 }

function stalledResponse(signal) {
  return new Response(new ReadableStream({
    start(controller) {
      // The server has sent headers and the beginning of valid JSON, but stalls before completing it.
      controller.enqueue(new TextEncoder().encode('{"items":'))
      signal.addEventListener('abort', () => controller.error(signal.reason), { once: true })
    },
  }), { headers: { 'Content-Type': 'application/json' } })
}

async function bounded(promise) {
  const controller = new AbortController()
  try {
    return await Promise.race([
      promise,
      delay(200, undefined, { signal: controller.signal }).then(() => { throw new Error('Request stayed pending after its timeout') }),
    ])
  } finally {
    controller.abort()
  }
}

test('a timeout includes the response body, even after successful HTTP headers', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  t.mock.method(globalThis, 'fetch', async (_url, options) => stalledResponse(options.signal))
  const request = serverApis.elder.offers(offersOptions)
  await setImmediate()
  t.mock.timers.tick(5001)
  await assert.rejects(bounded(request), (error) => error instanceof ApiError)
})

test('an already aborted search does not start a network request', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => Response.json({ items: [] }))
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(serverApis.elder.offers(offersOptions, controller.signal), { name: 'AbortError' })
  assert.equal(fetchMock.mock.callCount(), 0)
})

test('completed requests remove their cancellation listeners', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ items: [], totalElements: 0 }))
  const controller = new AbortController()
  for (let index = 0; index < 12; index++) {
    await serverApis.elder.offers(offersOptions, controller.signal)
  }
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0)
})


test('switching searches cancels a response whose headers have already arrived', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, options) => stalledResponse(options.signal))
  const controller = new AbortController()
  const request = serverApis.elder.offers(offersOptions, controller.signal)
  await setImmediate()
  controller.abort()
  await assert.rejects(bounded(request), { name: 'AbortError' })
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0)
})

test('a timeout before headers does not leave an active request or abort listener', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let requestSignal
  t.mock.method(globalThis, 'fetch', (_url, options) => {
    requestSignal = options.signal
    return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true }))
  })
  const controller = new AbortController()
  const request = serverApis.elder.offers(offersOptions, controller.signal)
  t.mock.timers.tick(5001)
  await assert.rejects(bounded(request), (error) => error instanceof ApiError)
  assert.equal(requestSignal.aborted, true)
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0)
})

test('normal searches continue working after a stalled response times out', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let first = true
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    if (first) { first = false; return stalledResponse(options.signal) }
    return Response.json({ items: [{ vnum: 10 }], totalElements: 1 })
  })
  const request = serverApis.elder.offers(offersOptions)
  await setImmediate()
  t.mock.timers.tick(5001)
  await assert.rejects(bounded(request), (error) => error instanceof ApiError)
  const response = await serverApis.elder.offers(offersOptions)
  assert.equal(response.totalElements, 1)
  assert.equal(response.items[0].vnum, 10)
})

test('HTTP errors retain their status and user-facing message', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('Unavailable', { status: 503 }))
  await assert.rejects(serverApis.elder.offers(offersOptions), (error) => error instanceof ApiError && error.status === 503)
})

test('malformed JSON reports an API error instead of remaining in loading state', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('invalid JSON'))
  await assert.rejects(serverApis.elder.offers(offersOptions), (error) => error instanceof ApiError && /nieprawidłową/.test(error.message))
})


test('only offers carry explicitly provided operation tokens; retries reuse them', async (t) => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url, headers: options.headers }); return Response.json({ items: [] }) })
  const options = { ...offersOptions, requestId: 'request-token', searchId: 'search-token' }
  await serverApis.pandora.offers(options)
  await serverApis.pandora.offers(options)
  await serverApis.pandora.suggestions('miecz')
  await serverApis.pandora.statistics([180])
  assert.equal(calls[0].headers['X-Catalog-Request'], 'request-token')
  assert.equal(calls[0].headers['X-Catalog-Search'], 'search-token')
  assert.deepEqual(calls[0].headers, calls[1].headers)
  assert.equal(calls[2].headers['X-Catalog-Search'], undefined)
  assert.equal(calls[3].headers['X-Catalog-Request'], undefined)
})

test('unmarked initial API call does not claim a user search', async (t) => {
  let headers
  t.mock.method(globalThis, 'fetch', async (_url, options) => { headers = options.headers; return Response.json({ items: [] }) })
  await serverApis.pandora.offers({ ...offersOptions, requestId: 'initial-request' })
  assert.equal(headers['X-Catalog-Request'], 'initial-request')
  assert.equal(headers['X-Catalog-Search'], undefined)
})


test('overview requests are server-specific and do not claim a search', async (t) => {
  const calls = []
  const payload = { scanId: 7, scanEndedAt: '2026-10-04T16:48:57Z', observedShopCount: 479,
    items: [{ vnum: 30070, itemName: 'Futro Wilka+', shopCount: 101, totalQuantity: 188, minimumPrice: 999 }] }
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, headers: options.headers })
    return Response.json(payload)
  })
  for (const server of ['beavium', 'elder', 'pandora']) {
    assert.deepEqual(await serverApis[server].overview(), payload)
  }
  assert.deepEqual(calls.map(call => call.url), ['beavium', 'elder', 'pandora']
    .map(server => `https://api.example.test/api/v1/servers/${server}/items/overview?limit=8&sort=shops`))
  for (const call of calls) {
    assert.equal(call.headers['X-Catalog-Search'], undefined)
    assert.equal(call.headers['X-Catalog-Request'], undefined)
  }
})

test('leaving overview cancels its pending response body', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, options) => stalledResponse(options.signal))
  const controller = new AbortController()
  const request = serverApis.beavium.overview(controller.signal)
  await setImmediate()
  controller.abort()
  await assert.rejects(bounded(request), { name: 'AbortError' })
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0)
})


test('overview retries reuse their result token without sending a search token', async (t) => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    calls.push(options.headers)
    return Response.json({ scanId: null, scanEndedAt: null, observedShopCount: 0, items: [] })
  })
  await serverApis.beavium.overview(undefined, 'overview-operation')
  await serverApis.beavium.overview(undefined, 'overview-operation')
  assert.equal(calls[0]['X-Catalog-Request'], 'overview-operation')
  assert.equal(calls[0]['X-Catalog-Search'], undefined)
  assert.deepEqual(calls[0], calls[1])
})


test('quantity overview requests its own server-side ranking', async (t) => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, headers: options.headers })
    return Response.json({ items: [] })
  })
  await serverApis.beavium.overview(undefined, 'quantity-operation', 'quantity')
  assert.equal(calls[0].url, 'https://api.example.test/api/v1/servers/beavium/items/overview?limit=8&sort=quantity')
  assert.equal(calls[0].headers['X-Catalog-Request'], 'quantity-operation')
  assert.equal(calls[0].headers['X-Catalog-Search'], undefined)
})


test('offer sorting is sent to the API for every server and page', async (t) => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: new URL(url), headers: options.headers })
    return Response.json({ items: [], totalElements: 0 })
  })
  for (const server of ['pandora', 'elder', 'beavium']) {
    for (const sort of ['priceAsc', 'priceDesc', 'quantity']) {
      await serverApis[server].offers({ query: 'Medal', vnums: [50050], page: 2, size: 8, sort, requestId: 'sort-request' })
      const call = calls.at(-1)
      assert.equal(call.url.pathname, `/api/v1/servers/${server}/items`)
      assert.equal(call.url.searchParams.get('sort'), sort)
      assert.equal(call.url.searchParams.get('page'), '2')
      assert.equal(call.url.searchParams.get('size'), '8')
      assert.equal(call.url.searchParams.get('query'), 'Medal')
      assert.equal(call.url.searchParams.get('vnum'), '50050')
      assert.equal(call.headers['X-Catalog-Search'], undefined)
    }
  }
  await serverApis.beavium.offers(offersOptions)
  assert.equal(calls.at(-1).url.searchParams.get('sort'), 'priceAsc')
})


test('extra bonus filters and signed minimums are sent on every server without base-stat parameters', async () => {
  const previousFetch = globalThis.fetch
  const urls = []
  globalThis.fetch = async url => {
    urls.push(new URL(url, 'http://localhost'))
    return Response.json({ items: [], totalElements: 0 })
  }
  try {
    for (const api of Object.values(serverApis)) {
      await api.offers({ page: 2, size: 8, sort: 'priceDesc', query: 'Miecz', vnums: [180],
        bonuses: [{ type: 72, minimum: 40 }, { type: 71, minimum: -25 }, { type: 17 }] })
    }
    assert.equal(urls.length, 3)
    for (const url of urls) {
      assert.deepEqual(url.searchParams.getAll('bonus'), ['72:40', '71:-25', '17'])
      assert.equal(url.searchParams.get('page'), '2')
      assert.equal(url.searchParams.get('vnum'), '180')
      assert.equal(url.searchParams.get('sort'), 'priceDesc')
      assert.equal(url.searchParams.has('baseBonus'), false)
    }
    await serverApis.beavium.bonusOptions()
    assert.equal(urls.at(-1).pathname, '/api/v1/servers/beavium/items/bonus-options')
  } finally { globalThis.fetch = previousFetch }
})


test('category and inclusive level bounds combine with bonuses, including level zero', async () => {
  const previousFetch = globalThis.fetch
  const urls = []
  globalThis.fetch = async url => { urls.push(new URL(url)); return Response.json({ items: [] }) }
  try {
    for (const api of Object.values(serverApis)) {
      await api.offers({ page: 1, size: 8, bonuses: [{ type: 1, minimum: 1000 }],
        itemFilters: { category: 'necklaces', minLevel: 0, maxLevel: 75 } })
    }
    for (const url of urls) {
      assert.equal(url.searchParams.get('category'), 'necklaces')
      assert.equal(url.searchParams.get('minLevel'), '0')
      assert.equal(url.searchParams.get('maxLevel'), '75')
      assert.deepEqual(url.searchParams.getAll('bonus'), ['1:1000'])
      assert.equal(url.searchParams.get('page'), '1')
    }
    await serverApis.beavium.categoryOptions()
    assert.equal(urls.at(-1).pathname, '/api/v1/servers/beavium/items/category-options')
  } finally { globalThis.fetch = previousFetch }
})

test('map filters are applied server-side to every page and price statistics on all servers', async t => {
  const previous = globalThis.fetch; t.after(() => { globalThis.fetch = previous })
  const urls = []
  globalThis.fetch = async url => { urls.push(new URL(url)); return new Response(JSON.stringify({ items: [] })) }
  for (const server of ['pandora', 'elder', 'beavium']) {
    await serverApis[server].offers({ page: 3, size: 8, maps: ['metin2_map_a1', 'metin2_map_c1'], bonuses: [{ type: 11, minimum: 20 }] })
    await serverApis[server].statistics([180], undefined, ['metin2_map_a1'])
    await serverApis[server].mapOptions()
  }
  for (let i = 0; i < urls.length; i += 3) {
    assert.deepEqual(urls[i].searchParams.getAll('map'), ['metin2_map_a1', 'metin2_map_c1'])
    assert.equal(urls[i].searchParams.get('page'), '3')
    assert.equal(urls[i].searchParams.get('bonus'), '11:20')
    assert.deepEqual(urls[i + 1].searchParams.getAll('map'), ['metin2_map_a1'])
    assert.ok(urls[i + 2].pathname.endsWith('/map-options'))
  }
})
