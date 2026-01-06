"use client";

import { useState, useEffect, useRef } from "react";
import { Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { transferSOL, transferSOLTool, transferETH, transferETHTool } from "../utils/functions";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPublicClient, createWalletClient, http, formatEther, parseEther } from "viem";
import { sepolia } from "viem/chains";
import { useAccount, useSendTransaction, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { SESSION_CONFIG, VERIFIED_MERCHANTS } from "../utils/constants";
import { JupiterService } from "../lib/solana-agent-kit/jupiter.service";
import { swapTool } from "../lib/solana-agent-kit/tools";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { X, Bot, Shield, Clock, Wallet, Send } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface AIAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: "user" | "agent";
  content: string;
}

export default function AIAgentModal({ isOpen, onClose }: AIAgentModalProps) {
  // Solana Hooks
  const { connection } = useConnection();
  const { publicKey: solPublicKey, sendTransaction: sendSolTransaction } = useWallet();

  // Ethereum Hooks
  const { address: ethAddress, isConnected: isEthConnected } = useAccount();
  const { sendTransaction: sendEthTransaction } = useSendTransaction();
  const { connect: connectEth } = useConnect();

  // State
  const [sessionKey, setSessionKey] = useState<Keypair | null>(null); // SOL Keypair
  const [ethSessionKey, setEthSessionKey] = useState<string | null>(null); // ETH Private Key Hex
  
  const [balance, setBalance] = useState<number | null>(null); // SOL Balance
  const [ethBalance, setEthBalance] = useState<string | null>(null); // ETH Balance

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isFunding, setIsFunding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Security State
  const [sessionExpiry, setSessionExpiry] = useState<number>(0);
  const [totalSpentSOL, setTotalSpentSOL] = useState<number>(0);
  const [totalSpentETH, setTotalSpentETH] = useState<number>(0);
  
  // Configuration State
  const [isConfigured, setIsConfigured] = useState(false);
  const [config, setConfig] = useState({
    maxSpendSOL: SESSION_CONFIG.MAX_TOTAL_SPEND_SOL.toString(),
    maxSpendETH: SESSION_CONFIG.MAX_TOTAL_SPEND_ETH.toString(),
    durationMins: (SESSION_CONFIG.SESSION_DURATION_MS / 60000).toString(),
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Viem Public Client for reading ETH data
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http()
  });

  // Handle Animation on Open/Close
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300); // Wait for transition
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Load or generate session keys
  useEffect(() => {
    if (isOpen) {
      // Check for existing session
      const storedKey = localStorage.getItem("ai_session_key");
      const storedEthKey = localStorage.getItem("ai_session_key_eth");
      const storedExpiry = localStorage.getItem("ai_session_expiry");

      if (storedKey && storedEthKey && storedExpiry) {
        // Restore session
         try {
          const secretKey = Uint8Array.from(JSON.parse(storedKey));
          setSessionKey(Keypair.fromSecretKey(secretKey));
          setEthSessionKey(storedEthKey);
          setSessionExpiry(parseInt(storedExpiry));
          
          const storedSpentSOL = localStorage.getItem("ai_session_spent_sol");
          if (storedSpentSOL) setTotalSpentSOL(parseFloat(storedSpentSOL));

          const storedSpentETH = localStorage.getItem("ai_session_spent_eth");
          if (storedSpentETH) setTotalSpentETH(parseFloat(storedSpentETH));
          
          // Restore config from storage if available, otherwise default
          const storedConfig = localStorage.getItem("ai_session_user_config");
          if (storedConfig) {
             setConfig(JSON.parse(storedConfig));
          }

          setIsConfigured(true);
        } catch (e) {
            // Error restoring, reset
        }
      } else {
         setIsConfigured(false); // Show config form
      }
    }
  }, [isOpen]);

  // Fetch balances
  useEffect(() => {
    if (isOpen && isConfigured) {
      fetchBalances();
      const interval = setInterval(fetchBalances, 10000);
      return () => clearInterval(interval);
    } 
  }, [sessionKey, ethSessionKey, isOpen, connection, isConfigured]);

  // Check Expiry & Auto-Refund
  const isRevokingRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !sessionKey || !isConfigured || isRevokingRef.current) return;
    
    const checkExpiry = async () => {
        if (Date.now() > sessionExpiry && sessionExpiry > 0) {
            isRevokingRef.current = true;
            console.log("Session expired. Auto-refunding...");
            await handleRevokeSession(true); // Force revoke, no confirm
            alert("Session expired! Funds are being returned.");
            isRevokingRef.current = false; 
        }
    };

    const interval = setInterval(checkExpiry, 1000);
    return () => clearInterval(interval);
  }, [isOpen, sessionExpiry, sessionKey, ethSessionKey, isConfigured]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchBalances = async () => {
    // SOL
    if (sessionKey) {
      try {
        const bal = await connection.getBalance(sessionKey.publicKey);
        setBalance(bal / LAMPORTS_PER_SOL);
      } catch (e) {}
    }
    // ETH
    if (ethSessionKey) {
      try {
        const account = privateKeyToAccount(ethSessionKey as `0x${string}`);
        const bal = await publicClient.getBalance({ address: account.address });
        setEthBalance(formatEther(bal));
      } catch (e) {}
    }
  };

  const handleStartSession = () => {
    // Solana
    const keypair = Keypair.generate();
    setSessionKey(keypair);
    localStorage.setItem("ai_session_key", JSON.stringify(Array.from(keypair.secretKey)));

    // Ethereum
    const ethKey = generatePrivateKey();
    setEthSessionKey(ethKey);
    localStorage.setItem("ai_session_key_eth", ethKey);

    // Security Init
    const durationMs = parseFloat(config.durationMins) * 60 * 1000;
    const expiry = Date.now() + durationMs;
    setSessionExpiry(expiry);
    localStorage.setItem("ai_session_expiry", expiry.toString());
    
    // Save Config
    localStorage.setItem("ai_session_user_config", JSON.stringify(config));

    setTotalSpentSOL(0);
    localStorage.setItem("ai_session_spent_sol", "0");
    
    setTotalSpentETH(0);
    localStorage.setItem("ai_session_spent_eth", "0");

    setIsConfigured(true);
    setMessages([{ role: "agent", content: "Session initialized (SOL + ETH). How can I help you?" }]);
    isRevokingRef.current = false;
  };

  const handleRevokeSession = async (force: boolean = false) => {
    if (!force) {
        const confirmRevoke = window.confirm("Are you sure? This will refund remaining funds to your connected wallet and delete the session.");
        if (!confirmRevoke) return;
    }

    // Refund SOL
    if (sessionKey && solPublicKey) {
      try {
        const balanceLamports = await connection.getBalance(sessionKey.publicKey);
        const fee = 5000; // Standard fee (0.000005 SOL)
        if (balanceLamports > fee) {
          setMessages(prev => [...prev, { role: "agent", content: "Refunding SOL..." }]);
          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: sessionKey.publicKey,
              toPubkey: solPublicKey,
              lamports: balanceLamports - fee,
            })
          );
          const signature = await connection.sendTransaction(transaction, [sessionKey]);
          await connection.confirmTransaction(signature);
          console.log("Returned SOL to main wallet:", signature);
        }
      } catch (e) {
        console.error("Failed to refund SOL", e);
      }
    }

    // Refund ETH
    if (ethSessionKey && ethAddress && isEthConnected) {
        try {
            const ethAccount = privateKeyToAccount(ethSessionKey as `0x${string}`);
            const balanceWei = await publicClient.getBalance({ address: ethAccount.address });
            const gasPrice = await publicClient.getGasPrice();
            const cost = gasPrice * BigInt(21000);
            
            if (balanceWei > cost) {
                 setMessages(prev => [...prev, { role: "agent", content: "Refunding ETH..." }]);
                 const client = createWalletClient({
                    account: ethAccount,
                    chain: sepolia,
                    transport: http()
                  });
                  const hash = await client.sendTransaction({
                    to: ethAddress,
                    value: balanceWei - cost - (cost / BigInt(10)), // Safety buffer
                  });
                  console.log("Returned ETH to main wallet:", hash);
            }
        } catch (e) {
             console.error("Failed to refund ETH", e);
        }
    }

    localStorage.removeItem("ai_session_key");
    localStorage.removeItem("ai_session_key_eth");
    localStorage.removeItem("ai_session_expiry");
    localStorage.removeItem("ai_session_spent_sol");
    localStorage.removeItem("ai_session_spent_eth");
    localStorage.removeItem("ai_session_user_config");
    
    setSessionKey(null);
    setEthSessionKey(null);
    setSessionExpiry(0);
    setTotalSpentSOL(0);
    setTotalSpentETH(0);
    setBalance(null);
    setEthBalance(null);
    setMessages([]);
    setIsConfigured(false);
    onClose(); 
  };

  const handleFundSessionSOL = async () => {
    if (!solPublicKey || !sessionKey) return;
    setIsFunding(true);
    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: solPublicKey,
          toPubkey: sessionKey.publicKey,
          lamports: 0.05 * LAMPORTS_PER_SOL,
        })
      );
      const signature = await sendSolTransaction(transaction, connection);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
      await fetchBalances();
      setMessages(prev => [...prev, { role: "agent", content: "Received 0.05 SOL." }]);
    } catch (e) {
      console.error("SOL Funding failed", e);
    } finally {
      setIsFunding(false);
    }
  };

  const handleFundSessionETH = async () => {
    if (!ethAddress || !ethSessionKey) {
        connectEth({ connector: injected() }); // Prompt connect if not connected
        return;
    }
    setIsFunding(true);
    try {
      const sessionAccount = privateKeyToAccount(ethSessionKey as `0x${string}`);
      sendEthTransaction({
        to: sessionAccount.address,
        value: parseEther("0.001"), 
      }, {
        onSuccess: () => {
            setMessages(prev => [...prev, { role: "agent", content: "Transaction sent for 0.001 ETH." }]);
            // Balance update might take a moment
            setTimeout(fetchBalances, 5000);
        }
      });
    } catch (e) {
      console.error("ETH Funding failed", e);
    } finally {
      setIsFunding(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    // 1. Tool Gating Checks
    if (Date.now() > sessionExpiry) {
        setMessages(prev => [...prev, { role: "user", content: input }, { role: "agent", content: "Session expired. Please revoke and create a new one." }]);
        setInput("");
        return;
    }

    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      const maxSpendSOL = parseFloat(config.maxSpendSOL);
      const maxSpendETH = parseFloat(config.maxSpendETH);

      // Determine available tools based on allowance
      const availableTools = [];
      if (totalSpentSOL < maxSpendSOL) availableTools.push(transferSOLTool);
      if (totalSpentETH < maxSpendETH) availableTools.push(transferETHTool);
      if (totalSpentSOL < maxSpendSOL) availableTools.push(swapTool); // Enable Swap if SOL budget exists

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userMsg.content }] }],
            tools: availableTools.length > 0 ? [{ functionDeclarations: availableTools }] : undefined,
          }),
        }
      );

      const data = await response.json();
      const candidate = data.candidates?.[0]?.content?.parts?.[0];

      if (candidate?.functionCall) {
        const fc = candidate.functionCall;
        
        // SOL Transfer Logic
        if (fc.name === "transferSOL") {
          const { toAddress, amount, reason } = fc.args;
          
          // Security Checks
          const allowedMerchants = Object.values(VERIFIED_MERCHANTS.SOLANA);
          const isVerified = allowedMerchants.length === 0 || allowedMerchants.includes(toAddress); 
          
          if (!isVerified) {
             setMessages((prev) => [...prev, { role: "agent", content: `🚫 Blocked: Address ${toAddress} is not in the Merchant Allowlist.` }]);
             setIsProcessing(false);
             return;
          }
          if (amount > SESSION_CONFIG.MAX_PER_TX_SOL) {
             setMessages((prev) => [...prev, { role: "agent", content: `🚫 Blocked: Amount exceeds per-transaction limit of ${SESSION_CONFIG.MAX_PER_TX_SOL} SOL.` }]);
             setIsProcessing(false);
             return;
          }
          if (totalSpentSOL + amount > maxSpendSOL) {
             setMessages((prev) => [...prev, { role: "agent", content: `🚫 Blocked: Amount exceeds remaining session allowance.` }]);
             setIsProcessing(false);
             return;
          }

          const reasonLog = reason || "User request";
          setMessages((prev) => [...prev, { role: "agent", content: `Processing SOL transfer of ${amount} to ${toAddress}...\nReason: ${reasonLog}` }]);
           
            try {
               if (!sessionKey) throw new Error("No SOL session key");
               const signature = await transferSOL(connection, sessionKey, toAddress, amount);
               
               // Update State
               const newSpent = totalSpentSOL + amount;
               setTotalSpentSOL(newSpent);
               localStorage.setItem("ai_session_spent_sol", newSpent.toString());
               
               setMessages((prev) => [...prev, { role: "agent", content: `✅ SOL Transfer successful! Sig: ${signature}` }]);
               fetchBalances();
            } catch (e: any) {
               setMessages((prev) => [...prev, { role: "agent", content: `❌ SOL Transfer failed: ${e.message}` }]);
            }
         }
         
         // ETH Transfer Logic
         else if (fc.name === "transferETH") {
             const { toAddress, amount, reason } = fc.args;
 
             // Security Checks
             const allowedMerchants = Object.values(VERIFIED_MERCHANTS.ETHEREUM);
             const isVerified = allowedMerchants.length === 0 || allowedMerchants.includes(toAddress);
 
             if (!isVerified) {
                 setMessages((prev) => [...prev, { role: "agent", content: `🚫 Blocked: Address ${toAddress} is not in the Merchant Allowlist.` }]);
                 setIsProcessing(false);
                 return;
              }
              if (amount > SESSION_CONFIG.MAX_PER_TX_ETH) {
                 setMessages((prev) => [...prev, { role: "agent", content: `🚫 Blocked: Amount exceeds per-transaction limit of ${SESSION_CONFIG.MAX_PER_TX_ETH} ETH.` }]);
                 setIsProcessing(false);
                 return;
              }
             if (totalSpentETH + amount > maxSpendETH) {
                setMessages((prev) => [...prev, { role: "agent", content: `🚫 Blocked: Amount exceeds remaining session allowance.` }]);
                setIsProcessing(false);
                return;
             }
 
             const reasonLog = reason || "User request";
             setMessages((prev) => [...prev, { role: "agent", content: `Processing ETH transfer of ${amount} to ${toAddress}...\nReason: ${reasonLog}` }]);
             try {
                if (!ethSessionKey) throw new Error("No ETH session key");
                const hash = await transferETH(ethSessionKey, toAddress, amount);
                
                // Update State
                const newSpent = totalSpentETH + amount;
                setTotalSpentETH(newSpent);
                localStorage.setItem("ai_session_spent_eth", newSpent.toString());
 
                setMessages((prev) => [...prev, { role: "agent", content: `✅ ETH Transfer successful! Hash: ${hash}` }]);
                fetchBalances();
             } catch (e: any) {
                setMessages((prev) => [...prev, { role: "agent", content: `❌ ETH Transfer failed: ${e.message}` }]);
             }
         }
         
         // Jupiter Swap Logic
         else if (fc.name === "swapTokens") {
              const { inputToken, outputToken, amount, reason } = fc.args;
              const reasonLog = reason || "Strategic Swap";
              setMessages((prev) => [...prev, { role: "agent", content: `Analysing swap route for ${amount} ${inputToken} to ${outputToken}...\nContext: ${reasonLog}` }]);
 
              try {
                 if (!sessionKey) throw new Error("No SOL session key");
                 
                 const jupiterService = new JupiterService(connection);
                 
                 // 1. Resolve Mints
                 const inputTokenInfo = await jupiterService.getTokenInfo(inputToken);
                 const outputTokenInfo = await jupiterService.getTokenInfo(outputToken);
 
                 if (!inputTokenInfo || !outputTokenInfo) {
                     throw new Error(`Token not supported or recognized: ${!inputTokenInfo ? inputToken : outputToken}. (Demo supports: SOL, USDC, USDT, JUP)`);
                 }
 
                 // 2. Safety Check (Strict List is implicit in getTokenInfo for now, but good to note)
                 // In a full package, we would hit the Strict List API here.
 
                 // 3. Prepare Amount (Atomic Units)
                 const amountAtomic = Math.floor(amount * (10 ** inputTokenInfo.decimals));
 
                 // 4. Get Quote
                 const quote = await jupiterService.getQuote(inputTokenInfo.mint, outputTokenInfo.mint, amountAtomic);
                 
                 const outAmountHuman = (parseInt(quote.outAmount) / (10 ** outputTokenInfo.decimals)).toFixed(4);
                 setMessages((prev) => [...prev, { role: "agent", content: `Route found! Swapping for approx ${outAmountHuman} ${outputToken} via Jupiter...` }]);
 
                 // 5. Get Transaction
                 const swapTransactionBase64 = await jupiterService.getSwapTransaction(quote, sessionKey.publicKey.toBase58());
 
                 // 6. Deserialize
                 const swapTransaction = await jupiterService.deserializeTransaction(swapTransactionBase64);
 
                 // 7. Sign (Session Key)
                 swapTransaction.sign([sessionKey]);
 
                 // 8. Execute
                 const rawTransaction = swapTransaction.serialize();
                 const signature = await connection.sendRawTransaction(rawTransaction, {
                     skipPreflight: true,
                     maxRetries: 2
                 });
                 
                 await connection.confirmTransaction(signature, "confirmed");
 
                 setMessages((prev) => [...prev, { role: "agent", content: `✅ Swap Successful! \nSig: ${signature}\nRecieved approx ${outAmountHuman} ${outputToken}` }]);
                 fetchBalances(); // Refresh to see new SOL balance (if involved)
 
              } catch (e: any) {
                 console.error("Swap Error", e);
                 setMessages((prev) => [...prev, { role: "agent", content: `❌ Swap failed: ${e.message}` }]);
              }
         }

      } else {
        const aiText = candidate?.text || "Sorry, I couldn't understand that.";
        setMessages((prev) => [...prev, { role: "agent", content: aiText }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "agent", content: "Error communicating with AI service." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen && !isVisible) return null;

  return (
    <>
      {/* Sidebar Overlay */}
      <div 
        className={cn(
            "fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )} 
        onClick={onClose} 
      />
      
      {/* Sidebar Container */}
      <div 
        className={cn(
            "fixed top-0 right-0 z-50 h-full w-[400px] bg-background/95 backdrop-blur-md border-l shadow-2xl flex flex-col transition-transform duration-300 ease-out",
            isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-background to-muted/20">
           <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-sm">AI Agent</h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Autonomous Mode</p>
              </div>
           </div>
           <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10 hover:text-destructive">
             <X className="w-4 h-4" />
           </Button>
        </div>

        {/* Content */}
        {!isConfigured ? (
          <div className="flex-1 p-8 flex flex-col gap-8 justify-center animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="text-center space-y-3">
                <div className="bg-primary/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-primary/20">
                    <Shield className="w-10 h-10 text-primary opacity-80" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">Secure Session</h3>
                <p className="text-sm text-muted-foreground max-w-[250px] mx-auto leading-relaxed">
                    Configure spending limits and duration for your autonomous agent session.
                </p>
             </div>
             
             <Card className="border-primary/10 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Session Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                     <label className="text-xs font-semibold flex justify-between">
                        Max Spend (SOL)
                        <span className="text-muted-foreground font-normal">0.1 recommended</span>
                     </label>
                     <Input 
                       type="number" 
                       value={config.maxSpendSOL} 
                       onChange={(e) => setConfig({...config, maxSpendSOL: e.target.value})}
                       className="font-mono text-sm" 
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-semibold flex justify-between">
                        Max Spend (ETH)
                        <span className="text-muted-foreground font-normal">0.01 recommended</span>
                     </label>
                     <Input 
                       type="number" 
                       value={config.maxSpendETH} 
                       onChange={(e) => setConfig({...config, maxSpendETH: e.target.value})} 
                       className="font-mono text-sm"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-semibold">Duration (Minutes)</label>
                     <Input 
                       type="number" 
                       value={config.durationMins} 
                       onChange={(e) => setConfig({...config, durationMins: e.target.value})}
                       className="font-mono text-sm" 
                     />
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                   <Button className="w-full font-semibold shadow-md" onClick={handleStartSession}>
                     Create Secure Session
                   </Button>
                </CardFooter>
             </Card>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-300">
             
             {/* Security & Balance Status Bar */}
             <div className="bg-muted/30 p-4 space-y-3 border-b backdrop-blur-sm">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2 text-foreground font-medium">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-xs">Expires in <span className="font-bold">{Math.max(0, Math.floor((sessionExpiry - Date.now()) / 60000))}m</span></span>
                   </div>
                   <div className={cn(
                       "text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-sm",
                       Object.keys(VERIFIED_MERCHANTS.SOLANA).length > 0
                        ? "bg-green-500/10 text-green-600 border-green-200 dark:border-green-900"
                        : "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-900"
                   )}>
                      {Object.keys(VERIFIED_MERCHANTS.SOLANA).length > 0 ? "🔒 Verified Only" : "🔓 Open Mode"}
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {/* SOL Stats */}
                    <div className="bg-background rounded-lg p-2.5 border shadow-sm space-y-1">
                       <div className="flex items-center gap-1.5 border-b pb-1 mb-1">
                           <div className="w-2 h-2 rounded-full bg-blue-500" />
                           <span className="text-[10px] font-bold text-foreground">SOLANA</span>
                       </div>
                       <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Bal</span> 
                          <span className="font-mono text-foreground font-medium">{balance !== null ? balance.toFixed(4) : "0.0000"}</span>
                       </div>
                       <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Limit</span> 
                          <span className="font-mono text-foreground font-medium">{(parseFloat(config.maxSpendSOL) - totalSpentSOL).toFixed(4)}</span>
                       </div>
                    </div>

                    {/* ETH Stats */}
                    <div className="bg-background rounded-lg p-2.5 border shadow-sm space-y-1">
                       <div className="flex items-center gap-1.5 border-b pb-1 mb-1">
                           <div className="w-2 h-2 rounded-full bg-purple-500" />
                           <span className="text-[10px] font-bold text-foreground">ETHEREUM</span>
                       </div>
                       <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Bal</span> 
                          <span className="font-mono text-foreground font-medium">{ethBalance !== null ? parseFloat(ethBalance).toFixed(4) : "0.0000"}</span>
                       </div>
                       <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Limit</span> 
                          <span className="font-mono text-foreground font-medium">{(parseFloat(config.maxSpendETH) - totalSpentETH).toFixed(4)}</span>
                       </div>
                    </div>
                </div>
             </div>

             {/* Chat Area */}
             <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-transparent to-muted/10">
               <div className="space-y-6">
                 {messages.map((msg, idx) => (
                   <div
                     key={idx}
                     className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                   >
                     <div
                       className={cn(
                         "max-w-[85%] rounded-2xl px-5 py-3 text-sm shadow-sm",
                         msg.role === "user"
                           ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-br-sm"
                           : "bg-white dark:bg-zinc-800 border text-foreground rounded-bl-sm"
                       )}
                     >
                       {msg.content}
                     </div>
                   </div>
                 ))}
                 {isProcessing && (
                   <div className="flex justify-start animate-in fade-in zoom-in-95 duration-300">
                      <div className="bg-muted/50 rounded-2xl rounded-bl-none px-4 py-2 text-xs flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                         <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                         <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                      </div>
                   </div>
                 )}
                 <div ref={messagesEndRef} />
               </div>
             </ScrollArea>

             {/* Actions & Input */}
             <div className="p-4 border-t space-y-3 bg-background/80 backdrop-blur">
                {/* Fund Buttons */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                   {solPublicKey && (
                      <Button variant="outline" size="sm" className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-900/20" onClick={handleFundSessionSOL} disabled={isFunding}>
                        Fund SOL
                      </Button>
                   )}
                   <Button variant="outline" size="sm" className="h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-900 dark:text-purple-300 dark:hover:bg-purple-900/20" onClick={handleFundSessionETH} disabled={isFunding}>
                      {isEthConnected ? "Fund ETH" : "Connect ETH"}
                   </Button>
                   <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive ml-auto" onClick={() => handleRevokeSession()}>
                     Revoke Session
                   </Button>
                </div>

                <div className="flex gap-2 relative">
                   <Input 
                     value={input}
                     onChange={(e) => setInput(e.target.value)}
                     onKeyDown={(e) => e.key === "Enter" && handleSend()}
                     placeholder="Type a command..."
                     className="flex-1 pr-10 shadow-sm border-muted-foreground/20 focus-visible:ring-primary/20"
                   />
                   <Button size="icon" className="absolute right-1 top-1 h-8 w-8 shadow-none" onClick={handleSend} disabled={!input.trim() || isProcessing}>
                      <Send className="w-4 h-4" />
                   </Button>
                </div>
             </div>
          </div>
        )}
      </div>
    </>
  );
}
