
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { 
    AppointmentDocument, 
    getServices, 
    Service, 
    Subscription, 
    populateAppointments, 
    Staff, 
    getStaff,
    getBarbershopSettings,
    DayHours,
    AppointmentStatus
} from '@/lib/data';
import { useAuth } from '@/contexts/auth-context';
import { AddAppointmentDialog } from './add-appointment-dialog';
import { AppointmentDetailsDialog } from './appointment-details-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, subDays, isToday, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

type PopulatedAppointment = AppointmentDocument & {
  client: { id: string; name: string; avatarUrl: string; subscriptionId?: string };
  barber: { id: string; name: string; };
};

type BarbershopSettings = { operatingHours: DayHours; appointmentInterval: number };

const getStatusClasses = (status: AppointmentStatus) => {
    switch (status) {
        case 'Concluído':
            return 'border-l-4 border-success bg-success/10 hover:bg-success/20';
        case 'Em atendimento':
            return 'border-l-4 border-primary bg-primary/10 hover:bg-primary/20';
        case 'Confirmado':
            return 'border-l-4 border-secondary-foreground bg-secondary/80 hover:bg-secondary';
        case 'Pendente':
            return 'border-l-4 border-muted-foreground bg-muted/50 hover:bg-muted';
        default:
            return 'border-l-4 border-border';
    }
};

