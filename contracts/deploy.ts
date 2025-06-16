import { StacksTestnet } from '@stacks/network';
import {
    makeContractDeploy,
    broadcastTransaction,
    getNonce,
    AnchorMode,
    getAddressFromPrivateKey,
    TransactionVersion,
} from '@stacks/transactions';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env file
dotenv.config();

const network = new StacksTestnet();
const senderKey = process.env.SENDER_KEY; // Private key for deployment
const contractName = 'donation-tracker';

async function deployContract() {
    try {
        if (!senderKey) {
            throw new Error('SENDER_KEY environment variable is not set');
        }

        // Derive address from private key
        const senderAddress = getAddressFromPrivateKey(senderKey, TransactionVersion.Testnet);
        console.log('Your testnet address:', senderAddress);

        // Read contract source
        const contractPath = path.join(__dirname, 'donation-tracker.clar');
        const contractSource = fs.readFileSync(contractPath, 'utf8');
        console.log('Contract source loaded successfully.');

        // Get nonce
        const nonce = await getNonce(senderAddress, network);
        console.log('Nonce:', nonce);

        // Create transaction
        console.log('Creating transaction...');
        const transaction = await makeContractDeploy({
            contractName,
            codeBody: contractSource,
            senderKey,
            network,
            nonce,
            anchorMode: AnchorMode.Any,
        });
        console.log('Transaction created successfully.');

        // Broadcast transaction
        console.log('Broadcasting transaction...');
        const result = await broadcastTransaction(transaction, network);
        console.log('Deployment result:', result);

        if (result.error) {
            console.error('Deployment failed with error:', result.error);
        }
    } catch (error: any) {
        console.error('Deployment failed with error:', error);
        if (error.response) {
            console.error('Error response:', error.response);
        }
    }
}

deployContract();
