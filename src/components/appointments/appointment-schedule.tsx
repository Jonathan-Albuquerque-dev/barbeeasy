
'use client';

import React, { useState, useEffect, useMemo, useCallback, DragEvent } from 'react';
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
    AppointmentStatus,
    updateAppointmentDetails
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
import { useToast } from '@/hooks/use-toast';

type PopulatedAppointment = AppointmentDocument & {
  client: { id: string; name: string; avatarUrl: string; subscriptionId?: string };
  barber: { id: string; name: string; };
};

type BarbershopSettings = { operatingHours: DayHours; appointmentInterval: number };

const getStatusClasses = (status: AppointmentStatus) => {
    switch (status) {
        case 'Concluído':
            return 'bg-green-100 border-green-400 text-green-800 hover:bg-green-200/80 dark:bg-green-900/40 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/60';
        case 'Em atendimento':
            return 'bg-yellow-100 border-yellow-400 text-yellow-800 hover:bg-yellow-200/80 dark:bg-yellow-900/40 dark:border-yellow-700 dark:text-yellow-300 dark:hover:bg-yellow-900/60';
        case 'Confirmado':
            return 'bg-blue-100 border-blue-400 text-blue-800 hover:bg-blue-200/80 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/60';
        case 'Pendente':
            return 'bg-muted/80 border-border text-muted-foreground hover:bg-muted';
        default:
            return 'bg-secondary border-border hover:bg-secondary/90';
    }
};

