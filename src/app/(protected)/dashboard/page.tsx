'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getTodaysAppointments, getDashboardStats } from "@/lib/data";
import { Users, Calendar, DollarSign, Clock, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import type { AppointmentStatus, AppointmentDocument } from "@/lib/data";
import { AppointmentStatusUpdater } from "@/components/appointments/appointment-status-updater";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AppointmentDetailsDialog } from "@/components/appointments/appointment-details-dialog";

type PopulatedAppointment = AppointmentDocument & {
  client: { id: string; name: string; avatarUrl: string; };
  barber: { id: string; name: string; };
};
type Stats = Awaited<ReturnType<typeof getDashboardStats>>;

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [appointments, setAppointments] = useState<PopulatedAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
      if (user?.uid) {
        setLoading(true);
        const [fetchedStats, fetchedAppointments] = await Promise.all([
          getDashboardStats(user.uid),
          getTodaysAppointments(user.uid)
        ]);
        
        // Sort appointments by time before setting the state
        fetchedAppointments.sort((a, b) => a.time.localeCompare(b.time));

        setStats(fetchedStats);
        setAppointments(fetchedAppointments as PopulatedAppointment[]);
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Barbeiro</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={appointment.client.avatarUrl} alt={appointment.client.name} data-ai-hint="person face" />
                        <AvatarFallback>{appointment.client.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{appointment.client.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>{appointment.service}</TableCell>
                  <TableCell>{appointment.barber.name}</TableCell>
                  <TableCell>{appointment.time}</TableCell>
                  <TableCell>
                     <AppointmentStatusUpdater 
                        appointmentId={appointment.id} 
                        currentStatus={appointment.status} 
                        onStatusChange={(newStatus) => handleStatusChange(appointment.id, newStatus)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="ghost" size="sm">
                            <Link href={`/clients/${appointment.client.id}`}>Ver Perfil</Link>
                        </Button>
                        <AppointmentDetailsDialog appointment={appointment} onAppointmentUpdate={fetchDashboardData}>
                            <Button variant="outline" size="sm">Detalhes</Button>
                        </AppointmentDetailsDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
