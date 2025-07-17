'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

/**
 * Root page.
 * 
 * This page's primary purpose is to redirect users to the correct starting point.
 * Authenticated barbershop owners are sent to their dashboard.
 * Unauthenticated users are sent to the admin login page.
 * 
 * The client portal has its own separate routing logic managed within its layout.
 */
export default function RootPage() {
  const { user, loading, isBarberOwner } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user && isBarberOwner) {
        router.replace('/dashboard');
      } else {
        // Default for any unauthenticated user or non-owner user landing here
        router.replace('/login');
      }
    }
  }, [user, loading, isBarberOwner, router]);

  return (
     <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
