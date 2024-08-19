import WebSocket from "ws";
import Blockchain from "./Blockchain.js";

const blockchain = new Blockchain();
const wss = new WebSocket('ws://localhost:8080');
let isSynchronized = false;

wss.on('open', () => {
    console.log("Connected to central server");
    wss.send(JSON.stringify({ type: 'SYNC_REQUEST' }));
});

wss.on('message', (message) => {
    try {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'SYNC_RESPONSE':
                blockchain.handleSyncResponse(data.chain);
                console.log('Blockchain synchronized');
                isSynchronized = true;
                startMining();
                break;
            case 'NEW_BLOCK':
                blockchain.handleNewBlock(data.block, wss);
                console.log('New block received and added');
                break;
            case 'NEW_TRANSACTION':
                blockchain.handleNewTransaction(data.transaction);
                console.log('New transaction received and added');
                break;
            default:
                console.error('Unknown message type:', data.type);
        }
    } catch (error) {
        console.error('Error parsing message:', error);
    }
});


wss.on('error', (error) => {
    console.error('WebSocket error:', error);
});

wss.on('close', () => {
    console.log('WebSocket connection closed');
    // Implement reconnection logic here if needed
});

function startMining() {
    if (isSynchronized) {
        // Example transactions for testing
        mineBlock([{ from: 'Sandy', to: 'Uday', amount: 10 }]);
        broadcastTransaction({ from: 'Alice', to: 'Bob', amount: 5 });
        // Log the current blockchain
        console.log('Latest Current blockchain:', blockchain.getBlockchain());
    } else {
        console.log('Waiting for initial synchronization...');
    }
}

function mineBlock(transactions) {
    try {
        const newBlock = blockchain.createBlock(transactions);

        console.log('Mining new block...');
        console.log('New block details:', newBlock);

        wss.send(JSON.stringify({ type: 'NEW_BLOCK', block: newBlock }));
        console.log('New block mined and sent to the network');

        // Add mining reward transaction
        const miningRewardAddress = 'miner_address'; // Replace with actual miner address
        blockchain.addTransaction({ from: 'network', to: miningRewardAddress, amount: 1 });
        broadcastTransaction({ from: 'network', to: miningRewardAddress, amount: 1 });
    } catch (error) {
        console.error('Error mining block:', error);
    }
}

function broadcastTransaction(transaction) {
    if (wss.readyState === WebSocket.OPEN) {
        if (blockchain.isValidTransaction(transaction)) {
            blockchain.addTransaction(transaction);
            wss.send(JSON.stringify({ type: 'NEW_TRANSACTION', transaction }));
            console.log('New transaction broadcasted to the network');
        } else {
            console.error('Invalid transaction:', transaction);
        }
    } else {
        console.error('WebSocket is not open. Cannot broadcast transaction.');
    }
}