import express from 'express';
import {ECPairFactory} from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import CORS from 'cors';


const ECPair = ECPairFactory(tinysecp);

const app = express();
const port = process.env.PORT || 3001;

app.use(CORS());

// Endpoint to generate a Bitcoin wallet
app.get('/api/generate-wallet', (req, res) => {
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

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});