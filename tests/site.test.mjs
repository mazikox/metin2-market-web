import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'

const serversSource = await readFile(new URL('../src/servers.ts', import.meta.url), 'utf8')
const { outputText: serversJs } = ts.transpileModule(serversSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
})
const { hasSelectedServer, getSelectedServer, getServerUrl, GAME_SERVERS } = await import(
  'data:text/javascript;base64,' + Buffer.from(serversJs).toString('base64')
)

test.before(() => {
  execFileSync(process.execPath, ['scripts/generate-site.mjs'])
})

test('generated privacy page describes daily pseudonyms and carries no consent or tracker', async () => {
  const page = await readFile('public/dane-w-przegladarce/index.html', 'utf8')
  assert.match(page, /Surowe IP nie trafia do bazy analytics/)
  assert.match(page, /Nie śledzimy ludzi pomiędzy dniami/)
  assert.doesNotMatch(page, /privacy-preferences|metrics\/|data-statistics-choice|Umami/)
})

test('generated information pages and 404 use "Wybierz serwer" for href="/" and do not contain old labels', async () => {
  const files = [
    'public/o-projekcie/index.html',
    'public/jak-korzystac/index.html',
    'public/dane-w-przegladarce/index.html',
    'public/404.html',
  ]
  for (const file of files) {
    const content = await readFile(file, 'utf8')
    assert.doesNotMatch(content, /Wróć do rynku/, `File ${file} should not contain "Wróć do rynku"`)
    assert.doesNotMatch(content, /Przejdź do ofert/, `File ${file} should not contain "Przejdź do ofert"`)
    assert.match(content, /Wybierz serwer/, `File ${file} should contain "Wybierz serwer"`)
  }
})

test('sitemap contains /, the 3 server query URLs, subpages and no /elder or /beavium path routes', async () => {
  const sitemap = await readFile('public/sitemap.xml', 'utf8')
  assert.match(sitemap, /<loc>https:\/\/metin2bazar\.pl\/<\/loc>/)
  assert.match(sitemap, /<loc>https:\/\/metin2bazar\.pl\/\?server=pandora<\/loc>/)
  assert.match(sitemap, /<loc>https:\/\/metin2bazar\.pl\/\?server=elder<\/loc>/)
  assert.match(sitemap, /<loc>https:\/\/metin2bazar\.pl\/\?server=beavium<\/loc>/)
  assert.match(sitemap, /<loc>https:\/\/metin2bazar\.pl\/o-projekcie\/<\/loc>/)
  assert.match(sitemap, /<loc>https:\/\/metin2bazar\.pl\/jak-korzystac\/<\/loc>/)
  assert.match(sitemap, /<loc>https:\/\/metin2bazar\.pl\/dane-w-przegladarce\/<\/loc>/)
  assert.doesNotMatch(sitemap, /<loc>https:\/\/metin2bazar\.pl\/elder\/?<\/loc>/)
  assert.doesNotMatch(sitemap, /<loc>https:\/\/metin2bazar\.pl\/beavium\/?<\/loc>/)
  const locs = sitemap.match(/<loc>/g) || []
  assert.equal(locs.length, 7, 'Sitemap should contain exactly 7 URLs')
})

test('anchors #pytania and #dane exist in jak-korzystac page', async () => {
  const content = await readFile('public/jak-korzystac/index.html', 'utf8')
  assert.match(content, /id="pytania"/, 'FAQ section must have id="pytania"')
  assert.match(content, /id="dane"/, 'Data section must have id="dane"')
})

