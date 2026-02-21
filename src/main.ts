import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  getAddress,
  isAddress,
  keccak256,
  namehash,
  parseAbi,
  toHex,
  type Address,
  type Hex,
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
  'function owner(bytes32 node) view returns (address)',
  'function resolver(bytes32 node) view returns (address)',
  'function ttl(bytes32 node) view returns (uint64)',
  'function recordExists(bytes32 node) view returns (bool)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function setSubnodeOwner(bytes32 node, bytes32 label, address owner) returns (bytes32)',
  'function setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl) returns (bytes32)',
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
const subLabelEl = document.getElementById('subLabel') as HTMLInputElement | null
const targetAddressEl = document.getElementById('targetAddress') as HTMLInputElement | null

let connection: Connection | null = null
let lastPrecheckOk = false
let lastPrecheckKey: string | null = null

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

  logText('my.box 合约（Optimism）:')
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

  let node: Hex
  try {
    node = namehash(rawName)
  } catch (e) {
    logText('域名格式不合法')
    logText((e as Error)?.message ?? String(e))
    return
  }

  const [owner, resolver, ttl] = await Promise.all([
    conn.publicClient.readContract({
      address: THREEDNS_CONTRACT_ADDRESS,
      abi: threeDnsAbi,
      functionName: 'owner',
      args: [node],
    }),
    conn.publicClient.readContract({
      address: THREEDNS_CONTRACT_ADDRESS,
      abi: threeDnsAbi,
      functionName: 'resolver',
      args: [node],
    }),
    conn.publicClient.readContract({
      address: THREEDNS_CONTRACT_ADDRESS,
      abi: threeDnsAbi,
      functionName: 'ttl',
      args: [node],
    }),
  ])

  const tokenId = BigInt(node)
  const tokenOwner = await (async () => {
    try {
      return await conn.publicClient.readContract({
        address: THREEDNS_CONTRACT_ADDRESS,
        abi: threeDnsAbi,
        functionName: 'ownerOf',
        args: [tokenId],
      })
    } catch {
      return null
    }
  })()

  logText(`domain: ${rawName}`)
  logText(`namehash(node): ${node}`)
  logText(`owner(node): ${owner}`)
  logText(`resolver(node): ${resolver}`)
  logText(`ttl(node): ${ttl}`)
  logText(`tokenId(uint256): ${tokenId.toString()}`)
  if (tokenOwner) logText(`ownerOf(tokenId): ${tokenOwner}`)

  logLink(
    'my.box 合约（Optimism Etherscan）',
    `https://optimistic.etherscan.io/address/${THREEDNS_CONTRACT_ADDRESS}`,
  )
  logLink('OP 地址（owner）', `https://optimistic.etherscan.io/address/${owner}`)
  if (resolver.toLowerCase() !== ZERO_ADDRESS) {
    logLink('OP 地址（resolver）', `https://optimistic.etherscan.io/address/${resolver}`)
  }
}

async function precheckPermission() {
  clearLog()
  lastPrecheckOk = false
  lastPrecheckKey = null
  if (setBtn) setBtn.disabled = true

  const rawParentDomain = parentDomainEl?.value?.trim() ?? ''
  const rawLabel = subLabelEl?.value?.trim() ?? ''
  const rawTarget = targetAddressEl?.value?.trim() ?? ''

  if (!rawParentDomain) {
    logText('Parent 域名不能为空')
    return
  }
  if (!rawLabel) {
    logText('子标签不能为空')
    return
  }
  if (!rawTarget || !isAddress(rawTarget)) {
    logText('请输入合法的目标地址')
    return
  }

  const conn = connection ?? (await connectOptimism())
  const targetAddress = getAddress(rawTarget)

  let parentNode: Hex
  try {
    parentNode = namehash(rawParentDomain)
  } catch (e) {
    logText('Parent 域名格式不合法')
    logText((e as Error)?.message ?? String(e))
    return
  }

  const childDomain = `${rawLabel}.${rawParentDomain}`
  const childNode = namehash(childDomain)
  const labelHash = keccak256(toHex(rawLabel))

  const [parentOwner, childOwner, childExists, isOperator] = await Promise.all([
    conn.publicClient.readContract({
      address: THREEDNS_CONTRACT_ADDRESS,
      abi: threeDnsAbi,
      functionName: 'owner',
      args: [parentNode],
    }),
    conn.publicClient.readContract({
      address: THREEDNS_CONTRACT_ADDRESS,
      abi: threeDnsAbi,
      functionName: 'owner',
      args: [childNode],
    }),
    conn.publicClient.readContract({
      address: THREEDNS_CONTRACT_ADDRESS,
      abi: threeDnsAbi,
      functionName: 'recordExists',
      args: [childNode],
    }),
    (async () => {
      const parentOwnerNow = await conn.publicClient.readContract({
        address: THREEDNS_CONTRACT_ADDRESS,
        abi: threeDnsAbi,
        functionName: 'owner',
        args: [parentNode],
      })
      if (parentOwnerNow.toLowerCase() === ZERO_ADDRESS) return false
      return await conn.publicClient.readContract({
        address: THREEDNS_CONTRACT_ADDRESS,
        abi: threeDnsAbi,
        functionName: 'isApprovedForAll',
        args: [getAddress(parentOwnerNow), conn.account],
      })
    })(),
  ])

  logText(`parent: ${rawParentDomain}`)
  logText(`parentNode: ${parentNode}`)
  logText(`parentOwner: ${parentOwner}`)
  logText(`label: ${rawLabel}`)
  logText(`labelHash: ${labelHash}`)
  logText(`child: ${childDomain}`)
  logText(`childNode: ${childNode}`)
  logText(`childOwner(now): ${childOwner}`)
  logText(`childRecordExists: ${String(childExists)}`)
  logText(`target: ${targetAddress}`)

  if (parentOwner.toLowerCase() === ZERO_ADDRESS) {
    logText('Parent 域名 owner 为 0x0，无法分配子域名')
    return
  }

  const isOwner = getAddress(parentOwner) === conn.account
  if (!isOwner && !isOperator) {
    logText('当前钱包无权分配该 Parent 域名的子域名')
    logText(`需要 owner 或 ApprovalForAll。当前钱包: ${conn.account}`)
    return
  }

  if (childOwner.toLowerCase() !== ZERO_ADDRESS) {
    logText('子域名已存在（owner 非 0x0），为防误覆盖已停止')
    return
  }

  const txData = encodeFunctionData({
    abi: threeDnsAbi,
    functionName: 'setSubnodeOwner',
    args: [parentNode, labelHash, targetAddress],
  })

  try {
    await conn.publicClient.call({
      to: THREEDNS_CONTRACT_ADDRESS,
      data: txData,
      account: conn.account,
    })
  } catch {
    logText('预检未通过：合约拒绝 setSubnodeOwner（eth_call 也会 revert）')
    logText('这通常表示该体系不允许通过 setSubnodeOwner 免费“创建/分配”子域名')
    logText('如果 childOwner=0x0，想把 forest.mushroom.box 给某个地址：')
    logText(' - 需要先走 my.box 的注册/铸造流程（或在注册时直接指定 owner=目标地址）')
    logText(' - 注册后再进行 transferFrom/safeTransferFrom 转入目标地址')
    logLink('my.box', 'https://my.box/')
    return
  }

  logText('预检通过（setSubnodeOwner 可执行）')

  lastPrecheckOk = true
  lastPrecheckKey = `${rawParentDomain}|${rawLabel}|${targetAddress}`
  if (setBtn) setBtn.disabled = false
}

