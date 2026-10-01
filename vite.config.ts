import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import pages from './content/pages.json'
import site from './src/site.json'

// Vite's SPA fallback does not resolve directory indexes inside public/.
function informationPages(isProduction: boolean): Plugin {
  const paths = new Set(pages.map((page) => '/' + page.slug + '/'))
  const configure: NonNullable<Plugin['configureServer']> = (server) => {
    server.middlewares.use((request, _response, next) => {
      const [path, query] = (request.url || '/').split('?')
      if (paths.has(path)) request.url = path + 'index.html' + (query ? '?' + query : '')
      next()
    })
  }
  return {
    name: 'information-pages',
    configureServer: configure,
    configurePreviewServer: configure,
    transformIndexHtml: () => [
      ...(!isProduction || !site.indexable ? [
        { tag: 'meta', attrs: { name: 'robots', content: 'noindex' }, injectTo: 'head' as const },
      ] : []),
      ...([{
        tag: 'script',
        attrs: {
          defer: true, src: '/privacy-preferences.js',
          'data-website-id': site.analytics.websiteId,
          'data-host': site.analytics.host,
          'data-domain': new URL(site.url).hostname,
          'data-script': site.analytics.script,
          'data-enabled': String(isProduction && site.indexable),
        },
        injectTo: 'head' as const,
      }]),
    ],
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
