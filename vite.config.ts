import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import pages from './content/pages.json'
import site from './src/site.json'

import fs from 'node:fs'
import path from 'node:path'

const GAME_SERVERS = [
  { id: 'pandora', name: 'Pandora' },
  { id: 'elder', name: 'Elder' },
  { id: 'beavium', name: 'Beavium' },
] as const

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderServerRoot(server: { id: string; name: string }) {
  return `<div id="root"><div class="market-shell"><header class="site-header"><div class="shell"><a href="/" class="brand">METIN2 <span>BAZAR</span></a><nav class="server-nav" aria-label="Wybierz rynek"><a href="/?server=pandora"${server.id === 'pandora' ? ' class="active"' : ''}>Pandora</a><a href="/?server=elder"${server.id === 'elder' ? ' class="active"' : ''}>Elder</a><a href="/?server=beavium"${server.id === 'beavium' ? ' class="active"' : ''}>Beavium</a></nav></div></header><main class="shell market-main" id="main-content"><h1>Rynek Metin2 ${escapeHtml(server.name)}</h1><p class="market-lead">Przeglądaj oferty, porównuj ceny i sprawdzaj sklepy na serwerze ${escapeHtml(server.name)}.</p><div class="server-links" aria-label="Rynki"><p>Przełącz rynek:</p><a href="/?server=pandora">Rynek Pandora</a> · <a href="/?server=elder">Rynek Elder</a> · <a href="/?server=beavium">Rynek Beavium</a></div></main></div></div>`
}

function applyServerMeta(html: string, server: { id: string; name: string }) {
  const title = `Rynek Metin2 ${server.name} | ${site.name}`
  const description = `Porównuj ceny, bonusy i lokalizacje przedmiotów na serwerze ${server.name}. Przeglądaj oferty z opublikowanych skanów rynku Metin2.`
  const canonical = `${site.url}/?server=${server.id}`

  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta[^>]*name=["']description["'][^>]*>/i,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    )
    .replace(
      /<link[^>]*rel=["']canonical["'][^>]*>/i,
      `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    )
    .replace(
      /<meta[^>]*property=["']og:title["'][^>]*>/i,
      `<meta property="og:title" content="${escapeHtml(title)}" />`,
    )
    .replace(
      /<meta[^>]*property=["']og:description["'][^>]*>/i,
      `<meta property="og:description" content="${escapeHtml(description)}" />`,
    )
    .replace(
      /<meta[^>]*property=["']og:url["'][^>]*>/i,
      `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    )
    .replace(/<div id="root">[\s\S]*?<\/div><noscript>/, renderServerRoot(server) + '<noscript>')
}

// Vite's SPA fallback does not resolve directory indexes inside public/.
function informationPages(isProduction: boolean): Plugin {
  const paths = new Set(pages.map((page) => '/' + page.slug + '/'))
  const configure = (server: { middlewares: { use: (middleware: (request: any, response: any, next: () => void) => void) => void } }) => {
    server.middlewares.use((request, _response, next) => {
      const [path, query] = (request.url || '/').split('?')
      if (paths.has(path)) request.url = path + 'index.html' + (query ? '?' + query : '')
      next()
    })
  }
  return {
    name: 'information-pages',
    configureServer: configure,
    configurePreviewServer: (server) => {
      configure(server)
      server.middlewares.use((request, _response, next) => {
        const [path, query] = (request.url || '/').split('?')
        if (path === '/' || path === '/index.html') {
          const params = new URLSearchParams(query || '')
          const serverId = params.get('server')
          const matched = GAME_SERVERS.find((s) => s.id === serverId)
          if (matched) {
            request.url = `/server-${matched.id}.html` + (query ? '?' + query : '')
          }
        }
        next()
      })
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        let transformed = html
        if (!isProduction && ctx.originalUrl) {
          const url = new URL(ctx.originalUrl, 'http://localhost')
          const serverId = url.searchParams.get('server')
          const matched = GAME_SERVERS.find((s) => s.id === serverId)
          if (matched) {
            transformed = applyServerMeta(transformed, matched)
          }
        }
        if (!isProduction || !site.indexable) {
          return {
            html: transformed,
            tags: [
              { tag: 'meta', attrs: { name: 'robots', content: 'noindex' }, injectTo: 'head' },
            ],
          }
        }
        return transformed
      },
    },
    generateBundle(_options, bundle) {
      const indexAsset = bundle['index.html']
      if (indexAsset && indexAsset.type === 'asset') {
        const htmlSource = typeof indexAsset.source === 'string'
          ? indexAsset.source
          : new TextDecoder().decode(indexAsset.source)
        for (const server of GAME_SERVERS) {
          this.emitFile({
            type: 'asset',
            fileName: `server-${server.id}.html`,
            source: applyServerMeta(htmlSource, server),
          })
        }
      }
    },
    async closeBundle() {
      const distDir = path.resolve('dist')
      const indexPath = path.join(distDir, 'index.html')
      if (fs.existsSync(indexPath)) {
        const indexHtml = await fs.promises.readFile(indexPath, 'utf-8')
        for (const server of GAME_SERVERS) {
          const targetPath = path.join(distDir, `server-${server.id}.html`)
          if (!fs.existsSync(targetPath)) {
            await fs.promises.writeFile(targetPath, applyServerMeta(indexHtml, server), 'utf-8')
          }
        }
      }
    },
  }
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, '.', '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8080'

  return {
    plugins: [react(), informationPages(command === 'build')],
    server: {
      proxy: {
        '/backend': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/backend/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyRequest) => proxyRequest.removeHeader('origin'))
          },
        },
      },
    },
  }
})
