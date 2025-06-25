'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTodaysAppointments, getDashboardStats, getServices } from "@/lib/data";
import { Users, Calendar, DollarSign, Clock, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useMemo } from "react";
import type { AppointmentStatus, AppointmentDocument, Service } from "@/lib/data";
import { AppointmentStatusUpdater } from "@/components/appointments/appointment-status-updater";
import { Button } from "@/components/ui/button";
import { AppointmentDetailsDialog } from "@/components/appointments/appointment-details-dialog";
import { Badge } from "@/components/ui/badge";

type PopulatedAppointment = AppointmentDocument & {
  client: { id: string; name: string; avatarUrl: string; subscriptionId?: string };
  barber: { id: string; name: string; };
};
type Stats = Awaited<ReturnType<typeof getDashboardStats>>;

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [appointments, setAppointments] = useState<PopulatedAppointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const servicePriceMap = useMemo(() => new Map(services.map(s => [s.name, s.price])), [services]);

  const fetchDashboardData = async () => {
      if (user?.uid) {
        setLoading(true);
        const [fetchedStats, fetchedAppointments, fetchedServices] = await Promise.all([
          getDashboardStats(user.uid),
          getTodaysAppointments(user.uid),
          getServices(user.uid)
        ]);
        
        // Sort appointments by time before setting the state
        fetchedAppointments.sort((a, b) => a.time.localeCompare(b.time));

        setStats(fetchedStats);
        setAppointments(fetchedAppointments as PopulatedAppointment[]);
        setServices(fetchedServices);
        setLoading(false);
      }
    }

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const handleStatusChange = (appointmentId: string, newStatus: AppointmentStatus) => {
    setAppointments(prevAppointments =>
      prevAppointments.map(app =>
        app.id === appointmentId ? { ...app, status: newStatus } : app
      )
    );

    // Re-fetch stats to reflect changes in revenue or pending counts
    if (user?.uid) {
      getDashboardStats(user.uid).then(setStats);
    }
  };

  const getBadgeVariant = (status: AppointmentStatus) => {
    switch (status) {
      case 'Concluído':
        return 'success';
      case 'Em atendimento':
        return 'default';
      case 'Confirmado':
        return 'secondary';
      case 'Pendente':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
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

      <Card>
        <CardHeader>
          <CardTitle>Reservas de Hoje</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {appointments.length > 0 ? (
            <div className="divide-y divide-border">
              {appointments.map((appointment) => {
                const servicePrice = servicePriceMap.get(appointment.service) || 0;
                const productsTotal = (appointment.soldProducts || []).reduce((acc, p) => acc + (p.price * p.quantity), 0);
                const totalValue = servicePrice + productsTotal;

                return (
                  <div key={appointment.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors">
                    <div className="text-center w-24 shrink-0">
                      <p className="font-bold text-lg">{appointment.time}</p>
                       <Badge variant={getBadgeVariant(appointment.status)} className="mt-1">
                        {appointment.status}
                      </Badge>
                    </div>
                    <div className="flex-grow flex items-center gap-4">
                      <Avatar className="h-12 w-12 border">
                        <AvatarImage src={appointment.client.avatarUrl} data-ai-hint="person face" />
                        <AvatarFallback>{appointment.client.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-base">{appointment.service}</p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.client.name} com {appointment.barber.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <AppointmentStatusUpdater
                        appointment={appointment}
                        appointmentId={appointment.id}
                        currentStatus={appointment.status}
                        onStatusChange={(newStatus) => handleStatusChange(appointment.id, newStatus)}
                        totalValue={totalValue}
                      />
                      <AppointmentDetailsDialog appointment={appointment} onAppointmentUpdate={fetchDashboardData}>
                        <Button variant="outline" size="sm">Detalhes</Button>
                      </AppointmentDetailsDialog>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6">
              <Calendar className="h-16 w-16 text-muted-foreground/50" />
              <h3 className="mt-6 text-xl font-semibold">Nenhuma reserva para hoje</h3>
              <p className="mt-1 text-sm text-muted-foreground">Aproveite o dia tranquilo ou adicione um novo agendamento.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
