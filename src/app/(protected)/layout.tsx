
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { AppLayout } from '@/components/layout/app-layout';
import { Loader2 } from 'lucide-react';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isBarberOwner } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only perform redirects once the loading state is false.
    if (!loading) {
      if (!user) {
        // If no user, redirect to admin login.
        router.replace('/login');
      } else if (!isBarberOwner) {
        // If user is logged in but is NOT a barber owner (e.g., a client),
        // redirect them to the client portal.
        router.replace('/portal/agendar');
      }
      // If user is logged in AND is a barber owner, do nothing and let the page render.
    }
  }, [user, loading, isBarberOwner, router]);

  // Show a loader while authentication is in progress OR
  // if the user is not yet confirmed to be a barber owner.
  // This prevents a flash of content or incorrect redirects.
  if (loading || !user || !isBarberOwner) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Once all checks pass, render the protected layout with its children.
  return <AppLayout>{children}</AppLayout>;
}
