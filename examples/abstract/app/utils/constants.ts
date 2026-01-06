
export const SESSION_CONFIG = {
  MAX_TOTAL_SPEND_SOL: 0.1,
  MAX_TOTAL_SPEND_ETH: 0.01,
  MAX_PER_TX_SOL: 0.01,
  MAX_PER_TX_ETH: 0.001,
  SESSION_DURATION_MS: 15 * 60 * 1000, // 15 Minutes
};

// Mock verified merchants
export const VERIFIED_MERCHANTS = {
  SOLANA: {
    // "ACME_TRAVEL": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin", // Example Devnet wallet
    // "CLOUD_PROVIDER": "7Lq2a6K816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin", // Example Devnet wallet
  },
  ETHEREUM: {
    // "ACME_TRAVEL": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Example Sepolia wallet
    // "CLOUD_PROVIDER": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Example Sepolia wallet
  }
};
