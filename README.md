# Simple Donation Tracker on Stacks

A decentralized application that allows users to make STX donations and track them transparently on the Stacks blockchain.

## Features

-   Make STX donations using Hiro Wallet or Xverse
-   View all donations in real-time
-   Transparent donation tracking on the blockchain
-   Modern and responsive UI

## Prerequisites

-   Node.js (v14 or higher)
-   npm or yarn
-   Hiro Wallet or Xverse browser extension
-   Stacks testnet account with some STX

## Smart Contract

The smart contract is written in Clarity and provides the following functions:

-   `make-donation`: Make a new donation
-   `get-donation`: Get details of a specific donation
-   `get-total-donations`: Get the total number of donations
-   `get-all-donations`: Get a list of all donation IDs
-   `get-total-amount`: Get the total amount of all donations

## Frontend

The frontend is built with Next.js and includes:

-   Wallet connection
-   Donation form
-   Donation history display
-   Real-time updates

## Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/simple-donation-tracker-on-stacks.git
cd simple-donation-tracker-on-stacks
```

2. Install dependencies:

```bash
# Install frontend dependencies
cd frontend
npm install
```

3. Deploy the smart contract:

```bash
# Deploy to testnet
npm run deploy:testnet
```

4. Start the frontend development server:

```bash
cd frontend
npm run dev
```

5. Open http://localhost:3000 in your browser

## Usage

1. Connect your Hiro Wallet or Xverse
2. Enter the amount of STX you want to donate
3. Confirm the transaction in your wallet
4. View your donation in the history list

## Testing

To run the smart contract tests:

```bash
npm run test
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
