'use client'

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getClientByAuthId, getAllAppointmentsForClient } from '@/lib/data';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type AppointmentItem = {
    date: string;
    time: string;
    service: string;
    barber: string;
    cost: number;
    status: 'Concluído' | 'Confirmado' | 'Pendente' | 'Em atendimento';
};

export default function MeusAgendamentosPage() {
    const { user, barbershopId } = useAuth();
    const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchHistory() {
            if (!user || !barbershopId) {
                setLoading(false);
                return;
            };

            try {
                setLoading(true);
                const clientProfile = await getClientByAuthId(barbershopId, user.uid);
                if (!clientProfile) {
                    throw new Error("Não foi possível encontrar seu perfil de cliente.");
                }

                const allAppointments = await getAllAppointmentsForClient(barbershopId, clientProfile.id);
                setAppointments(allAppointments);
            } catch (err: any) {
                setError(err.message || "Ocorreu um erro ao buscar seus dados.");
            } finally {
                setLoading(false);
            }
        }

        fetchHistory();
    }, [user, barbershopId]);
    
    const { upcomingAppointments, pastAppointments } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming: AppointmentItem[] = [];
        const past: AppointmentItem[] = [];

        appointments.forEach(item => {
            const itemDate = new Date(`${item.date}T00:00:00`); 
            
            if (item.status === 'Concluído') {
                past.push(item);
            } else if (itemDate >= today) {
                upcoming.push(item);
            } else {
                past.push(item);
            }
        });

        upcoming.sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
        past.sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());

        return { upcomingAppointments: upcoming, pastAppointments: past };
    }, [appointments]);

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
    
    const getStatusBadgeVariant = (status: AppointmentItem['status']) => {
        switch (status) {
            case 'Confirmado': return 'secondary';
            case 'Pendente': return 'outline';
            case 'Em atendimento': return 'default';
            default: return 'secondary';
        }
    };

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
                                    <li key={`upcoming-${index}`} className="flex justify-between items-center p-4 rounded-lg border">
                                        <div>
                                            <p className="font-semibold">{item.service}</p>
                                            <p className="text-sm text-muted-foreground">com {item.barber} em {format(new Date(`${item.date}T${item.time}`), "dd/MM/yyyy 'às' HH:mm", {locale: ptBR})}</p>
                                        </div>
                                        <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
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
                                    <li key={`past-${index}`} className="flex justify-between items-center p-4 rounded-lg border">
                                        <div>
                                            <p className="font-semibold">{item.service}</p>
                                            <p className="text-sm text-muted-foreground">com {item.barber} em {format(new Date(`${item.date}T${item.time}`), "dd/MM/yyyy 'às' HH:mm", {locale: ptBR})}</p>
                                        </div>
                                        {item.status === 'Concluído' ? (
                                             <Badge variant="success">R${item.cost.toFixed(2)}</Badge>
                                        ) : (
                                            <Badge variant="destructive">{item.status}</Badge>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-center py-8">Você ainda não tem serviços em seu histórico.</p>
                        )}
                    </CardContent>
                </Card>
             </div>
        </div>
    );
}
