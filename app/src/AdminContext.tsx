import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface AdminContextValue { token: string; setToken: (token: string) => void; clearToken: () => void }
const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState('');
  const value = useMemo(() => ({ token, setToken, clearToken: () => setToken('') }), [token]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error('useAdmin must be used inside AdminProvider.');
  return value;
}
