export const transferSOLTool = {
    name: "transferSOL",
    description: "Transfer SOL from the session wallet to another address. Use this when the user wants to send or transfer funds on Solana. You MUST provide a clear reason.",
    parameters: {
        type: "OBJECT",
        properties: {
            toAddress: {
                type: "STRING",
                description: "The destination Solana wallet address",
            },
            amount: {
                type: "NUMBER",
                description: "The amount of SOL to transfer",
            },
            reason: {
                type: "STRING",
                description: "A brief reason for this transaction, inferred from the conversation context. Do NOT ask the user.",
            },
        },
        required: ["toAddress", "amount"],
    },
};

export const transferETHTool = {
    name: "transferETH",
    description: "Transfer ETH from the session wallet to another address. Use this when the user wants to send or transfer funds on Ethereum or Sepolia. You MUST provide a clear reason.",
    parameters: {
        type: "OBJECT",
        properties: {
            toAddress: {
                type: "STRING",
                description: "The destination Ethereum wallet address (0x...)",
            },
            amount: {
                type: "NUMBER",
                description: "The amount of ETH to transfer",
            },
            reason: {
                type: "STRING",
                description: "A brief reason for this transaction, inferred from the conversation context. Do NOT ask the user.",
            },
        },
        required: ["toAddress", "amount"],
    },
};

export const getBalanceTool = {
    name: "getBalance",
    description: "Get the current balance of the session wallet for both Solana (SOL) and Ethereum (ETH). Use this when the user asks 'how much do I have?' or 'what is my balance?'.",
    parameters: {
        type: "OBJECT",
        properties: {},
    },
};

export const swapTool = {
    name: "swapTokens",
    description: "Swap tokens on Solana using Jupiter Aggregator. Use this when the user wants to exchange one token for another (e.g. 'Buy USDC with SOL', 'Swap JUP to SOL').",
    parameters: {
        type: "OBJECT",
        properties: {
            inputToken: {
                type: "STRING",
                description: "The ticker symbol of the token to sell (e.g. 'SOL', 'USDC').",
            },
            outputToken: {
                type: "STRING",
                description: "The ticker symbol of the token to buy (e.g. 'USDC', 'SOL').",
            },
            amount: {
                type: "NUMBER",
                description: "The amount of input token to swap (float).",
            },
            reason: {
                type: "STRING",
                description: "Inferred reason for the swap (e.g. 'User requested swap'). Do NOT ask user.",
            },
        },
        required: ["inputToken", "outputToken", "amount"],
    },
};

// Export all tools as a collection for easy import
export const ALL_TOOLS = [transferSOLTool, transferETHTool, getBalanceTool, swapTool];
