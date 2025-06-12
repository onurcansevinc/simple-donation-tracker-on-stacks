import { StacksTestnet } from '@stacks/network';
import { makeContractDeploy, broadcastTransaction, getNonce } from '@stacks/transactions';
import * as fs from 'fs';
import * as path from 'path';

const network = new StacksTestnet();
const senderKey = process.env.SENDER_KEY; // Private key for deployment
const contractName = 'donation-tracker';

async function deployContract() {
    try {
        // Read contract source
        const contractPath = path.join(__dirname, '../contracts/donation-tracker.clar');
        const contractSource = fs.readFileSync(contractPath, 'utf8');

        // Get nonce
        const nonce = await getNonce(senderKey!, network);

        // Create transaction
        const transaction = await makeContractDeploy({
            contractName,
            codeBody: contractSource,
            senderKey,
            network,
            nonce,
        });

        // Broadcast transaction
        const result = await broadcastTransaction(transaction, network);
        console.log('Deployment result:', result);
    } catch (error) {
        console.error('Deployment failed:', error);
    }
}

deployContract();
