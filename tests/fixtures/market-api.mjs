// Local-only backend for reproducing interrupted downloads and slow statistics.
// Open the Vite app with ?server=elder&api=http://127.0.0.1:4321.
import http from 'node:http'

const attempts = new Map()
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:4321')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Content-Type', 'application/json')
  const send = (data) => response.end(JSON.stringify(data))
  const stall = () => {
    response.writeHead(200)
    response.write('{"items":')
    // The browser must cancel this download itself; headers alone do not complete it.
  }
  if (url.pathname.endsWith('/suggestions')) return send({totalMatches:0,suggestions:[]})
  if (url.pathname.endsWith('/statistics')) {
    if (url.searchParams.getAll('vnum').includes('11')) return stall()
    return send({items:[]})
  }
  const query = url.searchParams.get('query') || 'ostatni skan'
  const count = (attempts.get(query) || 0) + 1
  attempts.set(query, count)
  console.log(JSON.stringify({query,attempt:count}))
  if (query === 'stall-body' || (query === 'retry-body' && count === 1)) return stall()
  const item = {
    listingId:1, vnum:query === 'slow-statistics' ? 11 : 10,
    itemName:'Oferta ' + query, quantity:1,price:1000000,unitPrice:1000000,
    totalQuantity:1,totalPrice:1000000,listingCount:1,attributes:[],sockets:[],
    shop:{vid:1,title:'Sklep testowy',ownerName:null,mapId:'metin2_map_a1',channel:1,x:100,y:100,z:0},
    observedAt:'2026-10-01T00:00:00Z',
  }
  const data = {items:[item],page:0,size:8,totalElements:1}
  if (query === 'slow-offers') {
    const timer = setTimeout(() => send(data), 1000)
    response.on('close', () => clearTimeout(timer))
  } else {
    send(data)
  }
})
server.listen(4321, '127.0.0.1', () => console.log('Test API: http://127.0.0.1:4321'))
