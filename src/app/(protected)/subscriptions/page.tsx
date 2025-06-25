'use client';

import { getSubscriptions, Subscription, getSubscriptionStats, SubscriptionStats } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, TrendingUp, CheckCircle2, Users, Calendar, DollarSign, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useCallback } from "react";
import { AddSubscriptionDialog } from "@/components/subscriptions/add-subscription-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AddSubscriberDialog } from "@/components/subscriptions/add-subscriber-dialog";


export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = useCallback(async () => {
    if (user?.uid) {
      setLoading(true);
      const [fetchedSubscriptions, fetchedStats] = await Promise.all([
          getSubscriptions(user.uid),
          getSubscriptionStats(user.uid),
      ]);
      setSubscriptions(fetchedSubscriptions);
      setStats(fetchedStats);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planos de Assinatura</h1>
          <p className="text-muted-foreground">Crie e gerencie seus planos de assinatura exclusivos.</p>
        </div>
        <div className="flex items-center gap-2">
            <AddSubscriberDialog onSubscriberAdded={fetchSubscriptions}>
                <Button variant="outline">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Adicionar Assinante
                </Button>
            </AddSubscriberDialog>
            <AddSubscriptionDialog onSubscriptionAdded={fetchSubscriptions}>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Plano
                </Button>
            </AddSubscriptionDialog>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Assinantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats?.totalSubscribers}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos via Assinatura (Mês)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats?.monthlyAppointments}</div>}
             <p className="text-xs text-muted-foreground">Funcionalidade em breve</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Bruta Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {loading ? <Skeleton className="h-8 w-2/4" /> : <div className="text-2xl font-bold">R${stats?.monthlyRevenue.toFixed(2)}</div>}
          </CardContent>
        </Card>
      </div>

      {loading && subscriptions.length === 0 ? (
         <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : subscriptions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
            {subscriptions.map(plan => (
            <Card key={plan.id} className="flex flex-col h-full">
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
            </Card>
            ))}
        </div>
      ) : (
        <div className="col-span-full flex flex-col items-center justify-center text-center py-16 rounded-lg border-2 border-dashed">
            <TrendingUp className="h-16 w-16 text-muted-foreground" />
            <h2 className="mt-6 text-xl font-semibold">Nenhum Plano de Assinatura Cadastrado</h2>
            <p className="mt-2 text-sm text-muted-foreground">Comece a oferecer vantagens criando seu primeiro plano.</p>
        </div>
      )}
    </div>
  );
}
