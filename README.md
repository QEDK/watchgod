# watchgod

Watchgod is an API service for tracking transactions between Polygon and Ethereum. It has two modes, `testnet` and `mainnet` depending on where you want to run it.
It uses Blocknative's Webhook API under the hood to follow transactions. Please see `.env.example` to see the required configuration.

## Features
* Keeps track of older and newer hashes
* Network modes
* Schema-level and route-level validation
* Bearer-token-based authentication

## Authentication
Watchgod uses simple bearer tokens for authentication. You must pass proper headers like `Authorization: Bearer <YourTokenHere>` in your requests. For verification
of webhook updates, it uses the API key provided to Blocknative.
