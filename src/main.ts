import {
  createPublicClient,
  createWalletClient,
  custom,
  getAddress,
  isAddress,
  namehash,
  parseAbi,
  type Address,
  type PublicClient,
  type Transport,
  type WalletClient,
} from 'viem'
import { optimism } from 'viem/chains'

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }
  }
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

const THREEDNS_CONTRACT_ADDRESS =
  '0xBB7B805B257d7C76CA9435B3ffe780355E4C4B17' as const

const threeDnsAbi = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function supportsInterface(bytes4 interfaceId) view returns (bool)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
])

type Connection = {
  account: Address
  publicClient: PublicClient<Transport, typeof optimism>
  walletClient: WalletClient<Transport, typeof optimism>
}

const logEl = document.getElementById('log')
const statusLineEl = document.getElementById('statusLine')

const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement | null
const checkBoxBtn = document.getElementById('checkBoxBtn') as HTMLButtonElement | null
const checkEnsBtn = document.getElementById('checkEnsBtn') as HTMLButtonElement | null
const precheckBtn = document.getElementById('precheckBtn') as HTMLButtonElement | null
const setBtn = document.getElementById('setBtn') as HTMLButtonElement | null

const ensNameToCheckEl = document.getElementById('ensNameToCheck') as HTMLInputElement | null
const parentDomainEl = document.getElementById('parentDomain') as HTMLInputElement | null
const targetAddressEl = document.getElementById('targetAddress') as HTMLInputElement | null

let connection: Connection | null = null
let lastPrecheckOk = false

function setStatusLine(text: string) {
  if (!statusLineEl) return
  statusLineEl.textContent = text
}

function clearLog() {
  if (!logEl) return
  logEl.textContent = ''
}

function logText(msg: string) {
  if (!logEl) return
  const line = document.createElement('div')
  line.textContent = msg
  logEl.appendChild(line)
}

function logLink(label: string, url: string) {
  if (!logEl) return
  const line = document.createElement('div')
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.textContent = label
  line.appendChild(a)
  logEl.appendChild(line)
}

function getEthereum() {
  const ethereum = window.ethereum
  if (!ethereum) {
    throw new Error('未检测到 MetaMask（window.ethereum 为空）')
  }
  return ethereum
}

async function getChainIdHex() {
  const ethereum = getEthereum()
  const chainIdHex = (await ethereum.request({ method: 'eth_chainId' })) as string
  return chainIdHex
}

async function switchChain(chainId: number) {
  const ethereum = getEthereum()
  const chainIdHex = `0x${chainId.toString(16)}`
  await ethereum.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: chainIdHex }],
  })
}

async function connectOptimism(): Promise<Connection> {
  const ethereum = getEthereum()
  await ethereum.request({ method: 'eth_requestAccounts' })

  const chainIdHex = await getChainIdHex()
  if (chainIdHex !== '0xa') {
    await switchChain(10)
  }

  const walletClient = createWalletClient({
    chain: optimism,
    transport: custom(ethereum),
  })
  const publicClient = createPublicClient({
    chain: optimism,
    transport: custom(ethereum),
  })

  const accounts = await walletClient.getAddresses()
  const account = accounts[0]
  if (!account) {
    throw new Error('未获取到钱包账户')
  }

  const conn: Connection = { account, publicClient, walletClient }
  connection = conn
  setStatusLine(`已连接：${account}（Optimism）`)
  return conn
}

async function checkBoxRegistration() {
  clearLog()
  lastPrecheckOk = false
  if (setBtn) setBtn.disabled = true

  const conn = connection ?? (await connectOptimism())

  const [name, symbol] = await Promise.all([
    conn.publicClient.readContract({
      address: THREEDNS_CONTRACT_ADDRESS,
      abi: threeDnsAbi,
      functionName: 'name',
    }),
    conn.publicClient.readContract({
      address: THREEDNS_CONTRACT_ADDRESS,
      abi: threeDnsAbi,
      functionName: 'symbol',
    }),
  ])

  const [isErc721, isErc1155] = await Promise.all([
    conn.publicClient.readContract({
      address: THREEDNS_CONTRACT_ADDRESS,
      abi: threeDnsAbi,
      functionName: 'supportsInterface',
      args: ['0x80ac58cd'],
    }),
    conn.publicClient.readContract({
      address: THREEDNS_CONTRACT_ADDRESS,
      abi: threeDnsAbi,
      functionName: 'supportsInterface',
      args: ['0xd9b67a26'],
    }),
  ])

  logText('3DNS 合约（Optimism）:')
  logText(`address: ${THREEDNS_CONTRACT_ADDRESS}`)
  logText(`name: ${name}`)
  logText(`symbol: ${symbol}`)
  logText(`supports ERC721: ${String(isErc721)}`)
  logText(`supports ERC1155: ${String(isErc1155)}`)
  logLink(
    'Optimism Etherscan',
    `https://optimistic.etherscan.io/address/${THREEDNS_CONTRACT_ADDRESS}`,
  )
}

