import { createPublicClient, createWalletClient, custom, http, type Address } from 'viem'
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
const VERIFYING = (import.meta.env?.VITE_EIP712_VERIFYING_CONTRACT || CONTRACT) as `0x${string}`

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

// EIP-712 SetAddr typed data
const SetAddrTypes = {
  SetAddr: [
    { name: 'node', type: 'bytes32' },
    { name: 'coinType', type: 'uint256' },
    { name: 'addr', type: 'bytes' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const

function getEthereum(): any {
  const eth = (window as any).ethereum
  if (!eth) throw new Error('未检测到 MetaMask')
  return eth
}

async function signSetAddr() {
  const nodeEl = byId<HTMLInputElement>('sigNodeHex')
  const coinEl = byId<HTMLInputElement>('sigCoinType')
  const addrEl = byId<HTMLInputElement>('sigAddr')
  const deadlineEl = byId<HTMLInputElement>('sigDeadline')
  const outEl = byId<HTMLPreElement>('sigOutput')
  if (!nodeEl || !coinEl || !addrEl || !outEl) return

  const node = nodeEl.value.trim() as `0x${string}`
  const coinType = BigInt(coinEl.value.trim() || '60')
  const addr = addrEl.value.trim() as `0x${string}`
  const now = Math.floor(Date.now() / 1000)
  const deadline = BigInt(deadlineEl?.value?.trim() || String(now + 600))

  const wallet = createWalletClient({
    chain: optimismSepolia,
    transport: custom(getEthereum()),
  })
  const [account] = await wallet.getAddresses()
  const nonce = BigInt(now) // 简化：以时间戳作为一次性 nonce，占位实现

  const domain = {
    name: 'CometENS',
    version: '1',
    chainId: optimismSepolia.id,
    verifyingContract: VERIFYING,
  } as const

  const message = { node, coinType, addr, nonce, deadline } as const

  const signature = await wallet.signTypedData({
    account,
    domain,
    primaryType: 'SetAddr',
    types: SetAddrTypes as any,
    message: message as any,
  })

  const payload = {
    domain,
    types: SetAddrTypes,
    primaryType: 'SetAddr',
    message,
    signature,
    from: account,
  }
  outEl.textContent = JSON.stringify(payload, null, 2)
}

const ss = byId<HTMLButtonElement>('signSetAddrBtn')
ss?.addEventListener('click', signSetAddr)
