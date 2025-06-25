'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { getAppointmentsForDate } from '@/lib/data';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '../ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { AddAppointmentDialog } from './add-appointment-dialog';

type Appointment = {
  id: string;
  clientId: string;
  barberId: string;
  service: string;
  date: string;
  time: string;
  status: 'Concluído' | 'Confirmado' | 'Pendente';
  client: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  barber: {
    id: string;
    name: string;
  };
};

export function AppointmentCalendar() {
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    if (!user?.uid || !date) return;
    
    setLoading(true);
    const fetchedAppointments = await getAppointmentsForDate(user.uid, date);
    setAppointments(fetchedAppointments as Appointment[]);
    setLoading(false);
  }, [date, user]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <Card>
          <CardContent className="p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="w-full"
              classNames={{
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent/50 text-accent-foreground"
              }}
            />
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{date ? date.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Selecione uma data'}</CardTitle>
                <CardDescription>
                  {loading ? 'Carregando agendamentos...' : `${appointments.length} agendamentos marcados.`}
                </CardDescription>
              </div>
              <AddAppointmentDialog onAppointmentAdded={fetchAppointments} initialDate={date}>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Agendar
                </Button>
              </AddAppointmentDialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-4 animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-muted"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-[250px] rounded bg-muted"></div>
                    <div className="h-4 w-[200px] rounded bg-muted"></div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-muted"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-[250px] rounded bg-muted"></div>
                    <div className="h-4 w-[200px] rounded bg-muted"></div>
                  </div>
                </div>
              </div>
            ) : appointments.length > 0 ? (
              <ul className="space-y-4">
                {appointments.map(app => (
                  <li key={app.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-background">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={app.client.avatarUrl} data-ai-hint="person face" />
                      <AvatarFallback>{app.client.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow">
                      <p className="font-semibold">{app.service}</p>
                      <p className="text-sm text-muted-foreground">
                        {app.client.name} com {app.barber.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{app.time}</p>
                      <Badge variant="secondary">{app.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground pt-8">Nenhum agendamento para este dia.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
