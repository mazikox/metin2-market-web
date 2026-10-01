import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

test('generated privacy page describes daily pseudonyms and carries no consent or tracker', async () => {
  execFileSync(process.execPath, ['scripts/generate-site.mjs'])
  const page = await readFile('public/dane-w-przegladarce/index.html', 'utf8')
  assert.match(page, /Surowe IP nie trafia do bazy analytics/)
  assert.match(page, /Nie śledzimy ludzi pomiędzy dniami/)
  assert.doesNotMatch(page, /privacy-preferences|metrics\/|data-statistics-choice|Umami/)
})
