import React, { useState } from 'react';
import CryptoJS from 'crypto-js';
import axios from 'axios';

const signTransaction = (privateKey, transaction) => {
    const transactionscript = JSON.stringify(transaction);
    const hash = CryptoJS.SHA256(transactionscript).toString();

    return CryptoJS.HmacSHA256(hash, privateKey).toString();
}

export default function Transactions() {
    const [privateKey, setPrivateKey] = useState('');
    const [publicKey, setPublicKey] = useState('');
    const [address, setAddress] = useState('');
    const [transaction, setTransaction] = useState({ from: '', to: '', amount: 0 });
    const [signTransactionHash, setSignTransactionHash] = useState('');

    const handleGenerateWallet = async () => {
        try {
            const response = await axios.get('http://localhost:8080/genWallet');
            const { privateKey, publicKey, address } = response.data;
            setPrivateKey(privateKey);
            setPublicKey(publicKey);
            setAddress(address);
        } catch (error) {
            console.error('Error generating wallet:', error);
        }
    }

    const handleSignTransaction = () => {
        const signedTransaction = signTransaction(privateKey, transaction);
        setSignTransactionHash(signedTransaction);
    }

    const handlesubmitTransaction = async () => {
        try {
            const response = await axios.post('http://localhost:8080/transaction', {
                from: transaction.from,
                to: transaction.to,
                amount: transaction.amount,
                signature: signTransactionHash,
                publicKey: publicKey
            });
            console.log(response.data);
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div>
            <h2>Bitcoin Wallet and Transactions</h2>
            <button onClick={handleGenerateWallet}>Generate Wallet</button>
            {privateKey && (
                <div>
                    <p><strong>Private Key:</strong> {privateKey}</p>
                    <p><strong>Public Key:</strong> {publicKey}</p>
                    <p><strong>Address:</strong> {address}</p>
                </div>
            )}
            <input
                type='text'
                placeholder='from Address'
                value={transaction.from}
                onChange={(e) => setTransaction({ ...transaction, from: e.target.value })}
            />
            <input
                type='text'
                placeholder='to Address'
                value={transaction.to}
                onChange={(e) => setTransaction({ ...transaction, to: e.target.value })}
            />
            <input
                type='number'
                placeholder='amount'
                value={transaction.amount}
                onChange={(e) => setTransaction({ ...transaction, amount: e.target.value })}
            />
            <button onClick={handleSignTransaction}>Sign Transaction</button>
            {signTransactionHash && (
                <div>
                    <p><strong>Signature:</strong> {signTransactionHash}</p>
                    <button onClick={handlesubmitTransaction}>Submit Transaction</button>
                </div>
            )}
        </div>
    )
};