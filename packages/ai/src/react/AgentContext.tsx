import React, { createContext, useContext, ReactNode } from 'react';
import { AgentClient } from '../client';

interface AgentContextType {
    client: AgentClient | null;
}

const AgentContext = createContext<AgentContextType>({ client: null });

interface AgentProviderProps {
    apiKey: string;
    children: ReactNode;
}

export const AgentProvider: React.FC<AgentProviderProps> = ({ apiKey, children }) => {
    // Memoize client to prevent recreation on every render
    const client = React.useMemo(() => new AgentClient(apiKey), [apiKey]);

    return (
        <AgentContext.Provider value={{ client }}>
            {children}
        </AgentContext.Provider>
    );
};

export const useAgentClient = () => {
    const context = useContext(AgentContext);
    if (!context.client) {
        throw new Error("useAgentClient must be used within an AgentProvider");
    }
    return context.client;
};