async function setSubnodeOwner() {
  clearLog()

  const rawParentDomain = parentDomainEl?.value?.trim() ?? ''
  const rawLabel = subLabelEl?.value?.trim() ?? ''
  const rawTarget = targetAddressEl?.value?.trim() ?? ''

  if (!rawParentDomain || !rawLabel || !rawTarget || !isAddress(rawTarget)) {
    logText('参数不完整或地址不合法')
    return
  }

  const normalizedTarget = getAddress(rawTarget)
  const currentKey = `${rawParentDomain}|${rawLabel}|${normalizedTarget}`

  if (!lastPrecheckOk) {
    await precheckPermission()
    if (!lastPrecheckOk) return
  } else if (lastPrecheckKey !== currentKey) {
    logText('检测到输入已变更，自动重新预检')
    await precheckPermission()
    if (!lastPrecheckOk) return
  }

  const conn = connection ?? (await connectOptimism())
  const targetAddress = normalizedTarget
  const parentNode = namehash(rawParentDomain)
  const labelHash = keccak256(toHex(rawLabel))
  const childDomain = `${rawLabel}.${rawParentDomain}`
  const childNode = namehash(childDomain)

  if (setBtn) setBtn.disabled = true
  if (precheckBtn) precheckBtn.disabled = true
  if (checkEnsBtn) checkEnsBtn.disabled = true
  if (checkBoxBtn) checkBoxBtn.disabled = true
  if (connectBtn) connectBtn.disabled = true

  try {
    logText('正在唤起 MetaMask 发起交易...')
    logText('参数:')
    logText(` - Parent: ${rawParentDomain}`)
    logText(` - Label: ${rawLabel}`)
    logText(` - Child: ${childDomain}`)
    logText(` - New Owner: ${targetAddress}`)

    const txData = encodeFunctionData({
      abi: threeDnsAbi,
      functionName: 'setSubnodeOwner',
      args: [parentNode, labelHash, targetAddress],
    })
    try {
      await conn.publicClient.call({
        to: THREEDNS_CONTRACT_ADDRESS,
        data: txData,
        account: conn.account,
      })
    } catch {
      logText('交易已中止：合约会 revert（请改用 my.box 的注册/铸造流程）')
      logLink('my.box', 'https://my.box/')
      return
    }

    const hash = await conn.walletClient.writeContract({
      address: THREEDNS_CONTRACT_ADDRESS,
      abi: threeDnsAbi,
      functionName: 'setSubnodeOwner',
      args: [parentNode, labelHash, targetAddress],
      account: conn.account,
      chain: optimism,
    })

    logText('交易已提交:')
    logLink(hash, `https://optimistic.etherscan.io/tx/${hash}`)
    logText('等待确认...')

    const receipt = await conn.publicClient.waitForTransactionReceipt({ hash })
    logText(`已确认: blockNumber=${receipt.blockNumber}`)
    const newOwner = await conn.publicClient.readContract({
      address: THREEDNS_CONTRACT_ADDRESS,
      abi: threeDnsAbi,
      functionName: 'owner',
      args: [childNode],
    })
    logText(`owner(childNode): ${newOwner}`)
    logText('完成')
  } catch (e) {
    logText('交易失败')
    logText((e as Error)?.message ?? String(e))
  } finally {
    if (precheckBtn) precheckBtn.disabled = false
    if (checkEnsBtn) checkEnsBtn.disabled = false
    if (checkBoxBtn) checkBoxBtn.disabled = false
    if (connectBtn) connectBtn.disabled = false
    if (setBtn) setBtn.disabled = !lastPrecheckOk
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
setBtn?.addEventListener('click', () => void setSubnodeOwner())
