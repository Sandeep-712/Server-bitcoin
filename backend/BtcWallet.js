import express from 'express';
import {ECPairFactory} from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import cors from 'cors';
import Blockchain from './Blockchain.js';





const app = express();
const httpPort =  8081;
const ECPair = ECPairFactory(tinysecp);
const blockchain = new Blockchain();



app.use(cors({
    origin: 'http://localhost:3000',
    methods: 'GET,POST',
    credentials: true
}));

// Endpoint to generate a Bitcoin wallet
app.get('/genWallet', (req, res) => {
    try {
        const keyPair = ECPair.makeRandom();
        const privateKey = keyPair.toWIF();
        const publicKey = keyPair.publicKey.toString('hex');
        const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });
        console.log("send wallet keypair");

        res.json({ privateKey, publicKey, address });
    } catch (error) {
        console.error('Error generating wallet:', error);
        res.status(500).json({ error: 'Failed to generate wallet' });
    }
});


// Function to sign the transaction
const signTransaction = (privatekey, transaction) => {
    const keyPair = ECPair.fromWIF(privatekey);
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


app.post('/transaction', (req, res) => {
    const { from, to, amount, signature, publicKey } = req.body;

    // console.log('Received transaction data:', req.body);

    if (!from || !to || !amount || !signature || !publicKey) {
        return res.status(400).json({ error: 'Invalid request data' });
    }

    const transaction = { from, to, amount, signature, publicKey };

    // console.log('Transaction object:', transaction);
    const isValid = blockchain.isValidTransaction(transaction);

    // console.log('Transaction validation result:', isValid);

    if (isValid) {
        blockchain.handleNewTransaction(transaction);
        broadcast({ type: 'NEW_TRANSACTION', transaction });
        return res.status(200).send('Transaction added successfully');
    } else {
        return res.status(400).send('Invalid transaction');
    }
});



app.listen(httpPort, () => {
    console.log(`Server running on port ${httpPort}`);
});

