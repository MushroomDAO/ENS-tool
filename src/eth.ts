import { createPublicClient, http, decodeFunctionData, encodeFunctionResult } from 'viem'
import { optimismSepolia } from 'viem/chains'

const L2_RECORDS_ABI = [
  {
    type: 'function',
    name: 'addr',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'text',
    stateMutability: 'view',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
    ],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'contenthash',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bytes' }],
  },
] as const

const client = createPublicClient({
  chain: optimismSepolia,
  transport: http(import.meta.env?.VITE_L2_RPC_URL || ''),
})

const CONTRACT = (import.meta.env?.VITE_L2_RECORDS_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`

function byId<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T | null
}

async function queryAddr() {
  const nodeInput = byId<HTMLInputElement>('nodeHex')
  const resultEl = byId<HTMLDivElement>('result')
  if (!nodeInput || !resultEl) return
  const node = nodeInput.value.trim() as `0x${string}`
  const value = await client.readContract({
    address: CONTRACT,
    abi: L2_RECORDS_ABI,
    functionName: 'addr',
    args: [node],
  })
  resultEl.textContent = `addr: ${value}`
}

async function queryText() {
  const nodeInput = byId<HTMLInputElement>('nodeHex')
  const resultEl = byId<HTMLDivElement>('result')
  if (!nodeInput || !resultEl) return
  const node = nodeInput.value.trim() as `0x${string}`
  const value = await client.readContract({
    address: CONTRACT,
    abi: L2_RECORDS_ABI,
    functionName: 'text',
    args: [node, 'com.twitter'],
  })
  resultEl.textContent = `text(com.twitter): ${value}`
}

async function queryCh() {
  const nodeInput = byId<HTMLInputElement>('nodeHex')
  const resultEl = byId<HTMLDivElement>('result')
  if (!nodeInput || !resultEl) return
  const node = nodeInput.value.trim() as `0x${string}`
  const value = await client.readContract({
    address: CONTRACT,
    abi: L2_RECORDS_ABI,
    functionName: 'contenthash',
    args: [node],
  })
  resultEl.textContent = `contenthash: ${value}`
}

const qa = byId<HTMLButtonElement>('queryAddrBtn')
const qt = byId<HTMLButtonElement>('queryTextBtn')
const qc = byId<HTMLButtonElement>('queryChBtn')
qa?.addEventListener('click', queryAddr)
qt?.addEventListener('click', queryText)
qc?.addEventListener('click', queryCh)

