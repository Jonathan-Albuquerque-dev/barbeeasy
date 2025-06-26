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
            // A client who lands on the root page must be sent to a place
            // where they can choose a barbershop. For now, we'll send them
            // to the login page, as they should access the app via a
            // barbershop-specific link.
            router.replace('/portal/login');
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
