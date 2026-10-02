import assert from 'node:assert/strict'

const BASE_URL = (process.env.SMOKE_BASE_URL || process.argv[2] || 'https://metin2bazar.pl').replace(/\/+$/, '')

const TEST_CASES = [
  {
    path: '/',
    expectedStatus: 200,
    expectedTitle: 'Metin2 Bazar | ceny i oferty z rynków Metin2',
    expectedCanonical: `${BASE_URL}/`,
  },
  {
    path: '/?server=pandora',
    expectedStatus: 200,
    expectedTitle: 'Rynek Metin2 Pandora | Metin2 Bazar',
    expectedCanonical: `${BASE_URL}/?server=pandora`,
  },
  {
    path: '/?server=elder',
    expectedStatus: 200,
    expectedTitle: 'Rynek Metin2 Elder | Metin2 Bazar',
    expectedCanonical: `${BASE_URL}/?server=elder`,
  },
  {
    path: '/?server=beavium',
    expectedStatus: 200,
    expectedTitle: 'Rynek Metin2 Beavium | Metin2 Bazar',
    expectedCanonical: `${BASE_URL}/?server=beavium`,
  },
  {
    path: '/?server=unknown',
    expectedStatus: 200,
    expectedTitle: 'Metin2 Bazar | ceny i oferty z rynków Metin2',
    expectedCanonical: `${BASE_URL}/`,
  },
  {
    path: '/elder',
    expectedStatus: 404,
  },
  {
    path: '/beavium',
    expectedStatus: 404,
  },
]

async function runSmokeTests() {
  console.log(`Running raw HTTP smoke tests against: ${BASE_URL}\n`)
  let hasFailure = false

  console.log(
    '| %s | %s | %s | %s | %s |',
    'Path'.padEnd(20),
    'Status'.padEnd(6),
    'Canonical Count'.padEnd(15),
    'Canonical'.padEnd(40),
    'Title'.padEnd(45)
  )
  console.log('|-%s-|-%s-|-%s-|-%s-|-%s-|', '-'.repeat(20), '-'.repeat(6), '-'.repeat(15), '-'.repeat(40), '-'.repeat(45))

  for (const tc of TEST_CASES) {
    const url = `${BASE_URL}${tc.path}`
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Metin2Bazar-SmokeTest/1.0' },
        redirect: 'manual',
      })
      const status = resp.status
      const body = await resp.text()

      const titleMatch = body.match(/<title>([^<]*)<\/title>/i)
      const title = titleMatch ? titleMatch[1].trim() : ''

      const canonicalMatches = [...body.matchAll(/<link[^>]+rel=["']canonical["'][^>]*>/gi)]
      const canonicalCount = canonicalMatches.length
      let canonicalHref = ''
      if (canonicalCount > 0) {
        const hrefMatch = canonicalMatches[0][0].match(/href=["']([^"']+)["']/i)
        canonicalHref = hrefMatch ? hrefMatch[1] : ''
      }

      console.log(
        '| %s | %s | %s | %s | %s |',
        tc.path.padEnd(20),
        String(status).padEnd(6),
        String(canonicalCount).padEnd(15),
        canonicalHref.slice(0, 40).padEnd(40),
        title.slice(0, 45).padEnd(45)
      )

      if (status !== tc.expectedStatus) {
        console.error(`  [FAIL] ${tc.path}: Expected HTTP ${tc.expectedStatus}, got ${status}`)
        hasFailure = true
        continue
      }

      if (tc.expectedStatus === 200) {
        if (canonicalCount !== 1) {
          console.error(`  [FAIL] ${tc.path}: Expected exactly 1 canonical, found ${canonicalCount}`)
          hasFailure = true
        }
        if (canonicalHref !== tc.expectedCanonical) {
          console.error(`  [FAIL] ${tc.path}: Expected canonical "${tc.expectedCanonical}", got "${canonicalHref}"`)
          hasFailure = true
        }
        if (tc.expectedTitle && title !== tc.expectedTitle) {
          console.error(`  [FAIL] ${tc.path}: Expected title "${tc.expectedTitle}", got "${title}"`)
          hasFailure = true
        }
      }
    } catch (err) {
      console.error(`  [ERROR] ${tc.path}: Fetch failed: ${err.message}`)
      hasFailure = true
    }
  }

  console.log()
  if (hasFailure) {
    console.error('Smoke tests FAILED!')
    process.exit(1)
  } else {
    console.log('All smoke tests PASSED!')
  }
}

runSmokeTests()
