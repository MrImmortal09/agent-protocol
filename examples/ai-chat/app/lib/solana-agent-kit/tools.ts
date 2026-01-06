
// Tool definition for Gemini API (Swap)
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
  
  // Future tools can be added here (e.g. limitTool, dcaTool)
