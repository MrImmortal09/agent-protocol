"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { ALL_TOOLS } from "@agent-protocol/core";
import { AgentProvider, ChatWidget } from "@agent-protocol/ai";

// Dynamically import Wallet components to avoid hydration errors
const ConnectWalletButton = dynamic(
    () => import("./components/ConnectWalletButton"),
    { ssr: false }
);

export default function Home() {
    const { connected } = useWallet();

    // In a real app, this key would come fromenv or be proxy-managed. 
    // For this example, we use the value for our dev server.
    const API_KEY = "demo-key";

    return (
        <AgentProvider apiKey={API_KEY}>
            <div className="flex h-screen w-full flex-col bg-zinc-50 dark:bg-black text-black dark:text-white">
                {/* Header */}
                <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">A</span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">AI Agent Protocol</h1>
                    </div>
                    <ConnectWalletButton />
                </header>

                {/* Main Content */}
                <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                    <div className="max-w-2xl w-full text-center space-y-8 z-10">
                        <h2 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent pb-2">
                            Your Intelligent On-Chain Companion
                        </h2>
                        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
                            Interact with Solana and Ethereum simply by chatting. Manage assets, swap tokens, and execute transactions using natural language.
                        </p>

                        {!connected && (
                            <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg inline-block">
                                <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">
                                    Please connect your wallet to start.
                                </p>
                            </div>
                        )}

                        {connected && (
                            <div className="mt-8">
                                <p className="text-green-500 font-medium">Wallet Connected! Use the chat below.</p>
                            </div>
                        )}
                    </div>

                    {/* Background Elements */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />
                </main>

                {/* Chat Widget Integration */}
                {connected && (
                    <ChatWidget
                        title="Agent Protocol Assistant"
                        initialMessage="Hello! I can help you transfer assets on Solana/Ethereum or swap tokens. What would you like to do?"
                        tools={ALL_TOOLS}
                    />
                )}
            </div>
        </AgentProvider>
    );
}
