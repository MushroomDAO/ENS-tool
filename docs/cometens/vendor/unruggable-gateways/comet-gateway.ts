import { NameWrapperRollup } from './src/NameWrapperRollup.js';

console.log('Starting CometENS dedicated gateway...');

const l2RpcUrl = `https://opt-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`;
const nameWrapperAddress = '0x42d63ae25990886eA35F27a553440E2946209422'; // Actual OP Sepolia Name Wrapper

const cometRollup = new NameWrapperRollup(l2RpcUrl, nameWrapperAddress);

const port = 8000;

console.log(`Listening on port ${port}`);

Bun.serve({
    port,
    async fetch(req) {
        console.log(`Received request: ${req.method} ${req.url}`);
        const headers = { 'access-control-allow-origin': '*' };

        if (req.method === 'OPTIONS') {
            return new Response(null, {
                headers: { ...headers, 'access-control-allow-headers': '*' },
            });
        }

        if (req.method !== 'POST') {
            return new Response('Unsupported method', { status: 405 });
        }

        try {
            const { data: calldata } = await req.json();
            console.log(`Received calldata: ${calldata}`);

            const data = await cometRollup.handleRead(calldata);

            console.log(`Returning data: ${data}`);
            return Response.json({ data }, { headers });

        } catch (e: any) {
            console.error('Error handling request:', e);
            return Response.json({ error: e.message }, { status: 500 });
        }
    },
});
