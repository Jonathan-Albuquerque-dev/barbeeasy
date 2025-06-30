
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSubscriptions, getClientById, Subscription, assignSubscriptionToClient } from '@/lib/data';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { useClientSession } from '../layout';


function AssinaturasPageContent() {
    const { session, loading: sessionLoading } = useClientSession();
    const searchParams = useSearchParams();
    const barbershopId = searchParams.get('barbershopId');

    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [clientSubscriptionId, setClientSubscriptionId] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { toast } = useToast();
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');


    const fetchData = async () => {
        if (!barbershopId) {
            setError("Barbearia não identificada.");
            setLoading(false);
            return;
        }
        if (!session?.id) {
            // Wait for session
            return;
        }

        try {
            setLoading(true);
            const [subs, client] = await Promise.all([
                getSubscriptions(barbershopId),
                getClientById(barbershopId, session.id)
            ]);
            setSubscriptions(subs);
            setClientSubscriptionId(client?.subscriptionId);
        } catch (err: any) {
            setError(err.message || "Erro ao buscar assinaturas.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!sessionLoading) {
            fetchData();
        }
    }, [session, sessionLoading, barbershopId]);
    
    const handleSubscribe = async (subscription: Subscription) => {
        if (!session?.id || !barbershopId || !selectedPaymentMethod) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Dados incompletos para realizar assinatura.'});
            return;
        }
        
        setIsSubscribing(true);
        try {
            await assignSubscriptionToClient(barbershopId, session.id, subscription.id, subscription.name, selectedPaymentMethod);
            
            toast({ title: 'Sucesso!', description: `Você agora é assinante do plano ${subscription.name}!`});
            setClientSubscriptionId(subscription.id);
            await fetchData(); // Refresh data
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro ao Assinar', description: error.message });
        } finally {
            setIsSubscribing(false);
            setSelectedPaymentMethod('');
        }
    }


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

                {subscriptions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                        {subscriptions.map(plan => {
                            const isCurrentPlan = plan.id === clientSubscriptionId;
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
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button className="w-full" disabled={!!clientSubscriptionId}>Quero este plano</Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Confirmar Assinatura</DialogTitle>
                                                        <DialogDescription>
                                                            Você está prestes a assinar o plano "{plan.name}" por R${plan.price.toFixed(2)}/mês.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className='py-4 space-y-2'>
                                                        <Label>Forma de Pagamento para a 1ª cobrança</Label>
                                                         <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Selecione a forma de pagamento" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                                                <SelectItem value="Cartão de Crédito/Débito">Cartão de Crédito/Débito</SelectItem>
                                                                <SelectItem value="Pix">Pix</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <p className='text-xs text-muted-foreground'>O pagamento será realizado no estabelecimento.</p>
                                                    </div>
                                                    <DialogFooter>
                                                        <DialogClose asChild>
                                                          <Button variant="outline">Cancelar</Button>
                                                        </DialogClose>
                                                        <DialogClose asChild>
                                                            <Button onClick={() => handleSubscribe(plan)} disabled={isSubscribing || !selectedPaymentMethod}>
                                                                {isSubscribing ? <Loader2 className="animate-spin" /> : "Confirmar"}
                                                            </Button>
                                                        </DialogClose>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-8">Esta barbearia ainda não oferece planos de assinatura.</p>
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
