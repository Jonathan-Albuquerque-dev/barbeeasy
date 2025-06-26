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
    if (!loading) {
        if (!user) {
            router.replace('/login');
        } else if (!isBarberOwner) {
            // If a logged-in user is not an owner, redirect them away from admin panel
            router.replace('/portal/agendar');
        }
    }
  }, [user, loading, isBarberOwner, router]);

  // Show loader while checking auth or if the user is not an owner yet
  if (loading || !user || !isBarberOwner) {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
