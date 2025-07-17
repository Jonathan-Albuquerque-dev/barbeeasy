'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSubscriptions, getClientById, Subscription, Client, getBarbershopSettings } from '@/lib/data';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useClientSession } from '../layout';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function AssinaturasPageContent() {
    const { session, loading: sessionLoading } = useClientSession();
    const searchParams = useSearchParams();
    const barbershopId = searchParams.get('barbershopId');

    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [client, setClient] = useState<Client | undefined>(undefined);
    const [barbershopSettings, setBarbershopSettings] = useState<{whatsappNumber?: string} | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { toast } = useToast();

    const isSubscribedAndActive = useMemo(() => {
        if (!client?.subscriptionId || !client.subscriptionEndDate) {
            return false;
        }
        return client.subscriptionEndDate.toDate() > new Date();
    }, [client]);

    const fetchData = async () => {
        if (!barbershopId) {
            setError("Estabelecimento não identificado.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const promises: [Promise<Subscription[]>, Promise<{whatsappNumber?: string} | undefined>, Promise<Client | undefined> | null] = [
                getSubscriptions(barbershopId),
                getBarbershopSettings(barbershopId),
                session?.id ? getClientById(barbershopId, session.id) : null
            ];

            const [subs, settings, clientData] = await Promise.all(promises);
            
            setSubscriptions(subs);
            setBarbershopSettings(settings || null);
            if (clientData) {
              setClient(clientData);
            }

        } catch (err: any) {
            setError(err.message || "Erro ao buscar dados.");
            toast({ variant: 'destructive', title: 'Erro', description: err.message });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!sessionLoading) {
            fetchData();
        }
    }, [session, sessionLoading, barbershopId]);
    
    const handleSubscriptionClick = (planName: string) => {
        if (!barbershopSettings?.whatsappNumber) {
            toast({
                variant: 'destructive',
                title: 'Contato não disponível',
                description: 'O estabelecimento não configurou um número de WhatsApp para contato.'
            });
            return;
        }
        const message = encodeURIComponent(`Olá! Gostaria de assinar o plano ${planName}.`);
        const whatsappUrl = `https://wa.me/${barbershopSettings.whatsappNumber.replace(/\D/g, '')}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };

    if (loading || sessionLoading) {
        return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (error) {
        return <div className="container mx-auto py-12 px-4 text-center"><h1 className="text-2xl font-bold text-destructive">Erro</h1><p className="text-muted-foreground">{error}</p></div>;
    }

    return (
        <div className="container mx-auto py-12 px-4">
            <div className="mx-auto max-w-4xl space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-tight">Planos de Assinatura</h1>
                    <p className="mt-2 text-lg text-muted-foreground">
                        Aproveite descontos e vantagens exclusivas.
                    </p>
                </div>
                
                 {isSubscribedAndActive && client?.subscriptionEndDate && (
                    <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
                        <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-300">
                            <CheckCircle2 />
                            Você é Assinante!
                        </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-green-700 dark:text-green-400">
                                Seu plano <strong>{client.subscriptionName}</strong> está ativo até {format(client.subscriptionEndDate.toDate(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.
                            </p>
                        </CardContent>
                    </Card>
                )}
                 {!isSubscribedAndActive && client?.subscriptionId && client?.subscriptionEndDate && (
                    <Card className="bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800">
                        <CardHeader>
                        <CardTitle className="text-yellow-800 dark:text-yellow-300">Plano Expirado</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <p className="text-yellow-700 dark:text-yellow-400">
                                Seu plano <strong>{client.subscriptionName}</strong> expirou. Assine novamente para continuar aproveitando os benefícios.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {subscriptions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                        {subscriptions.map(plan => {
                            const isCurrentPlan = plan.id === client?.subscriptionId && isSubscribedAndActive;
                            return (
                                <Card key={plan.id} className={`flex flex-col h-full ${isCurrentPlan ? 'border-primary ring-2 ring-primary' : ''}`}>
                                    <CardHeader>
                                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                        <div className="flex items-baseline gap-1 pt-2">
                                            <span className="text-4xl font-bold">R${plan.price.toFixed(2)}</span>
                                            <span className="text-muted-foreground">/mês</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <h3 className="font-semibold mb-3 text-sm text-muted-foreground">SERVIÇOS INCLUSOS</h3>
                                        <ul className="space-y-3">
                                            {plan.includedServices.map((service, index) => (
                                                <li key={index} className="flex items-center justify-between text-sm">
                                                    <span className="flex items-center gap-2">
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                        {service.serviceName}
                                                    </span>
                                                    <span className="font-mono text-right bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                                                        {service.discount}% OFF
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                    <CardFooter>
                                        {isCurrentPlan ? (
                                            <Button disabled className="w-full">Seu Plano Atual</Button>
                                        ) : (
                                            <Button 
                                                className="w-full" 
                                                onClick={() => handleSubscriptionClick(plan.name)}
                                                disabled={!barbershopSettings?.whatsappNumber}
                                            >
                                                Quero este plano
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-8">Este estabelecimento ainda não oferece planos de assinatura.</p>
                )}
            </div>
        </div>
    );
}

export default function AssinaturasPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-12 w-12" /></div>}>
            <AssinaturasPageContent />
        </Suspense>
    )
}
