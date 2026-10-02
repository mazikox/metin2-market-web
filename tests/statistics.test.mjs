import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('small sample threshold is consistently configured as 10 across aside and analytics', async () => {
  const asideContent = await readFile(new URL('../src/components/MarketAside.tsx', import.meta.url), 'utf8')
  const analyticsContent = await readFile(new URL('../src/components/MarketAnalytics.tsx', import.meta.url), 'utf8')

  const asideMatch = asideContent.match(/export const SMALL_SAMPLE_THRESHOLD = (\d+)/)
  const analyticsMatch = analyticsContent.match(/export const SMALL_SAMPLE_THRESHOLD = (\d+)/)

  assert.ok(asideMatch, 'Aside should export SMALL_SAMPLE_THRESHOLD')
  assert.ok(analyticsMatch, 'Analytics should export SMALL_SAMPLE_THRESHOLD')
  assert.equal(Number(asideMatch[1]), 10, 'Aside small sample threshold must be 10')
  assert.equal(Number(analyticsMatch[1]), 10, 'Analytics small sample threshold must be 10')
})

test('enriched statistics payload structure matches expected domain model with totalPriceLevelCount', async () => {
  const sampleStat = {
    vnum: 189,
    itemName: 'Zatruty Miecz+9',
    minimumPrice: 800000,
    meanPrice: 1050000,
    trimmedMeanPrice: 980000,
    medianPrice: 950000,
    contributingShopCount: 15,
    rawOfferCount: 22,
    totalQuantity: 28,
    totalPriceLevelCount: 18,
    percentiles: {
      p10: 800000,
      p20: 820000,
      p25: 840000,
      p50: 950000,
      p75: 1100000,
      p90: 1400000,
    },
    buyerReference: {
      percentile: 20,
      price: 820000,
      shopsAtOrBelow: 3,
      quantityAtOrBelow: 5,
    },
    relativeIqr: 0.2736,
    outliers: {
      lowerCount: 0,
      upperCount: 1,
      totalCount: 1,
    },
    histogram: [
      { fromPrice: 800000, toPrice: 900000, shopCount: 7 },
      { fromPrice: 900000, toPrice: 1100000, shopCount: 5 },
      { fromPrice: 1100000, toPrice: 1400000, shopCount: 3 },
    ],
    depth: [
      { price: 800000, quantityAtPrice: 2, cumulativeQuantity: 2, shopCountAtPrice: 2, cumulativeShopCount: 2 },
      { price: 820000, quantityAtPrice: 3, cumulativeQuantity: 5, shopCountAtPrice: 1, cumulativeShopCount: 3 },
      { price: 950000, quantityAtPrice: 10, cumulativeQuantity: 15, shopCountAtPrice: 6, cumulativeShopCount: 9 },
    ],
  }

  assert.equal(sampleStat.buyerReference.price, sampleStat.percentiles.p20)
  assert.ok(sampleStat.buyerReference.shopsAtOrBelow <= sampleStat.contributingShopCount)
  assert.ok(sampleStat.buyerReference.quantityAtOrBelow <= sampleStat.totalQuantity)
  assert.equal(sampleStat.depth[sampleStat.depth.length - 1].cumulativeQuantity, 15)
  assert.equal(sampleStat.totalPriceLevelCount, 18)
})

test('ambiguous multi-item upgrade family selection does not show detailed analytics button without choosing specific level', async () => {
  const asideContent = await readFile(new URL('../src/components/MarketAside.tsx', import.meta.url), 'utf8')
  assert.match(
    asideContent,
    /isFamilyMultiSelection\s*=\s*Boolean\(isUpgradeFamily\s*&&\s*familyStats\s*&&\s*familyStats\.length\s*>\s*1\)/,
    'MarketAside must identify ambiguous upgrade family multi-selection'
  )
  assert.match(
    asideContent,
    /hasAnalyticsData\s*=\s*Boolean\(stat\s*&&\s*!isFamilyMultiSelection\)/,
    'hasAnalyticsData must be false when multi-selection is active without a concrete stat'
  )

  const appContent = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(
    appContent,
    /stat=\{stat\s*\|\|\s*\(familyStats\s*&&\s*familyStats\[0\]\)\s*\|\|\s*null\}/,
    'App.tsx must not use fallback to familyStats[0] for AnalyticsDrawer'
  )
  assert.match(
    appContent,
    /isOpen=\{isAnalyticsOpen\s*&&\s*stat\s*!=\s*null\}/,
    'AnalyticsDrawer must only be open when stat is not null'
  )
})
