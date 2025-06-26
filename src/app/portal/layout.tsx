'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { PortalNavbar } from '@/components/portal/navbar';

function PortalLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading, isBarberOwner } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isAuthPage = pathname.includes('/portal/login') || pathname.includes('/portal/signup');
  const barbershopId = searchParams.get('barbershopId');

  useEffect(() => {
    if (!loading) {
      if (!user && !isAuthPage) {
        const loginUrl = barbershopId
          ? `/portal/login?barbershopId=${barbershopId}`
          : '/portal/login';
        router.replace(loginUrl);
      }
      
      if (user && isBarberOwner) {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, isBarberOwner, isAuthPage, router, barbershopId, pathname]);

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
