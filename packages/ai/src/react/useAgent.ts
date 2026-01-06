import { useState, useCallback } from 'react';
import { useAgentClient } from './AgentContext';
import { Message } from '../client';
import { ALL_TOOLS } from '@agent-protocol/core';

interface UseAgentOptions {
    tools?: any[];
}

export const useAgent = (options: UseAgentOptions = {}) => {
    const client = useAgentClient();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Default to ALL_TOOLS if not provided
    const tools = options.tools || ALL_TOOLS;

    const sendMessage = useCallback(async (content: string) => {
        setIsLoading(true);
        setError(null);

        const newMessages: Message[] = [...messages, { role: 'user', content }];
        setMessages(newMessages);

        try {
            const response = await client.chat({
                messages: newMessages,
                tools: tools
            });

            setMessages(prev => [...prev, { role: 'assistant', content: response.content }]);

            // Note: Tool execution logic would typically happen here or be returned to the caller
            // This hook currently basic chat. Tool handling might require a callback 
            // or we return the toolCalls for the UI to handle.
            return response;

        } catch (err: any) {
            setError(err);
            console.error("Chat Error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [client, messages, tools]);

    return {
        messages,
        sendMessage,
        isLoading,
        error
    };
};
