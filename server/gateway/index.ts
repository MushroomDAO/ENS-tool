import { createPublicClient, http, decodeFunctionData, encodeFunctionResult } from 'viem'
import { optimismSepolia } from 'viem/chains'
import { L2RecordsReader } from './readers/L2RecordsReader'

const client = createPublicClient({
  chain: optimismSepolia,
  transport: http(process.env.L2_RPC_URL),
})

const reader = new L2RecordsReader(client, (process.env.L2_RECORDS_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`)

export async function handleResolve(calldata: `0x${string}`): Promise<`0x${string}`> {
  const { functionName, args } = decodeFunctionData({
    abi: [
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
    ] as const,
    data: calldata,
  })

  if (functionName === 'addr') {
    const [node] = args as [`0x${string}`]
    const value = await reader.getAddr(node)
    return encodeFunctionResult({
      abi: [
        {
          type: 'function',
          name: 'addr',
          stateMutability: 'view',
          inputs: [{ name: 'node', type: 'bytes32' }],
          outputs: [{ name: '', type: 'address' }],
        },
      ] as const,
      functionName: 'addr',
      result: value,
    })
  }

  if (functionName === 'text') {
    const [node, key] = args as [`0x${string}`, string]
    const value = await reader.getText(node, key)
    return encodeFunctionResult({
      abi: [
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
      ] as const,
      functionName: 'text',
      result: value,
    })
  }

  if (functionName === 'contenthash') {
    const [node] = args as [`0x${string}`]
    const value = await reader.getContenthash(node)
    return encodeFunctionResult({
      abi: [
        {
          type: 'function',
          name: 'contenthash',
          stateMutability: 'view',
          inputs: [{ name: 'node', type: 'bytes32' }],
          outputs: [{ name: '', type: 'bytes' }],
        },
      ] as const,
      functionName: 'contenthash',
      result: value,
    })
  }

  throw new Error('Unsupported selector')
}

