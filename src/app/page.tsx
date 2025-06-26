'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { user, loading, isBarberOwner } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (isBarberOwner) {
            router.replace('/dashboard');
        } else {
            router.replace('/portal/agendar');
        }
      } else {
        router.replace('/login'); // Default to admin login
      }
    }
  }, [user, loading, isBarberOwner, router]);

  return (
     <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
