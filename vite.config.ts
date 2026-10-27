import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function searchApiPlugin(): Plugin {
  return {
    name: 'search-api-endpoint',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next()
        const url = new URL(req.url, 'http://localhost:3000')
        if (url.pathname === '/api/search' && req.method === 'GET') {
          const q = url.searchParams.get('q') || ''
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 200
          const payload = {
            status: 'success',
            query: q,
            timestamp: new Date().toISOString(),
            record: {
              type: 'telecom_identifier',
              query: q,
              format: 'E.164',
              valid: true,
              carrier: 'Global Telecom Network',
              country: 'United States',
              countryCode: '+1',
              region: 'California',
              lineType: 'cellular_verified',
              riskScore: 0.04,
              reputation: 'neutral',
              tags: ['verified_format', 'active_network'],
            },
            metadata: {
              source: 'osinct_api_adapter',
              latencyMs: 34,
              node: 'us-west-edge-01',
            },
          }
          res.end(JSON.stringify(payload))
          return
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), searchApiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
})
