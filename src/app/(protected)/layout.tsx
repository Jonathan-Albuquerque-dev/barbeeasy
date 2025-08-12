
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { AppLayout } from '@/components/layout/app-layout';
import { Loader2 } from 'lucide-react';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isBarberOwner, setupComplete } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Not logged in, send to login page.
      router.replace('/login');
      return;
    }

    if (!setupComplete && pathname !== '/setup') {
      // Logged in but profile is not complete, force setup.
      router.replace('/setup');
      return;
    }

    if (setupComplete && !isBarberOwner && !pathname.startsWith('/portal')) {
        // This case shouldn't happen often with the new logic,
        // but as a safeguard, if they are not an owner, redirect away.
        router.replace('/portal/agendar');
    }

  }, [user, loading, isBarberOwner, setupComplete, router, pathname]);

  // Show a loader while authentication is in progress OR
  // if we are still determining if setup is complete.
  // Also, don't render the main AppLayout on the setup page.
  if (loading || !user || !setupComplete) {
    if (pathname === '/setup') {
      // Render children directly for the setup page without the main layout
      return <>{children}</>;
    }
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // All checks pass, render the protected layout.
  return <AppLayout>{children}</AppLayout>;
}
