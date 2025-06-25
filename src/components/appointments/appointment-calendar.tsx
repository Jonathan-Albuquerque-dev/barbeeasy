'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { getAppointmentsForDate, AppointmentStatus, AppointmentDocument, getServices, Service } from '@/lib/data';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { AddAppointmentDialog } from './add-appointment-dialog';
import { AppointmentStatusUpdater } from './appointment-status-updater';
import { AppointmentDetailsDialog } from './appointment-details-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, subDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

type Appointment = AppointmentDocument & {
  client: {
    id: string;
    name: string;
    avatarUrl: string;
    subscriptionId?: string;
  };
  barber: {
    id: string;
    name: string;
  };
};

export function AppointmentCalendar() {
  const { user } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const servicePriceMap = useMemo(() => new Map(services.map(s => [s.name, s.price])), [services]);

  const fetchAppointments = useCallback(async () => {
    if (!user?.uid || !date) return;
    
    setLoading(true);
    const [fetchedAppointments, fetchedServices] = await Promise.all([
      getAppointmentsForDate(user.uid, date),
      getServices(user.uid)
    ]);
    
    fetchedAppointments.sort((a, b) => a.time.localeCompare(b.time));
    setAppointments(fetchedAppointments as Appointment[]);
    setServices(fetchedServices);
    setLoading(false);
  }, [date, user]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleStatusChange = (appointmentId: string, newStatus: AppointmentStatus) => {
    setAppointments(prevAppointments =>
      prevAppointments.map(app =>
        app.id === appointmentId ? { ...app, status: newStatus } : app
      )
    );
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
      setPopoverOpen(false); // Close popover on date selection
    }
  }

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

  const AppointmentSkeleton = () => (
    <div className="flex items-center gap-4 px-6 py-4">
      <div className="text-center w-24 shrink-0 space-y-2">
        <Skeleton className="h-7 w-12 mx-auto" />
        <Skeleton className="h-5 w-16 mx-auto" />
      </div>
      <div className="flex-grow flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setDate(subDays(date, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className="w-[220px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "PPP", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus locale={ptBR}/>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday(date) && (
             <Button variant="ghost" onClick={() => setDate(new Date())}>Hoje</Button>
          )}
        </div>
        <AddAppointmentDialog onAppointmentAdded={fetchAppointments} initialDate={date}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>
        </AddAppointmentDialog>
      </div>
      
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-border">
              <AppointmentSkeleton />
              <AppointmentSkeleton />
              <AppointmentSkeleton />
            </div>
          ) : appointments.length > 0 ? (
            <div className="divide-y divide-border">
              {appointments.map(app => {
                const servicePrice = servicePriceMap.get(app.service) || 0;
                const productsTotal = (app.soldProducts || []).reduce((acc, p) => acc + (p.price * p.quantity), 0);
                const totalValue = servicePrice + productsTotal;
                
                return (
                  <div key={app.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors">
                    <div className="text-center w-24 shrink-0">
                      <p className="font-bold text-lg">{app.time}</p>
                      <Badge variant={getBadgeVariant(app.status)} className="mt-1">
                        {app.status}
                      </Badge>
                    </div>
                    <div className="flex-grow flex items-center gap-4">
                      <Avatar className="h-12 w-12 border">
                        <AvatarImage src={app.client.avatarUrl} data-ai-hint="person face" />
                        <AvatarFallback>{app.client.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-base">{app.service}</p>
                        <p className="text-sm text-muted-foreground">
                          {app.client.name} com {app.barber.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AppointmentStatusUpdater
                        appointment={app}
                        appointmentId={app.id}
                        currentStatus={app.status}
                        onStatusChange={(newStatus) => handleStatusChange(app.id, newStatus)}
                        totalValue={totalValue}
                      />
                      <AppointmentDetailsDialog appointment={app} onAppointmentUpdate={fetchAppointments}>
                        <Button variant="outline" size="sm">Detalhes</Button>
                      </AppointmentDetailsDialog>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <CalendarIcon className="h-16 w-16 text-muted-foreground/50" />
              <h3 className="mt-6 text-xl font-semibold">Nenhum agendamento</h3>
              <p className="mt-1 text-sm text-muted-foreground">Não há nada na agenda para este dia.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