export function AppointmentSchedule() {
  const { user } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<PopulatedAppointment[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<BarbershopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  const serviceDurationMap = useMemo(() => new Map(services.map(s => [s.name, s.duration])), [services]);

  const fetchAppointments = useCallback((dateString: string) => {
    if (!user?.uid) return () => {};

    setLoading(true);
    const appointmentsCol = collection(db, `barbershops/${user.uid}/appointments`);
    const q = query(appointmentsCol, where("date", "==", dateString));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const appointmentDocs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AppointmentDocument[];
        
        const subscriptionsSnap = await getDocs(collection(db, `barbershops/${user.uid}/subscriptions`));
        const subscriptions = subscriptionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Subscription[];

        const populated = await populateAppointments(user.uid, appointmentDocs, subscriptions);
        
        setAppointments(populated as PopulatedAppointment[]);
        setLoading(false);
    }, (error) => {
        console.error(`Error fetching real-time appointments for ${dateString}: `, error);
        setLoading(false);
    });

    return unsubscribe;
  }, [user]);
  
  useEffect(() => {
    if (!user?.uid) return;

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [fetchedStaff, fetchedServices, fetchedSettings] = await Promise.all([
                getStaff(user.uid),
                getServices(user.uid),
                getBarbershopSettings(user.uid)
            ]);
            setStaff(fetchedStaff);
            setServices(fetchedServices);
            if (fetchedSettings) {
                setSettings({
                    operatingHours: fetchedSettings.operatingHours,
                    appointmentInterval: fetchedSettings.appointmentInterval,
                });
            }
        } catch (error) {
            console.error("Failed to fetch initial data", error);
        }
    };
    fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (!user?.uid || !date) return;
    
    const dateString = format(date, 'yyyy-MM-dd');
    const unsubscribe = fetchAppointments(dateString);

    return () => unsubscribe();
  }, [date, user, fetchAppointments]);
  
  const handleAppointmentChange = () => {
    const dateString = format(date, 'yyyy-MM-dd');
    fetchAppointments(dateString)();
  };
  
  const SLOT_HEIGHT_PX = 50; // A altura de cada slot de tempo em pixels

  const timeSlots = useMemo(() => {
    if (!settings) return [];
    
    const dayKeys: (keyof DayHours)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = date.getDay();
    const dayKey = dayKeys[dayOfWeek];
    const dayHours = settings.operatingHours[dayKey];
    
    if (!dayHours || !dayHours.open) return [];

    const slots = [];
    let currentTime = parse(dayHours.start, 'HH:mm', new Date());
    const endTime = parse(dayHours.end, 'HH:mm', new Date());

    while (currentTime < endTime) {
        slots.push(format(currentTime, 'HH:mm'));
        currentTime.setMinutes(currentTime.getMinutes() + settings.appointmentInterval);
    }
    return slots;
  }, [settings, date]);

  const getAppointmentPositionAndHeight = (appointment: PopulatedAppointment) => {
    if (!settings) return { top: 0, height: 0 };
    
    const dayKeys: (keyof DayHours)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = date.getDay();
    const dayKey = dayKeys[dayOfWeek];
    const dayHours = settings.operatingHours[dayKey];
    
    if(!dayHours?.start) return { top: 0, height: 0 };

    const calendarStart = parse(dayHours.start, 'HH:mm', new Date());
    const appointmentStart = parse(appointment.time, 'HH:mm', new Date());

    const diffInMinutes = (appointmentStart.getTime() - calendarStart.getTime()) / 60000;
    const top = (diffInMinutes / settings.appointmentInterval) * SLOT_HEIGHT_PX;

    const duration = serviceDurationMap.get(appointment.service) || settings.appointmentInterval;
    const height = (duration / settings.appointmentInterval) * SLOT_HEIGHT_PX - 2; // -2 para um pequeno espaçamento

    return { top, height };
  };

  if (!settings && !loading) {
      return <div>Por favor, configure seus horários de funcionamento primeiro.</div>
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center justify-center gap-2">
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
              <Calendar mode="single" selected={date} onSelect={(d) => { if (d) setDate(d); setPopoverOpen(false); }} initialFocus locale={ptBR}/>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday(date) && (
             <Button variant="ghost" onClick={() => setDate(new Date())}>Hoje</Button>
          )}
        </div>
        <AddAppointmentDialog onAppointmentAdded={handleAppointmentChange} initialDate={date}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>
        </AddAppointmentDialog>
      </div>
      
        <ScrollArea className="flex-grow w-full">
            <div className="grid grid-flow-col auto-cols-fr min-w-max h-full">
                {/* Time Gutter */}
                <div className="w-16 flex flex-col sticky left-0 bg-background z-10">
                    <div className="h-10 border-b border-r">&nbsp;</div>
                    <div className="relative flex-grow">
                        {timeSlots.map(time => (
                            <div key={time} style={{ height: `${SLOT_HEIGHT_PX}px` }} className="text-xs text-muted-foreground text-center pt-1 border-r border-t">
                                {time}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Staff Columns */}
                {staff.map(member => (
                    <div key={member.id} className="w-56 flex flex-col border-r">
                        <div className="h-10 border-b flex items-center justify-center p-2">
                            <h3 className="font-semibold text-sm truncate">{member.name}</h3>
                        </div>
                        <div className="relative flex-grow bg-muted/20">
                           {/* Grid lines */}
                           {timeSlots.map(time => <div key={time} style={{ height: `${SLOT_HEIGHT_PX}px` }} className="border-t"></div>)}
                           
                           {/* Appointments */}
                           {appointments
                               .filter(app => app.barberId === member.id)
                               .map(app => {
                                   const {top, height} = getAppointmentPositionAndHeight(app);
                                   return (
                                     <AppointmentDetailsDialog key={app.id} appointment={app} onAppointmentUpdate={handleAppointmentChange}>
                                        <div 
                                            className={cn(
                                                "absolute w-[95%] left-1/2 -translate-x-1/2 p-2 cursor-pointer transition-all duration-200 shadow-md rounded-lg",
                                                getStatusClasses(app.status)
                                            )}
                                            style={{ top: `${top + 1}px`, height: `${height}px` }}
                                        >
                                            <p className="text-xs font-bold truncate">{app.service}</p>
                                            <p className="text-xs text-muted-foreground truncate">{app.client.name}</p>
                                            <p className="text-[10px] text-muted-foreground/80 absolute bottom-1">{app.time}</p>
                                        </div>
                                     </AppointmentDetailsDialog>
                                   );
                               })
                           }
                        </div>
                    </div>
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    </>
  );
}
