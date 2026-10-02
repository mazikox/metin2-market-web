import assert from 'node:assert/strict'

const BASE_URL = (process.env.SMOKE_BASE_URL || process.argv[2] || 'https://metin2bazar.pl').replace(/\/+$/, '')
const MIRROR_URL = process.env.SMOKE_MIRROR_URL || 'https://metin2market.mazikox.pl'

const HTML_TEST_CASES = [
  // 1. Landing & individual markets
  {
    path: '/',
    expectedStatus: 200,
    expectedTitle: 'Metin2 Bazar | ceny i oferty z rynków Metin2',
    expectedCanonical: `${BASE_URL}/`,
    expectedH1: 'Wybierz serwer Metin2',
    expectedLinks: ['/?server=pandora', '/?server=elder', '/?server=beavium'],
  },
  {
    path: '/?server=pandora',
    expectedStatus: 200,
    expectedTitle: 'Rynek Metin2 Pandora | Metin2 Bazar',
    expectedCanonical: `${BASE_URL}/?server=pandora`,
    expectedH1: 'Rynek Metin2 Pandora',
    expectedLinks: ['/?server=pandora', '/?server=elder', '/?server=beavium'],
  },
  {
    path: '/?server=elder',
    expectedStatus: 200,
    expectedTitle: 'Rynek Metin2 Elder | Metin2 Bazar',
    expectedCanonical: `${BASE_URL}/?server=elder`,
    expectedH1: 'Rynek Metin2 Elder',
    expectedLinks: ['/?server=pandora', '/?server=elder', '/?server=beavium'],
  },
  {
    path: '/?server=beavium',
    expectedStatus: 200,
    expectedTitle: 'Rynek Metin2 Beavium | Metin2 Bazar',
    expectedCanonical: `${BASE_URL}/?server=beavium`,
    expectedH1: 'Rynek Metin2 Beavium',
    expectedLinks: ['/?server=pandora', '/?server=elder', '/?server=beavium'],
  },
  {
    path: '/?server=unknown',
    expectedStatus: 200,
    expectedTitle: 'Metin2 Bazar | ceny i oferty z rynków Metin2',
    expectedCanonical: `${BASE_URL}/`,
    expectedH1: 'Wybierz serwer Metin2',
    expectedLinks: ['/?server=pandora', '/?server=elder', '/?server=beavium'],
  },

  // 2. Repeated server= query parameters (first parameter decides)
  {
    path: '/?server=pandora&server=elder',
    expectedStatus: 200,
    expectedTitle: 'Rynek Metin2 Pandora | Metin2 Bazar',
    expectedCanonical: `${BASE_URL}/?server=pandora`,
    expectedH1: 'Rynek Metin2 Pandora',
  },
  {
    path: '/?server=elder&server=pandora',
    expectedStatus: 200,
    expectedTitle: 'Rynek Metin2 Elder | Metin2 Bazar',
    expectedCanonical: `${BASE_URL}/?server=elder`,
    expectedH1: 'Rynek Metin2 Elder',
  },
  {
    path: '/?server=unknown&server=pandora',
    expectedStatus: 200,
    expectedTitle: 'Metin2 Bazar | ceny i oferty z rynków Metin2',
    expectedCanonical: `${BASE_URL}/`,
    expectedH1: 'Wybierz serwer Metin2',
  },
  {
    path: '/?server=&server=elder',
    expectedStatus: 200,
    expectedTitle: 'Metin2 Bazar | ceny i oferty z rynków Metin2',
    expectedCanonical: `${BASE_URL}/`,
    expectedH1: 'Wybierz serwer Metin2',
  },
  {
    path: '/?server=beavium&server=unknown',
    expectedStatus: 200,
    expectedTitle: 'Rynek Metin2 Beavium | Metin2 Bazar',
    expectedCanonical: `${BASE_URL}/?server=beavium`,
    expectedH1: 'Rynek Metin2 Beavium',
  },

  // 3. Error routes (404)
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
  console.log(`Running extended SEO & routing smoke tests against: ${BASE_URL}\n`)
  let hasFailure = false

  console.log(
    '| %s | %s | %s | %s | %s |',
    'Path'.padEnd(35),
    'Status'.padEnd(6),
    'Canonical Count'.padEnd(15),
    'Canonical'.padEnd(42),
    'Title'.padEnd(42)
  )
  console.log('|-%s-|-%s-|-%s-|-%s-|-%s-|', '-'.repeat(35), '-'.repeat(6), '-'.repeat(15), '-'.repeat(42), '-'.repeat(42))

  for (const tc of HTML_TEST_CASES) {
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

      const h1Match = body.match(/<h1[^>]*>([^<]*)<\/h1>/i)
      const h1 = h1Match ? h1Match[1].trim() : ''

      const canonicalMatches = [...body.matchAll(/<link[^>]+rel=["']canonical["'][^>]*>/gi)]
      const canonicalCount = canonicalMatches.length
      let canonicalHref = ''
      if (canonicalCount > 0) {
        const hrefMatch = canonicalMatches[0][0].match(/href=["']([^"']+)["']/i)
        canonicalHref = hrefMatch ? hrefMatch[1] : ''
      }

      console.log(
        '| %s | %s | %s | %s | %s |',
        tc.path.padEnd(35),
        String(status).padEnd(6),
        String(canonicalCount).padEnd(15),
        canonicalHref.slice(0, 42).padEnd(42),
        title.slice(0, 42).padEnd(42)
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
        if (body.includes('noindex')) {
          console.error(`  [FAIL] ${tc.path}: Page contains noindex!`)
          hasFailure = true
        }
        if (tc.expectedH1 && h1 !== tc.expectedH1) {
          console.error(`  [FAIL] ${tc.path}: Expected H1 "${tc.expectedH1}", got "${h1}"`)
          hasFailure = true
        }
        if (tc.expectedLinks) {
          for (const link of tc.expectedLinks) {
            const linkRegex = new RegExp(`href=["']${link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`)
            if (!linkRegex.test(body)) {
              console.error(`  [FAIL] ${tc.path}: Missing expected HTML link to ${link}`)
              hasFailure = true
            }
          }
        }
      }
    } catch (err) {
      console.error(`  [ERROR] ${tc.path}: Fetch failed: ${err.message}`)
      hasFailure = true
    }
  }

  console.log('\n--- Technical SEO Smoke Tests ---\n')

  // 4. robots.txt
  try {
    const robotsResp = await fetch(`${BASE_URL}/robots.txt`)
    const robotsText = await robotsResp.text()
    assert.equal(robotsResp.status, 200, 'robots.txt must return 200')
    assert.match(robotsText, /User-agent:\s*\*/i, 'robots.txt must contain User-agent: *')
    assert.match(robotsText, /Allow:\s*\//i, 'robots.txt must allow crawling')
    assert.match(robotsText, new RegExp(`Sitemap:\\s*${BASE_URL}/sitemap\\.xml`, 'i'), 'robots.txt must specify Sitemap')
    console.log('✓ robots.txt: HTTP 200, crawling allowed, sitemap linked correctly')
  } catch (err) {
    console.error(`✗ robots.txt failed: ${err.message}`)
    hasFailure = true
  }

  // 5. sitemap.xml
  try {
    const sitemapResp = await fetch(`${BASE_URL}/sitemap.xml`)
    const sitemapText = await sitemapResp.text()
    assert.equal(sitemapResp.status, 200, 'sitemap.xml must return 200')
    assert.match(sitemapText, new RegExp(`<loc>${BASE_URL}/<\/loc>`), 'sitemap must have /')
    assert.match(sitemapText, new RegExp(`<loc>${BASE_URL}/\\?server=pandora<\/loc>`), 'sitemap must have /?server=pandora')
    assert.match(sitemapText, new RegExp(`<loc>${BASE_URL}/\\?server=elder<\/loc>`), 'sitemap must have /?server=elder')
    assert.match(sitemapText, new RegExp(`<loc>${BASE_URL}/\\?server=beavium<\/loc>`), 'sitemap must have /?server=beavium')
    assert.match(sitemapText, new RegExp(`<loc>${BASE_URL}/o-projekcie/<\/loc>`), 'sitemap must have /o-projekcie/')
    assert.match(sitemapText, new RegExp(`<loc>${BASE_URL}/jak-korzystac/<\/loc>`), 'sitemap must have /jak-korzystac/')
    assert.match(sitemapText, new RegExp(`<loc>${BASE_URL}/dane-w-przegladarce/<\/loc>`), 'sitemap must have /dane-w-przegladarce/')
    assert.doesNotMatch(sitemapText, /server-.*\.html/, 'sitemap must not contain server-*.html')
    assert.doesNotMatch(sitemapText, /<loc>[^<]*\/elder\/?<\/loc>/, 'sitemap must not contain /elder')
    assert.doesNotMatch(sitemapText, /<loc>[^<]*\/beavium\/?<\/loc>/, 'sitemap must not contain /beavium')
    const locCount = (sitemapText.match(/<loc>/g) || []).length
    assert.equal(locCount, 7, `sitemap must contain exactly 7 URLs, found ${locCount}`)
    console.log('✓ sitemap.xml: HTTP 200, contains exactly 7 target URLs, excludes internal html and path routes')
  } catch (err) {
    console.error(`✗ sitemap.xml failed: ${err.message}`)
    hasFailure = true
  }

  // 6. www permanent redirect
  try {
    const wwwUrl = BASE_URL.replace('://', '://www.') + '/?server=elder'
    const wwwResp = await fetch(wwwUrl, { redirect: 'manual' })
    assert.ok(
      wwwResp.status === 301 || wwwResp.status === 308,
      `www redirect must be 301 or 308, got ${wwwResp.status}`
    )
    const location = wwwResp.headers.get('location')
    assert.equal(
      location,
      `${BASE_URL}/?server=elder`,
      `www redirect must preserve path and query string to ${BASE_URL}/?server=elder, got ${location}`
    )
    console.log('✓ www redirect: HTTP 308 permanent redirect preserves path and query string')
  } catch (err) {
    console.error(`✗ www redirect failed: ${err.message}`)
    hasFailure = true
  }

  // 7. Mirror domain noindex check
  try {
    const mirrorResp = await fetch(`${MIRROR_URL}/?server=pandora`, { redirect: 'manual' })
    const xRobots = mirrorResp.headers.get('x-robots-tag') || ''
    assert.match(xRobots, /noindex/i, 'mirror domain must send X-Robots-Tag: noindex')
    console.log(`✓ mirror domain (${MIRROR_URL}): retains X-Robots-Tag: noindex`)
  } catch (err) {
    console.error(`✗ mirror check failed: ${err.message}`)
    hasFailure = true
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
