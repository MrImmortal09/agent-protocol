import React, { useState, useRef, useEffect } from 'react';
import { useAgent } from './useAgent';

export interface ChatWidgetProps {
    title?: string;
    themeColor?: string; // Hex code
    initialMessage?: string;
    logo?: string; // URL
    position?: 'bottom-right' | 'bottom-left';
    isOpen?: boolean; // Controlled state
    onToggle?: (isOpen: boolean) => void;
    tools?: any[];
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
    title = "AI Agent",
    themeColor = "#2563eb",
    initialMessage = "How can I help you today?",
    position = 'bottom-right',
    isOpen: controlledIsOpen,
    onToggle,
    tools
}) => {
    const { messages, sendMessage, isLoading } = useAgent({ tools });
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const isControlled = controlledIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

    const toggleOpen = () => {
        const newState = !isOpen;
        if (isControlled && onToggle) {
            onToggle(newState);
        } else {
            setInternalIsOpen(newState);
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        const text = input;
        setInput("");
        await sendMessage(text);
    };

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen]);

    // Inline styles to avoid CSS dependency issues for consumers
    const posStyle: React.CSSProperties = position === 'bottom-right'
        ? { bottom: '24px', right: '24px' }
        : { bottom: '24px', left: '24px' };

    return (
        <div style={{ position: 'fixed', zIndex: 9999, ...posStyle, fontFamily: 'system-ui, sans-serif' }}>
            {/* Chat Window */}
            {isOpen && (
                <div style={{
                    marginBottom: '16px',
                    width: '350px',
                    height: '500px',
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    border: '1px solid #e5e7eb'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '16px',
                        backgroundColor: themeColor,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <h3 style={{ margin: 0, fontWeight: 600 }}>{title}</h3>
                        <button
                            onClick={toggleOpen}
                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px' }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Messages */}
                    <div style={{
                        flex: 1,
                        padding: '16px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        backgroundColor: '#f9fafb'
                    }}>
                        {/* Initial Message */}
                        <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                            <div style={{
                                backgroundColor: 'white',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                borderTopLeftRadius: '2px',
                                border: '1px solid #e5e7eb',
                                color: '#1f2937',
                                fontSize: '14px'
                            }}>
                                {initialMessage}
                            </div>
                        </div>

                        {messages.map((msg, idx) => (
                            <div key={idx} style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%'
                            }}>
                                <div style={{
                                    backgroundColor: msg.role === 'user' ? themeColor : 'white',
                                    color: msg.role === 'user' ? 'white' : '#1f2937',
                                    padding: '10px 14px',
                                    borderRadius: '12px',
                                    borderBottomRightRadius: msg.role === 'user' ? '2px' : '12px',
                                    borderTopLeftRadius: msg.role !== 'user' ? '2px' : '12px',
                                    border: msg.role !== 'user' ? '1px solid #e5e7eb' : 'none',
                                    fontSize: '14px'
                                }}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div style={{ alignSelf: 'flex-start', color: '#6b7280', fontSize: '12px', marginLeft: '8px' }}>
                                Agent is thinking...
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div style={{
                        padding: '12px',
                        borderTop: '1px solid #e5e7eb',
                        display: 'flex',
                        gap: '8px',
                        backgroundColor: 'white'
                    }}>
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type a message..."
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: '20px',
                                border: '1px solid #d1d5db',
                                outline: 'none',
                                fontSize: '14px'
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            style={{
                                backgroundColor: themeColor,
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: !input.trim() ? 0.5 : 1
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={toggleOpen}
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: themeColor,
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.2s'
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                </button>
            )}
        </div>
    );
};