test('server selection helper functions handle known, unknown, and empty server parameters', () => {
  const originalWindow = globalThis.window

  try {
    // 1. Missing server query
    globalThis.window = {
      location: new URL('https://metin2bazar.pl/'),
    }
    assert.equal(hasSelectedServer(), false, 'Missing server param should return false')
    assert.equal(getSelectedServer().id, 'pandora', 'Fallback default server is pandora')
    assert.equal(getServerUrl('pandora'), '/?server=pandora')
    assert.equal(getServerUrl('elder'), '/?server=elder')
    assert.equal(getServerUrl('beavium'), '/?server=beavium')

    // 2. Empty server query
    globalThis.window = {
      location: new URL('https://metin2bazar.pl/?server='),
    }
    assert.equal(hasSelectedServer(), false, 'Empty server param should return false')
    assert.equal(getServerUrl('elder'), '/?server=elder', 'Replaces empty server with elder')

    // 3. Unknown server query
    globalThis.window = {
      location: new URL('https://metin2bazar.pl/?server=unknown'),
    }
    assert.equal(hasSelectedServer(), false, 'Unknown server param should return false')
    assert.equal(getServerUrl('pandora'), '/?server=pandora', 'Replaces unknown server with pandora')

    // 4. Unknown server with extra query params
    globalThis.window = {
      location: new URL('https://metin2bazar.pl/?server=invalid&ref=test'),
    }
    assert.equal(hasSelectedServer(), false, 'Invalid server param should return false')
    assert.equal(getServerUrl('pandora'), '/?server=pandora&ref=test', 'Replaces invalid server param while keeping other params')

    // 5. Valid servers
    for (const s of GAME_SERVERS) {
      globalThis.window = {
        location: new URL(`https://metin2bazar.pl/?server=${s.id}`),
      }
      assert.equal(hasSelectedServer(), true, `Server ${s.id} should return true`)
      assert.equal(getSelectedServer().id, s.id, `Server ${s.id} should be selected`)
    }
  } finally {
    globalThis.window = originalWindow
  }
})

test('production build produces pre-rendered server HTML with exactly one canonical and consistent metadata', async () => {
  const countOccurrences = (str, regex) => (str.match(regex) || []).length

  const indexHtml = await readFile('dist/index.html', 'utf8')
  assert.equal(countOccurrences(indexHtml, /<link[^>]+rel=["']canonical["']/g), 1, 'index.html has 1 canonical')
  assert.match(indexHtml, /<link rel="canonical" href="https:\/\/metin2bazar\.pl\/" \/>/)
  assert.match(indexHtml, /<title>Metin2 Bazar \| ceny i oferty z rynków Metin2<\/title>/)
  assert.match(indexHtml, /<meta property="og:url" content="https:\/\/metin2bazar\.pl\/" \/>/)
  assert.doesNotMatch(indexHtml, /<meta[^>]+name=["']robots["'][^>]+content=["']noindex["']/)

  const servers = [
    { id: 'pandora', name: 'Pandora' },
    { id: 'elder', name: 'Elder' },
    { id: 'beavium', name: 'Beavium' },
  ]
  for (const s of servers) {
    const html = await readFile(`dist/server-${s.id}.html`, 'utf8')
    assert.equal(countOccurrences(html, /<link[^>]+rel=["']canonical["']/g), 1, `server-${s.id}.html has 1 canonical`)
    assert.match(html, new RegExp(`<link rel="canonical" href="https:\\/\\/metin2bazar\\.pl\\/\\?server=${s.id}" \\/>`))
    assert.match(html, new RegExp(`<title>Rynek Metin2 ${s.name} \\| Metin2 Bazar<\\/title>`))
    assert.match(html, new RegExp(`<meta property="og:url" content="https:\\/\\/metin2bazar\\.pl\\/\\?server=${s.id}" \\/>`))
    assert.match(html, new RegExp(`na serwerze ${s.name}`))
    assert.doesNotMatch(html, /<meta[^>]+name=["']robots["'][^>]+content=["']noindex["']/)
  }
})

test('--noindex flag excludes sitemap and removes it if previously generated', async () => {
  // First ensure sitemap is generated
  execFileSync(process.execPath, ['scripts/generate-site.mjs'])
  await access('public/sitemap.xml')

  // Run with --noindex
  execFileSync(process.execPath, ['scripts/generate-site.mjs', '--noindex'])
  let sitemapExists = true
  try {
    await access('public/sitemap.xml')
  } catch {
    sitemapExists = false
  }
  assert.equal(sitemapExists, false, 'sitemap.xml should be deleted in --noindex mode')

  const robots = await readFile('public/robots.txt', 'utf8')
  assert.doesNotMatch(robots, /Sitemap:/, 'robots.txt should not reference sitemap in --noindex mode')

  // Re-generate indexing version for production build
  execFileSync(process.execPath, ['scripts/generate-site.mjs'])
  await access('public/sitemap.xml')
})
