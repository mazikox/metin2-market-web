import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
const readJson = async (path) => JSON.parse((await readFile(new URL(path, import.meta.url), 'utf8')).replace(/^\uFEFF/, ''))
const site = await readJson('../src/site.json')
const pages = await readJson('../content/pages.json')
const indexable = site.indexable && !process.argv.includes('--noindex')
const escape = (value) => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]))
const brand = '<a href="/" class="brand" aria-label="Metin2 Bazar — rynek"><img src="/favicon.png" width="26" height="26" alt="">METIN2 <span>BAZAR</span></a>'
const footer = `<footer class="site-footer"><div class="shell footer-grid"><div class="footer-intro">${brand}<p>Ceny, bonusy i sklepy. Rynek Metin2 w jednym miejscu.</p><span class="footer-caption">Niezależny katalog dla graczy.</span></div>${site.footerGroups.map(group => `<nav aria-label="${escape(group.title)}"><h2>${escape(group.title)}</h2>${group.links.map(link => `<a href="${escape(link.href)}">${escape(link.label)}</a>`).join('')}</nav>`).join('')}</div><div class="shell footer-bottom"><span>© ${new Date().getFullYear()} ${escape(site.name)}</span><span>Oferty pochodzą ze skanów. Dostępność sprawdzisz w grze.</span></div></footer>`
function documentPage({title, description, path, content, noindex = false}) {
  noindex = noindex || !indexable
  return `<!doctype html>
<html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#0f1010"><title>${escape(title)} — ${escape(site.name)}</title><meta name="description" content="${escape(description)}">${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${site.url}${path}">`}<meta property="og:type" content="website"><meta property="og:locale" content="pl_PL"><meta property="og:site_name" content="${escape(site.name)}"><meta property="og:title" content="${escape(title)} — ${escape(site.name)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${site.url}${path}"><meta property="og:image" content="${site.url}/logo.png"><meta name="twitter:card" content="summary"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/png" href="/favicon.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="stylesheet" href="/site-shell.css"></head>
<body class="information-page"><a class="skip-link" href="#main-content">Przejdź do treści</a><header class="info-header"><div class="shell">${brand}<a class="back-to-market" href="/">Wróć do rynku <span aria-hidden="true">↗</span></a></div></header><main class="shell info-main" id="main-content" tabindex="-1">${content}</main>${footer}</body></html>`
}
for (const page of pages) {
  const sections = page.sections.map(section => {
    const body = section.paragraphs.map(p => `<p>${escape(p)}</p>`).join('') + (section.links || []).map(link => `<p><a href="${escape(link.href)}">${escape(link.label)}</a></p>`).join('') + (section.contactEmail ? `<p><a href="mailto:${escape(section.contactEmail)}">${escape(section.contactEmail)}</a></p>` : '')
    return section.collapsed
      ? `<details class="info-section privacy-disclosure" id="${escape(section.id)}"><summary><h2>${escape(section.title)}</h2></summary>${body}</details>`
      : `<section class="info-section" id="${escape(section.id)}"><h2>${escape(section.title)}</h2>${body}</section>`
  }).join('')
  const faq = page.faq ? `<section class="info-section faq" id="pytania"><h2>Pytania i odpowiedzi</h2>${page.faq.map(row => `<details><summary>${escape(row.question)}</summary><p>${escape(row.answer)}</p></details>`).join('')}</section>` : ''
  const contents = `<nav class="contents" aria-label="Na tej stronie">${page.sections.map(section => `<a href="#${escape(section.id)}">${escape(section.title)}</a>`).join('')}${page.faq ? '<a href="#pytania">Pytania i odpowiedzi</a>' : ''}</nav>`
  const content = `<div class="info-heading"><p class="eyebrow">${escape(page.eyebrow)}</p><h1>${escape(page.title)}</h1><p class="info-lead">${escape(page.intro)}</p>${page.updated ? `<p class="privacy-updated">Aktualizacja: ${escape(page.updated)}</p>` : ''} </div><div class="info-layout">${contents}<div>${sections}${faq}<a class="back-to-market" href="/">Przejdź do ofert <span aria-hidden="true">↗</span></a></div></div>`
  const directory = new URL(`../public/${page.slug}/`, import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(new URL('index.html', directory), documentPage({title:page.title, description:page.description, path:`/${page.slug}/`, content}))
}
await writeFile(new URL('../public/404.html', import.meta.url), documentPage({title:'Nie znaleziono strony', description:'Wróć do katalogu ofert Metin2 Bazar.', path:'/404.html', noindex:true, content:'<div class="info-heading"><p class="eyebrow">404 / Nie znaleziono strony</p><h1>Ten adres nie prowadzi do oferty.</h1><p class="info-lead">Sprawdź adres lub wróć do katalogu i wyszukaj przedmiot ponownie.</p><a class="back-to-market" href="/">Wróć do rynku ↗</a></div>'}))
// Keep crawling allowed so bots can read the noindex meta/header.
await writeFile(new URL('../public/robots.txt', import.meta.url), `User-agent: *\nAllow: /\n${indexable ? '\nSitemap: ' + site.url + '/sitemap.xml\n' : ''}`)
if (indexable) {
  await writeFile(new URL('../public/sitemap.xml', import.meta.url), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/?server=elder', '/?server=beavium', ...pages.map(page => `/${page.slug}/`)].map(path => `<url><loc>${escape(site.url + path)}</loc></url>`).join('')}</urlset>\n`)
} else {
  await rm(new URL('../public/sitemap.xml', import.meta.url), {force: true})
}
console.log(`Generated ${pages.length} information pages, 404 and robots.txt. Indexing: ${indexable ? 'enabled (sitemap generated)' : 'disabled (no sitemap)'}.`)
