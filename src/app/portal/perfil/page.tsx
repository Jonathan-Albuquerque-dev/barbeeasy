
'use client';

import { Suspense } from 'react';
import { ClientProfileForm } from '@/components/portal/client-profile-form';
import { Loader2 } from 'lucide-react';
import { useClientSession } from '../layout';

function PerfilPageContent() {
    const { session, loading } = useClientSession();

    if (loading || !session) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin h-12 w-12 text-primary" />
            </div>
        );
    }
    
    return (
         <div className="container mx-auto py-12 px-4">
            <div className="mx-auto max-w-4xl space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-tight">Meu Perfil</h1>
                    <p className="mt-2 text-lg text-muted-foreground">
                        Gerencie suas informações pessoais e de segurança.
                    </p>
                </div>
                <ClientProfileForm client={session} />
            </div>
        </div>
    )
}

export default function PerfilPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-12 w-12" /></div>}>
            <PerfilPageContent />
        </Suspense>
    )
}
