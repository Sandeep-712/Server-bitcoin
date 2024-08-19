// import * as tinysecp from "tiny-secp256k1";

// import ECPairFactory from "ecpair";
// import { payments } from "bitcoinjs-lib";

// const ECPair = ECPairFactory(tinysecp);


// // Create a random Bitcoin key pair
// export const generateWallet = () => {
//     try {
//         const keyPair = ECPair.makeRandom();
//         const privateKey = keyPair.toWIF();
//         const publicKey = keyPair.publicKey.toString("hex");
//         const { address } = payments.p2pkh({ pubkey: keyPair.publicKey });

//         return { privateKey, publicKey, address };
//     } catch (error) {
//         console.error("Error generating wallet:", error);
//         return null;
//     }
// };



// import * as elliptic from 'elliptic';
// import { payments } from 'bitcoinjs-lib';

// const ec = new elliptic.ec('secp256k1');

// export const generateWallet = () => {
//     try {
//         // Generate key pair
//         const keyPair = ec.genKeyPair();

//         // Get private and public keys
//         const privateKey = keyPair.getPrivate('hex');
//         const publicKey = keyPair.getPublic('hex');

//         // Generate address from public key
//         const { address } = payments.p2pkh({ pubkey: Buffer.from(publicKey, 'hex') });

//         return { privateKey, publicKey, address };
//     } catch (error) {
//         console.error('Error generating wallet:', error);
//         return null;
//     }
// };


import axios from 'axios';

export const generateWallet = async () => {
    try {
        const response = await axios.get('http://localhost:3001/api/generate-wallet');
        return response.data;
    } catch (error) {
        console.error('Error generating wallet:', error);
        return null;
    }
}