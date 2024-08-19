import express from 'express';
import WebSocket, { WebSocketServer } from 'ws';
import Blockchain from './Blockchain.js';
import { ECPairFactory } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import cors from 'cors';

const app = express();
const httpPort = 8081; // HTTP server port
const wsPort = 8080; // WebSocket server port
const ECPair = ECPairFactory(tinysecp);

app.use(cors({
    origin: 'http://localhost:3000',
    methods: 'GET,POST',
    credentials: true
}));

const blockchain = new Blockchain();
let miners = [];

app.use(express.json());

// Endpoint to generate a Bitcoin wallet
app.get('/genWallet', (req, res) => {
    try {
        const keyPair = ECPair.makeRandom();
        const privateKey = keyPair.toWIF();
        const publicKey = keyPair.publicKey.toString('hex');
        const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });

        res.json({ privateKey, publicKey, address });
    } catch (error) {
        console.error('Error generating wallet:', error);
        res.status(500).json({ error: 'Failed to generate wallet' });
    }
});

// Function to sign the transaction
const signTransaction = (privateKeyWIF, transaction) => {
    const keyPair = ECPair.fromWIF(privateKeyWIF);
    const transactionString = JSON.stringify(transaction);
    const hash = bitcoin.crypto.sha256(Buffer.from(transactionString));
    const signature = keyPair.sign(hash);
    return signature.toString('hex');
};

// API endpoint to sign a transaction
app.post('/signTransaction', (req, res) => {
    const { privateKey, transaction } = req.body;

    if (!privateKey || !transaction) {
        return res.status(400).json({ error: 'Missing private key or transaction data' });
    }

    try {
        const signature = signTransaction(privateKey, transaction);
        res.json({ signature });
    } catch (error) {
        console.error('Error signing transaction:', error);
        res.status(500).json({ error: 'Failed to sign transaction' });
    }
});


// Endpoint to get the current blockchain
app.get('/blockchain', (req, res) => {
    res.json(blockchain.getBlockchain());
});

// const verifyTransactionSignature = (transaction, signature, publicKey) => {
//     // Convert publicKey to Buffer
//     const publicKeyBuffer = Buffer.from(publicKey, 'hex');
    
//     // Recreate the key pair from the public key
//     const keyPair = ECPair.fromPublicKey(publicKeyBuffer);

//     // Create a hash of the transaction
//     const transactionString = JSON.stringify({
//         from: transaction.from,
//         to: transaction.to,
//         amount: transaction.amount
//     });
//     const hash = bitcoin.crypto.sha256(Buffer.from(transactionString));

//     // Convert signature from hex to Buffer
//     const signatureBuffer = Buffer.from(signature, 'hex');

//     console.log('Public Key (Buffer):', publicKeyBuffer);
//     console.log('Signature (Buffer):', signatureBuffer);
//     console.log('Hash:', hash);

//     // Verify the signature
//     return keyPair.verify(hash, signatureBuffer);
// };

app.post('/transaction', (req, res) => {
    const { from, to, amount, signature, publicKey } = req.body;

    console.log('Received transaction data:', req.body);

    if (!from || !to || !amount || !signature || !publicKey) {
        return res.status(400).json({ error: 'Invalid request data' });
    }

    const transaction = { from, to, amount ,signature, publicKey };

    console.log('Transaction object:', transaction);

    // const isValid = verifyTransactionSignature(transaction, signature, publicKey);

    // console.log('Signature verification result:', isValid);
    const isValid = blockchain.isValidTransaction(transaction);

    console.log('Transaction validation result:', isValid);

    if (isValid) {
        blockchain.handleNewTransaction(transaction);
        broadcast({ type: 'NEW_TRANSACTION', transaction });
        return res.status(200).send('Transaction added successfully');
    } else {
        return res.status(400).send('Invalid transaction');
    }
});


// Start the HTTP server
app.listen(httpPort, () => {
    console.log(`HTTP server listening on port ${httpPort}`);
});

// Start the WebSocket server on a different port
const wss = new WebSocketServer({ port: wsPort });

wss.on('connection', (ws) => {
    miners.push(ws);

    ws.send(JSON.stringify({ type: 'SYNC_RESPONSE', chain: blockchain.getBlockchain() }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'NEW_BLOCK':
                if (data.block) {
                    const added = blockchain.handleNewBlock(data.block, ws);
                    if (added) {
                        broadcast({ type: 'NEW_BLOCK', block: data.block });
                    }
                }
                break;
            case 'SYNC_REQUEST':
                ws.send(JSON.stringify({ type: 'SYNC_RESPONSE', chain: blockchain.getBlockchain() }));
                break;
            case 'NEW_TRANSACTION':
                if (data.transaction) {
                    const valid = blockchain.handleNewTransaction(data.transaction);
                    if (valid) {
                        broadcast({ type: 'NEW_TRANSACTION', transaction: data.transaction });
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

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
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

console.log(`WebSocket server listening on port ${wsPort}`);