async function checkEnsResolution() {
  clearLog()
  lastPrecheckOk = false
  if (setBtn) setBtn.disabled = true

  const rawName = ensNameToCheckEl?.value?.trim() ?? ''
  if (!rawName) {
    logText('请输入要检查的 .box 域名')
    return
  }

  const conn = connection ?? (await connectOptimism())

  let node: string
  try {
    node = namehash(rawName)
  } catch (e) {
    logText('域名格式不合法')
    logText((e as Error)?.message ?? String(e))
    return
  }

  const tokenId = BigInt(node)
  const owner = await conn.publicClient.readContract({
    address: THREEDNS_CONTRACT_ADDRESS,
    abi: threeDnsAbi,
    functionName: 'ownerOf',
    args: [tokenId],
  })

  logText(`domain: ${rawName}`)
  logText(`namehash(node): ${node}`)
  logText(`tokenId(uint256): ${tokenId.toString()}`)
  logText(`ownerOf(tokenId): ${owner}`)
  logLink('3DNS 合约（Optimism Etherscan）', `https://optimistic.etherscan.io/address/${THREEDNS_CONTRACT_ADDRESS}`)
  logLink('OP 地址（owner）', `https://optimistic.etherscan.io/address/${owner}`)
}

async function precheckPermission() {
  clearLog()
  lastPrecheckOk = false
  if (setBtn) setBtn.disabled = true

  const rawDomain = parentDomainEl?.value?.trim() ?? ''
  const rawTarget = targetAddressEl?.value?.trim() ?? ''

  if (!rawDomain) {
    logText('域名不能为空')
    return
  }
  if (!rawTarget || !isAddress(rawTarget)) {
    logText('请输入合法的目标地址')
    return
  }

  const targetAddress = getAddress(rawTarget)
  const conn = connection ?? (await connectOptimism())

  let node: string
  try {
    node = namehash(rawDomain)
  } catch (e) {
    logText('域名格式不合法')
    logText((e as Error)?.message ?? String(e))
    return
  }

  const tokenId = BigInt(node)
  const owner = await conn.publicClient.readContract({
    address: THREEDNS_CONTRACT_ADDRESS,
    abi: threeDnsAbi,
    functionName: 'ownerOf',
    args: [tokenId],
  })

  logText(`domain: ${rawDomain}`)
  logText(`namehash(node): ${node}`)
  logText(`tokenId(uint256): ${tokenId.toString()}`)
  logText(`ownerOf(tokenId): ${owner}`)
  logText(`target: ${targetAddress}`)

  if (owner.toLowerCase() === ZERO_ADDRESS) {
    logText('该域名当前 owner=0x0（可能未注册或已过期/被销毁）')
    return
  }

  if (getAddress(owner) !== conn.account) {
    logText('当前钱包不是该域名 owner，无法转移')
    logText(`当前钱包: ${conn.account}`)
    return
  }

  logText('预检通过')

  lastPrecheckOk = true
  if (setBtn) setBtn.disabled = false
}

async function transferDomain() {
  clearLog()

  const rawDomain = parentDomainEl?.value?.trim() ?? ''
  const rawTarget = targetAddressEl?.value?.trim() ?? ''

  if (!rawDomain || !rawTarget || !isAddress(rawTarget)) {
    logText('参数不完整或地址不合法')
    return
  }

  if (!lastPrecheckOk) {
    await precheckPermission()
    if (!lastPrecheckOk) return
  }

  const conn = connection ?? (await connectOptimism())
  const targetAddress = getAddress(rawTarget)
  const node = namehash(rawDomain)
  const tokenId = BigInt(node)

  if (setBtn) setBtn.disabled = true
  if (precheckBtn) precheckBtn.disabled = true
  if (checkEnsBtn) checkEnsBtn.disabled = true
  if (checkBoxBtn) checkBoxBtn.disabled = true
  if (connectBtn) connectBtn.disabled = true

  try {
    logText('正在唤起 MetaMask 发起交易...')
    logText('参数:')
    logText(` - Domain: ${rawDomain}`)
    logText(` - tokenId: ${tokenId.toString()}`)
    logText(` - To: ${targetAddress}`)

    const hash = await conn.walletClient.writeContract({
      address: THREEDNS_CONTRACT_ADDRESS,
      abi: threeDnsAbi,
      functionName: 'safeTransferFrom',
      args: [conn.account, targetAddress, tokenId],
      account: conn.account,
      chain: optimism,
    })

    logText('交易已提交:')
    logLink(hash, `https://optimistic.etherscan.io/tx/${hash}`)
    logText('等待确认...')

    const receipt = await conn.publicClient.waitForTransactionReceipt({ hash })
    logText(`已确认: blockNumber=${receipt.blockNumber}`)
    logText('完成')
  } catch (e) {
    logText('交易失败')
    logText((e as Error)?.message ?? String(e))
  } finally {
    if (precheckBtn) precheckBtn.disabled = false
    if (checkEnsBtn) checkEnsBtn.disabled = false
    if (checkBoxBtn) checkBoxBtn.disabled = false
    if (connectBtn) connectBtn.disabled = false
  }
}

async function connectOnly() {
  clearLog()
  try {
    await connectOptimism()
    logText('连接完成')
  } catch (e) {
    logText('连接失败')
    logText((e as Error)?.message ?? String(e))
  }
}

setStatusLine('未连接')
if (setBtn) setBtn.disabled = true

connectBtn?.addEventListener('click', () => void connectOnly())
checkBoxBtn?.addEventListener('click', () => void checkBoxRegistration())
checkEnsBtn?.addEventListener('click', () => void checkEnsResolution())
precheckBtn?.addEventListener('click', () => void precheckPermission())
setBtn?.addEventListener('click', () => void transferDomain())