export function AppointmentSchedule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<PopulatedAppointment[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<BarbershopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  // Drag and Drop state
  const [draggedAppointment, setDraggedAppointment] = useState<PopulatedAppointment | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropTarget, setDropTarget] = useState<{ barberId: string; time: string } | null>(null);


  const serviceDurationMap = useMemo(() => new Map(services.map(s => [s.name, s.duration])), [services]);
  
  const serviceToStaffMap = useMemo(() => {
    const map = new Map<string, string[]>();
    services.forEach(service => {
        map.set(service.name, service.staffIds);
    });
    return map;
  }, [services]);

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
  
  const SLOT_HEIGHT_PX = 80;

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
    const height = (duration / settings.appointmentInterval) * SLOT_HEIGHT_PX - 2;

    return { top, height };
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: DragEvent<HTMLDivElement>, appointment: PopulatedAppointment) => {
    setDraggedAppointment(appointment);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setDragImage(new Image(), 0, 0);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, targetBarberId: string) => {
    e.preventDefault();
    if (!draggedAppointment) return;

    const qualifiedStaff = serviceToStaffMap.get(draggedAppointment.service);
    if (!qualifiedStaff || !qualifiedStaff.includes(targetBarberId)) {
        e.dataTransfer.dropEffect = 'none';
        setDropTarget(null);
        return;
    }
    
    e.dataTransfer.dropEffect = 'move';

    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;

    const slotIndex = Math.floor(offsetY / SLOT_HEIGHT_PX);
    const newTime = timeSlots[slotIndex];

    if (newTime) {
        setDropTarget({ barberId: targetBarberId, time: newTime });
    } else {
        setDropTarget(null);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDropTarget(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetBarberId: string) => {
    e.preventDefault();
    if (!draggedAppointment || !user || !settings || !dropTarget) return;

    // Final validation check on drop
    const qualifiedStaff = serviceToStaffMap.get(draggedAppointment.service);
    if (!qualifiedStaff || !qualifiedStaff.includes(targetBarberId)) {
        toast({
            variant: 'destructive',
            title: 'Movimento Inválido',
            description: `Este profissional não realiza o serviço de "${draggedAppointment.service}".`,
        });
        return;
    }

    const { time: newTime } = dropTarget;

    // --- Validation ---
    const newAppointmentEndTime = parse(newTime, 'HH:mm', new Date());
    const duration = serviceDurationMap.get(draggedAppointment.service) || settings.appointmentInterval;
    newAppointmentEndTime.setMinutes(newAppointmentEndTime.getMinutes() + duration);
    
    const dayKeys: (keyof DayHours)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = date.getDay();
    const dayKey = dayKeys[dayOfWeek];
    const calendarEndTime = parse(settings.operatingHours[dayKey].end, 'HH:mm', new Date());

    if (newAppointmentEndTime > calendarEndTime) {
        toast({ variant: 'destructive', title: 'Horário Inválido', description: 'O agendamento ultrapassa o horário de funcionamento.' });
        return;
    }

    const targetBarberAppointments = appointments.filter(app => app.barberId === targetBarberId && app.id !== draggedAppointment.id);

    const collision = targetBarberAppointments.some(app => {
        const existingAppStart = parse(app.time, 'HH:mm', new Date());
        const existingAppDuration = serviceDurationMap.get(app.service) || settings.appointmentInterval;
        const existingAppEnd = new Date(existingAppStart.getTime() + existingAppDuration * 60000);
        
        const newAppStart = parse(newTime, 'HH:mm', new Date());
        const newAppEnd = new Date(newAppStart.getTime() + duration * 60000);

        return newAppStart < existingAppEnd && newAppEnd > existingAppStart;
    });

    if (collision) {
        toast({ variant: 'destructive', title: 'Conflito de Horário', description: 'O horário selecionado já está ocupado.' });
        return;
    }
    
    // --- Update Firestore ---
    try {
        await updateAppointmentDetails(user.uid, draggedAppointment.id, {
            time: newTime,
            barberId: targetBarberId,
        });
        toast({ title: 'Sucesso!', description: 'Agendamento reagendado.' });
    } catch (error) {
        console.error("Error updating appointment", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível reagendar.' });
    }
  };

  const handleDragEnd = () => {
    setDraggedAppointment(null);
    setIsDragging(false);
    setDropTarget(null);
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
      
        <ScrollArea className="flex-grow w-full border-t border-b mt-4">
            <div className="grid min-w-max h-full" style={{ gridTemplateColumns: `auto repeat(${staff.length}, minmax(150px, 1fr))` }}>
                {/* Time Gutter */}
                <div className="w-16 flex flex-col sticky left-0 bg-background z-10 border-r">
                    <div className="h-10 border-b">&nbsp;</div>
                    <div className="relative flex-grow">
                        {timeSlots.map(time => (
                            <div key={time} style={{ height: `${SLOT_HEIGHT_PX}px` }} className="flex items-center justify-center text-xs text-muted-foreground text-center border-t">
                                {time}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Staff Columns */}
                {staff.map(member => (
                    <div 
                        key={member.id} 
                        className="flex flex-col border-r"
                    >
                        <div className="h-10 border-b flex items-center justify-center p-2">
                            <h3 className="font-semibold text-sm truncate">{member.name}</h3>
                        </div>
                        <div 
                           className="relative flex-grow bg-muted/20"
                           onDragOver={(e) => handleDragOver(e, member.id)}
                           onDragLeave={handleDragLeave}
                           onDrop={(e) => handleDrop(e, member.id)}
                        >
                           {/* Grid lines and Drop Target Highlight */}
                           {timeSlots.map(time => (
                             <div 
                                key={time} 
                                style={{ height: `${SLOT_HEIGHT_PX}px` }} 
                                className={cn("border-t transition-colors", 
                                    dropTarget?.barberId === member.id && dropTarget.time === time && 'bg-primary/20'
                                )}>
                             </div>
                            ))}
                           
                           {/* Appointments */}
                           {appointments
                               .filter(app => app.barberId === member.id)
                               .map(app => {
                                   const {top, height} = getAppointmentPositionAndHeight(app);
                                   const isBeingDragged = isDragging && draggedAppointment?.id === app.id;
                                   return (
                                     <div 
                                        key={app.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, app)}
                                        onDragEnd={handleDragEnd}
                                        style={{ top: `${top + 1}px`, height: `${height}px` }}
                                        className={cn(
                                            "absolute w-[95%] left-1/2 -translate-x-1/2 p-2 transition-all duration-200 shadow-sm rounded-lg z-20 border",
                                            "cursor-grab active:cursor-grabbing",
                                            getStatusClasses(app.status),
                                            isBeingDragged && 'opacity-30'
                                        )}
                                      >
                                        <AppointmentDetailsDialog appointment={app} onAppointmentUpdate={handleAppointmentChange}>
                                             <div className="w-full h-full flex flex-col justify-start items-start text-left">
                                                <p className="text-sm font-bold truncate">{app.service}</p>
                                                <p className="text-xs truncate opacity-80">{app.client.name}</p>
                                                <p className="text-xs opacity-70 mt-auto">{app.time}</p>
                                            </div>
                                        </AppointmentDetailsDialog>
                                      </div>
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
