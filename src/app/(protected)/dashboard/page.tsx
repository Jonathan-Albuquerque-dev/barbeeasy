
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats } from "@/lib/data";
import { Users, Calendar, DollarSign, Clock, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useCallback } from "react";
import { AppointmentSchedule } from "@/components/appointments/appointment-schedule";
import { format } from 'date-fns';

type Stats = Awaited<ReturnType<typeof getDashboardStats>>;

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user?.uid) return;

    // Only fetch stats, the schedule component will fetch its own data
    const fetchedStats = await getDashboardStats(user.uid);
    setStats(fetchedStats);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user?.uid) {
      setLoading(true);
      fetchStats();
    }
  }, [user, fetchStats]);


  if (loading || !stats) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel do Administrador</h1>
        <p className="text-muted-foreground">Bem-vindo(a) de volta, aqui está um resumo do seu dia.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Receita de Hoje
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R${stats.todaysRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Agendamentos de Hoje
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.todaysAppointments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingAppointments} pendente(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Clientes (Mês)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.newClients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageDuration} min</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-grow flex flex-col">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Reservas de Hoje</h2>
        <AppointmentSchedule />
      </div>
    </div>
  )
}
