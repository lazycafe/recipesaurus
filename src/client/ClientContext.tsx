import { createContext, useContext, ReactNode } from 'react';
import type { IClient } from './types';

const ClientContext = createContext<IClient | null>(null);

export interface ClientProviderProps {
  client: IClient;
  children: ReactNode;
}

export function ClientProvider({ client, children }: ClientProviderProps) {
  return (
    <ClientContext.Provider value={client}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient(): IClient {
  const client = useContext(ClientContext);
  if (!client) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return client;
}
