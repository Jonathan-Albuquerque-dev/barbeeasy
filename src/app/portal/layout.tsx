'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { PortalNavbar } from '@/components/portal/navbar';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isBarberOwner } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname.includes('/portal/login') || pathname.includes('/portal/signup');

  useEffect(() => {
    // This layout is for any logged-in user.
    // If not logged in, and not on an auth page, redirect to the customer login page.
    if (!loading && !user && !isAuthPage) {
      router.replace('/portal/login');
    }
    
    // If a barber owner somehow lands here, send them to their dashboard.
    if (!loading && user && isBarberOwner) {
        router.replace('/dashboard');
    }
  }, [user, loading, isBarberOwner, isAuthPage, router]);

  if ((loading || !user) && !isAuthPage) {
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
    <div className="min-h-screen flex flex-col">
        <PortalNavbar />
        <main className="flex-1">
            {children}
        </main>
    </div>
  );
}
