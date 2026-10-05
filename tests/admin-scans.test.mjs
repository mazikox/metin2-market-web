import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'
const { outputText } = ts.transpileModule(await readFile(new URL('../src/adminScansApi.ts',import.meta.url),'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } })
const { fetchAdminScans } = await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'))
test('admin scan selections use existing same-origin login and explicit mutation header',async t => {
  const calls=[]
  const previous=globalThis.fetch; t.after(()=>{ globalThis.fetch=previous })
  globalThis.fetch=async (url,options)=>{ calls.push({url,options});return new Response(JSON.stringify({server:'beavium',maps:[]})) }
  const controller=new AbortController()
  await fetchAdminScans('beavium',controller.signal)
  const maps=[{mapId:'metin2_map_a1',enabled:false,selectedScanId:null},{mapId:'metin2_map_b1',enabled:true,selectedScanId:42}]
  await fetchAdminScans('beavium',controller.signal,maps)
  assert.equal(calls[0].options.method,'GET')
  assert.equal(calls[0].options.credentials,'same-origin')
  assert.equal(calls[0].options.cache,'no-store')
  assert.equal(calls[1].url,'/backend/api/v1/admin/servers/beavium/scans')
  assert.equal(calls[1].options.method,'PUT')
  assert.equal(calls[1].options.headers['X-Admin-Action'],'scan-selection')
  assert.deepEqual(JSON.parse(calls[1].options.body),{maps})
  assert.equal(calls[1].options.signal,controller.signal)
  assert.ok(!JSON.stringify(calls).includes('Scanner-Token'))
})
test('admin scan authentication and stale selections are reported as actionable errors',async t=>{
 const previous=globalThis.fetch;t.after(()=>{globalThis.fetch=previous})
 for (const [status,message] of [[401,/Zaloguj/],[409,/Odśwież/],[403,/uprawnień/]]) {
  globalThis.fetch=async()=>new Response('{}',{status})
  await assert.rejects(fetchAdminScans('elder',new AbortController().signal),message)
 }
})
