import { Clarinet, Tx, Chain, Account, types } from '@stacks/clarinet-sdk';
import { assertEquals } from 'asserts';

Clarinet.test({
    name: 'Test donation creation and retrieval',
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const donor = accounts.get('wallet_1')!;
        const amount = 1000000; // 1 STX in microSTX

        // Make a donation
        let block = chain.mineBlock([Tx.contractCall('donation-tracker', 'add-donation', [types.uint(amount)], donor.address)]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);

        // Get the donation
        block = chain.mineBlock([Tx.contractCall('donation-tracker', 'get-donation', [types.uint(1)], deployer.address)]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);

        // Verify donation details
        const donation = block.receipts[0].result.expectSome().expectTuple();
        assertEquals(donation.amount, types.uint(amount));
        assertEquals(donation.sender, types.some(types.principal(donor.address)));
    },
});

Clarinet.test({
    name: 'Test getting all donations',
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const donor1 = accounts.get('wallet_1')!;
        const donor2 = accounts.get('wallet_2')!;
        const amount1 = 1000000; // 1 STX
        const amount2 = 2000000; // 2 STX

        // Make two donations
        let block = chain.mineBlock([
            Tx.contractCall('donation-tracker', 'add-donation', [types.uint(amount1)], donor1.address),
            Tx.contractCall('donation-tracker', 'add-donation', [types.uint(amount2)], donor2.address),
        ]);
        assertEquals(block.receipts.length, 2);
        assertEquals(block.height, 2);

        // Get all donations
        block = chain.mineBlock([Tx.contractCall('donation-tracker', 'get-all-donations', [], deployer.address)]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);

        // Verify the list contains both donations
        const donations = block.receipts[0].result.expectList();
        assertEquals(donations.length, 2);
    },
});

Clarinet.test({
    name: 'Test donation with zero amount',
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const donor = accounts.get('wallet_1')!;
        const amount = 0;

        // Try to make a donation with zero amount
        let block = chain.mineBlock([Tx.contractCall('donation-tracker', 'add-donation', [types.uint(amount)], donor.address)]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);

        // Verify the transaction failed
        assertEquals(block.receipts[0].result.expectErr(), 1); // ERR_INVALID_AMOUNT
    },
});
