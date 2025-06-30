
'use client';

import React, { createContext, useContext, useEffect, useState, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { PortalNavbar } from '@/components/portal/navbar';
import type { Client } from '@/lib/data';

type ClientSession = Omit<Client, 'password' | 'preferences' | 'loyaltyPoints' | 'loyaltyStatus' | 'createdAt'> & {
    barbershopId: string;
};

interface ClientSessionContextType {
  session: ClientSession | null;
  loading: boolean;
  logout: () => void;
}

const ClientSessionContext = createContext<ClientSessionContextType>({
  session: null,
  loading: true,
  logout: () => {},
});

export const useClientSession = () => useContext(ClientSessionContext);

function PortalLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [session, setSession] = useState<ClientSession | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthPage = pathname.includes('/portal/login') || pathname.includes('/portal/signup');
  const barbershopId = searchParams.get('barbershopId');

  useEffect(() => {
    const sessionData = localStorage.getItem('clientSession');
    if (sessionData) {
        const parsedSession = JSON.parse(sessionData);
        // Basic validation
        if (parsedSession.id && parsedSession.barbershopId) {
            setSession(parsedSession);
        }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!session && !isAuthPage) {
        const loginUrl = barbershopId
          ? `/portal/login?barbershopId=${barbershopId}`
          : '/portal/login';
        router.replace(loginUrl);
      }
    }
  }, [session, loading, isAuthPage, router, barbershopId, pathname]);

  const logout = () => {
    localStorage.removeItem('clientSession');
    setSession(null);
    const loginUrl = barbershopId ? `/portal/login?barbershopId=${barbershopId}` : '/portal/login';
    router.push(loginUrl);
  };
  
  const contextValue = { session, loading, logout };

  if (loading || (!session && !isAuthPage)) {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }
  
  if (isAuthPage) {
      return <>{children}</>;
  }

  return (
    <ClientSessionContext.Provider value={contextValue}>
        <div className="min-h-screen flex flex-col">
            <PortalNavbar />
            <main className="flex-1">
                {children}
            </main>
        </div>
    </ClientSessionContext.Provider>
  );
}


export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        }>
            <PortalLayoutContent>{children}</PortalLayoutContent>
        </Suspense>
    )
}
