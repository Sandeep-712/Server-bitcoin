import React, { useState } from 'react'
import { generateWallet } from '../utils/Btcgen.js';

export default function Wallet() {
    const [wallet,setWallet]=useState(null);

    const handleGenerateWallet =async () => {
        const wallet = await generateWallet();
        setWallet(wallet);
    }

    return (
        <div>
            <button onClick={handleGenerateWallet}>Generate Wallet</button>
            {wallet && (
                <div>
                    <p>Address: {wallet.address}</p>
                    <p>Public Key: {wallet.publicKey}</p>
                    <p>Private Key: {wallet.privateKey}</p>
                </div>
            )}
        </div>

    )
}
