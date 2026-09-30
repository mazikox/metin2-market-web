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
