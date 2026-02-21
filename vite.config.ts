import { defineConfig } from 'vite'

export default defineConfig({
  envPrefix: ['VITE_', 'OP_'],
  plugins: [
    {
      name: 'ccip-dev-gateway',
      configureServer(server) {
        server.middlewares.use('/api/ccip', async (req, res) => {
          const anyReq = req as any

          if (anyReq.method !== 'POST') {
            res.statusCode = 405
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: 'Method Not Allowed' }))
            return
          }

          const body = await new Promise<string>((resolve, reject) => {
            let data = ''
            anyReq.on('data', (chunk: any) => {
              data += String(chunk)
            })
            anyReq.on('end', () => resolve(data))
            anyReq.on('error', reject)
          })

          try {
            const payload = JSON.parse(body || '{}') as { data?: `0x${string}`; calldata?: `0x${string}` }
            const calldata = payload.calldata || payload.data
            if (!calldata || !calldata.startsWith('0x')) throw new Error('Missing calldata')

            const { handleResolveSigned } = await import('./server/gateway/index')
            const result = await handleResolveSigned(calldata)

            res.statusCode = 200
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify(result))
          } catch (e) {
            res.statusCode = 400
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: (e as Error)?.message ?? String(e) }))
          }
        })

        server.middlewares.use('/api/manage', async (req, res) => {
          const anyReq = req as any
          const url = String(anyReq.url || '')

          if (anyReq.method !== 'POST') {
            res.statusCode = 405
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: 'Method Not Allowed' }))
            return
          }

          const body = await new Promise<string>((resolve, reject) => {
            let data = ''
            anyReq.on('data', (chunk: any) => {
              data += String(chunk)
            })
            anyReq.on('end', () => resolve(data))
            anyReq.on('error', reject)
          })

          const asBigInt = (value: unknown) => {
            if (typeof value === 'bigint') return value
            if (typeof value === 'number') return BigInt(value)
            if (typeof value === 'string') return BigInt(value)
            throw new Error('Invalid bigint field')
          }

          try {
            const payload = JSON.parse(body || '{}') as any
            const { verifyTypedData, isAddress } = await import('viem')
            const { buildDomain, RegisterTypes, SetAddrTypes } = await import('./server/gateway/manage/schemas')
            const { optimismSepolia } = await import('viem/chains')

            const from = payload.from as string | undefined
            if (!from || !isAddress(from)) throw new Error('Invalid from')
            const signature = payload.signature as `0x${string}` | undefined
            if (!signature || !signature.startsWith('0x')) throw new Error('Missing signature')

            const chainId = optimismSepolia.id
            const verifyingContract = (payload.domain?.verifyingContract ||
              payload.domain?.verifying ||
              payload.verifyingContract ||
              payload.contract ||
              '0x0000000000000000000000000000000000000000') as `0x${string}`

            const domain = buildDomain(chainId, verifyingContract)

            if (url === '/set-addr') {
              const msg = payload.message ?? {}
              const message = {
                node: msg.node,
                coinType: asBigInt(msg.coinType),
                addr: msg.addr,
                nonce: asBigInt(msg.nonce),
                deadline: asBigInt(msg.deadline),
              }

              const now = BigInt(Math.floor(Date.now() / 1000))
              if (message.deadline < now) throw new Error('Expired')

              const ok = await verifyTypedData({
                address: from,
                domain,
                primaryType: 'SetAddr',
                types: SetAddrTypes as any,
                message: message as any,
                signature,
              })

              res.statusCode = 200
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ ok, action: 'set-addr' }))
              return
            }

            if (url === '/register') {
              const msg = payload.message ?? {}
              const message = {
                parent: msg.parent,
                label: msg.label,
                owner: msg.owner,
                nonce: asBigInt(msg.nonce),
                deadline: asBigInt(msg.deadline),
              }

              const now = BigInt(Math.floor(Date.now() / 1000))
              if (message.deadline < now) throw new Error('Expired')

              const ok = await verifyTypedData({
                address: from,
                domain,
                primaryType: 'Register',
                types: RegisterTypes as any,
                message: message as any,
                signature,
              })

              res.statusCode = 200
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ ok, action: 'register' }))
              return
            }

            res.statusCode = 404
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: 'Unknown manage endpoint' }))
          } catch (e) {
            res.statusCode = 400
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: (e as Error)?.message ?? String(e) }))
          }
        })
      },
    },
  ],
  server: {
    port: 4173,
    strictPort: true,
  },
})
