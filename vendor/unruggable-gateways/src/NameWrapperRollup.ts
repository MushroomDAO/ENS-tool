import { L2Provider } from '../src/types';
import { ethers } from 'ethers';
import { viem } from 'viem';
import { namehash } from 'viem/ens';
import { createPublicClient, http } from 'viem';
import { optimismSepolia } from 'viem/chains';
import { abi as NameWrapperAbi } from '@ensdomains/ens-contracts/artifacts/contracts/wrapper/NameWrapper.sol/NameWrapper.json';

// This is a simplified Rollup class for our specific use case.
// It queries the ENS Name Wrapper contract on an L2.
export class NameWrapperRollup {
    provider: any; // viem public client
    nameWrapperAddress: `0x${string}`;

    constructor(l2RpcUrl: string, nameWrapperAddress: `0x${string}`) {
        this.provider = createPublicClient({
            chain: optimismSepolia,
            transport: http(l2RpcUrl),
        });
        this.nameWrapperAddress = nameWrapperAddress;
    }

    // This is the main function the gateway will call.
    // It needs to handle different function selectors from the resolver.
    async handleRead(calldata: string): Promise<string> {
        const selector = calldata.slice(0, 10);

        switch (selector) {
            // Selector for addr(bytes32)
            case '0x3b3b57de':
                return this.getAddr(calldata);

            // TODO: Add cases for other functions like text(), contenthash(), etc.

            default:
                throw new Error(`Unsupported ccip method: ${selector}`);
        }
    }

    private async getAddr(calldata: string): Promise<string> {
        const addrInterface = new ethers.Interface(['function addr(bytes32) returns (address)']);
        const decoded = addrInterface.decodeFunctionData('addr', calldata);
        const node = decoded[0];

        console.log(`Querying L2 Name Wrapper for addr of node: ${node}`);

        try {
            const result = await this.provider.readContract({
                address: this.nameWrapperAddress,
                abi: NameWrapperAbi,
                functionName: 'addr',
                args: [node],
            });

            console.log(`Got address from L2: ${result}`);

            // Re-encode the result for the L1 resolver
            return addrInterface.encodeFunctionResult('addr', [result]);
        } catch (e) {
            console.error('Error querying Name Wrapper:', e);
            // Return zero address on error
            return addrInterface.encodeFunctionResult('addr', [ethers.ZeroAddress]);
        }
    }
}
