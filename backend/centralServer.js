import express from 'express';
import WebSocket, { WebSocketServer } from 'ws';
import Blockchain from './Blockchain.js';
import {ECPairFactory} from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import cors from 'cors';



const app = express();
const port = 8080;
const wss = new WebSocketServer({ noServer: true });
const ECPair = ECPairFactory(tinysecp);

app.use(cors({
    origin: 'http://localhost:3000', // Allow requests from this origin
    methods: 'GET,POST', // Allow these HTTP methods
    credentials: true // Allow credentials (cookies, authorization headers, etc.)
}));

const blockchain = new Blockchain();
let miners = [];


app.use(express.json());

// Endpoint to generate a Bitcoin wallet
app.get('/genWallet', (req, res) => {
    try {
        // Generate key pair
        const keyPair = ECPair.makeRandom();

        // Get private and public keys
        const privateKey = keyPair.toWIF();
        const publicKey = keyPair.publicKey.toString('hex');

        // Generate Bitcoin address
        const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });

        res.json({ privateKey, publicKey, address });
    } catch (error) {
        console.error('Error generating wallet:', error);
        res.status(500).json({ error: 'Failed to generate wallet' });
    }
});

// Endpoint to get the current blockchain
app.get('/blockchain', (req, res) => {
    res.json(blockchain.getBlockchain());
});



app.post('/transaction', (req, res) => {
    const { from, to, amount, signature,publicKey } = req.body;
    console.log("Transaction recevied ");

    const trans_obj = { from, to, amount, signature ,publicKey}

    if (!from || !to || !amount || !signature || !publicKey) {
        res.status(400).send("Invalid request");
        return;
    }

    const valid = blockchain.handleNewTransaction(trans_obj);

    if (valid) {
        broadcast({ type: 'NEW_TRANSACTION', transaction: trans_obj });
        console.log('New transaction received and broadcasted to network');
        res.status(200).send("Transaction added successfully");
    } else {
        res.status(400).send("Invalid transaction");
    }
})





wss.on('connection', (ws) => {
    miners.push(ws);

    // Send the initial blockchain to the newly connected miner
    ws.send(JSON.stringify({ type: 'SYNC_RESPONSE', chain: blockchain.getBlockchain() }));
    console.log("Sent full blockchain to miner");

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'NEW_BLOCK':
                if (data.block) {
                    const added = blockchain.handleNewBlock(data.block, ws);
                    if (added) {
                        // Broadcast the new block to all miners
                        broadcast({ type: 'NEW_BLOCK', block: data.block });
                        console.log('New block received and broadcasted to network');
                    }
                }
                break;
            case 'SYNC_REQUEST':
                ws.send(JSON.stringify({ type: 'SYNC_RESPONSE', chain: blockchain.getBlockchain() }));
                console.log("Sent full blockchain to miner");
                break;
            case 'NEW_TRANSACTION':
                if (data.transaction) {
                    const valid = blockchain.handleNewTransaction(data.transaction);
                    if (valid) {
                        // Broadcast the new transaction to all miners
                        broadcast({ type: 'NEW_TRANSACTION', transaction: data.transaction });
                        console.log('New transaction received and broadcasted to network');
                    }
                }
                break;
            default:
                console.error('Unknown message type:', data.type);
        }
    });

    ws.on('close', () => {
        miners = miners.filter((miner) => miner !== ws);
    });
});

const server = app.listen(port, () => {
    console.log(`Central server listening on port ${port}`);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});



// Function to broadcast messages to all connected miners
function broadcast(message) {
    miners.forEach(miner => {
        if (miner.readyState === WebSocket.OPEN) {
            miner.send(JSON.stringify(message));
        }
    });
}


