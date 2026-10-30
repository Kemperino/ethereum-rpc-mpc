# Ethereum RPC MPC Server

[![npm version](https://img.shields.io/npm/v/ethereum-rpc-mpc.svg)](https://www.npmjs.com/package/ethereum-rpc-mpc)
[![npm downloads](https://img.shields.io/npm/dm/ethereum-rpc-mpc.svg)](https://www.npmjs.com/package/ethereum-rpc-mpc)

A TypeScript MCP server that leverages the MCP SDK to support all Ethereum JSON-RPC calls, enabling AI models to interact with blockchain data.

## Overview

This project provides a Model Context Protocol (MCP) server that allows AI assistants like Cursor or Claude (or any MCP Client implementation) to interact with Ethereum blockchain data through standardized JSON-RPC interfaces. It acts as a bridge between AI models and EVM blockchains, enabling seamless access to on-chain data and functionality.

## Installation

```bash
# Clone the repository
git clone git@github.com:Phillip-Kemper/ethereum-rpc-mpc.git
cd ethereum-rpc-mpc

# Install dependencies
yarn install

# Build the project
yarn build

# Start Inspector with default Ethereum RPC (you can change in the inspector settings on )
yarn inspector
```

## Usage

### Using with Cursor

To use this MPC server with Cursor:

1. In Cursor, go to Settings > Cursor Settings > MCP
2. Add a new MCP server with the following configuration:
   - Name: Ethereum RPC
   - Type: Command
   - Command: `npx -y ethereum-rpc-mpc https://eth.llamarpc.com Ethereum`
   or
   - Command: `node /path/to/ethereum-rpc-mpc/dist/server/index.js https://eth.llamarpc.com Ethereum`

<img width="938" alt="Screenshot 2025-03-13 at 19 41 56" src="https://github.com/user-attachments/assets/f9e09d44-ea43-4ef2-9950-88300f6f9667" />

### Starting the Server

You can start the server by providing an Ethereum RPC URL and an optional chain name:

```bash
yarn start [RPC_URL] [CHAIN_NAME]

# Using npx (without installing)
npx -y ethereum-rpc-mpc [RPC_URL] [CHAIN_NAME]
```

If no RPC URL is provided, it will default to "https://eth.llamarpc.com".

Example:

```bash
# Connect to Ethereum mainnet
yarn start https://eth.llamarpc.com Ethereum
```

## Examples

Here are some examples of how to use the Ethereum RPC MPC server with Claude:

### Getting the Current Block Number

```
What's the current block number?
```

### Checking an Address Balance

```
What's the ETH balance of 0x742d35Cc6634C0532925a3b844Bc454e4438f44e?
```

### Getting Contract Information

```
Is 0x6B175474E89094C44Da98b954EedeAC495271d0F a smart contract? If yes, what kind of contract is it?
```

### Retrieving Transaction Details

```
Can you show me the details of transaction 0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060?
```

## Future Steps

### Next to RPC, also support indexed API access

We plan to extend the functionality beyond basic RPC calls to include support for indexed blockchain data APIs. This will enable more efficient querying of historical data and complex on-chain analytics.

### Multi Chain, Multi RPC Support

Future versions will support connecting to multiple chains and RPC endpoints simultaneously, allowing AI models to access data across different blockchains in a single session.

### Client Implementation

A future enhancement will be to develop a client-side implementation that makes it easier to interact with this MCP server from various applications.

## License

MIT 
