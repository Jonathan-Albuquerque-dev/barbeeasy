'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getClientByAuthId, getServiceHistoryForClient } from '@/lib/data';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type ServiceHistoryItem = { date: string; service: string; barber: string; cost: number };

export default function MeusAgendamentosPage() {
    const { user, barbershopId } = useAuth();
    const [history, setHistory] = useState<ServiceHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchHistory() {
            if (!user || !barbershopId) return;

            try {
                setLoading(true);
                const clientProfile = await getClientByAuthId(barbershopId, user.uid);
                if (!clientProfile) {
                    throw new Error("Não foi possível encontrar seu perfil de cliente.");
                }

                const serviceHistory = await getServiceHistoryForClient(barbershopId, clientProfile.id);
                setHistory(serviceHistory);
            } catch (err: any) {
                setError(err.message || "Ocorreu um erro ao buscar seus dados.");
            } finally {
                setLoading(false);
            }
        }

        fetchHistory();
    }, [user, barbershopId]);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (error) {
         return (
            <div className="container mx-auto py-12 text-center">
                <h1 className="text-2xl font-bold text-destructive">Erro</h1>
                <p className="text-muted-foreground">{error}</p>
            </div>
        );
    }
    
    // Simple split for demonstration. A robust solution would compare with current date more accurately.
    const today = new Date();
    today.setHours(0,0,0,0);
    const upcomingAppointments = history.filter(item => new Date(item.date.split('/').reverse().join('-')) >= today);
    const pastAppointments = history.filter(item => new Date(item.date.split('/').reverse().join('-')) < today);


    return (
        <div className="container mx-auto py-12">
             <div className="mx-auto max-w-4xl space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-tight">Meus Agendamentos</h1>
                    <p className="mt-2 text-lg text-muted-foreground">
                        Veja seus horários futuros e seu histórico de serviços.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Próximos Agendamentos</CardTitle>
                    </CardHeader>
                    <CardContent>
                         {upcomingAppointments.length > 0 ? (
                            <ul className="space-y-4">
                                {upcomingAppointments.map((item, index) => (
                                    <li key={index} className="flex justify-between items-center p-4 rounded-lg border">
                                        <div>
                                            <p className="font-semibold">{item.service}</p>
                                            <p className="text-sm text-muted-foreground">com {item.barber} em {item.date}</p>
                                        </div>
                                        <Badge>Confirmado</Badge>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-center py-8">Você não tem agendamentos futuros.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Histórico de Serviços</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {pastAppointments.length > 0 ? (
                            <ul className="space-y-4">
                                {pastAppointments.map((item, index) => (
                                    <li key={index} className="flex justify-between items-center p-4 rounded-lg border">
                                        <div>
                                            <p className="font-semibold">{item.service}</p>
                                            <p className="text-sm text-muted-foreground">com {item.barber} em {item.date}</p>
                                        </div>
                                        <Badge variant="secondary">R${item.cost.toFixed(2)}</Badge>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-center py-8">Você ainda não tem serviços concluídos.</p>
                        )}
                    </CardContent>
                </Card>
             </div>
        </div>
    );
}
