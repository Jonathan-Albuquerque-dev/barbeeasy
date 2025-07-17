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
  setClientSession: (sessionData: ClientSession) => void;
  logout: () => void;
}

const ClientSessionContext = createContext<ClientSessionContextType>({
  session: null,
  loading: true,
  setClientSession: () => {},
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
  const barbershopIdFromUrl = searchParams.get('barbershopId');

  useEffect(() => {
    // This effect runs once to initialize the session from localStorage.
    try {
      const sessionData = localStorage.getItem('clientSession');
      if (sessionData) {
        const parsedSession = JSON.parse(sessionData);
        if (parsedSession.id && parsedSession.barbershopId) {
          setSession(parsedSession);
        }
      }
    } catch (error) {
      console.error("Error reading client session from localStorage", error);
      localStorage.removeItem('clientSession');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // This effect handles navigation logic whenever the session or route changes.
    if (!loading) {
       if (!session && !isAuthPage) {
        // If not logged in and on a protected page, redirect to login.
        // We need to ensure barbershopId is persisted in the URL.
        const loginUrl = barbershopIdFromUrl ? `/portal/login?barbershopId=${barbershopIdFromUrl}` : '/portal/login';
        router.replace(loginUrl);
      }
    }
  }, [session, loading, isAuthPage, pathname, router, barbershopIdFromUrl]);
  
  const setClientSession = (sessionData: ClientSession) => {
    setSession(sessionData);
    localStorage.setItem('clientSession', JSON.stringify(sessionData));
  };
  
  const logout = () => {
    const currentBarbershopId = session?.barbershopId || searchParams.get('barbershopId');
    setSession(null);
    localStorage.removeItem('clientSession');
    const loginUrl = currentBarbershopId ? `/portal/login?barbershopId=${currentBarbershopId}` : '/portal/login';
    router.push(loginUrl);
  };
  
  const contextValue = { session, loading, setClientSession, logout };

  return (
    <ClientSessionContext.Provider value={contextValue}>
      {loading || (!session && !isAuthPage) ? (
        // Show a loader while checking auth or before redirecting unauth user
        <div className="flex h-screen items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : isAuthPage ? (
        // Render auth pages directly
        <>{children}</>
      ) : (
        // Render protected pages with layout
        <div className="min-h-screen flex flex-col">
            <PortalNavbar />
            <main className="flex-1">{children}</main>
        </div>
      )}
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
