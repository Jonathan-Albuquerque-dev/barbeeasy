
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addAppointment, getStaff, getServices, getBarbershopSettings, DayHours, getBarberAppointmentsForDate, Service, Staff, getClientById } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, CalendarIcon, CheckCircle, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { useClientSession } from '@/app/portal/layout';
import Link from 'next/link';

const bookingSchema = z.object({
  service: z.string().min(1, { message: 'Selecione um serviço.' }),
  barberId: z.string({ required_error: 'Selecione um profissional.' }),
  date: z.date({ required_error: 'A data é obrigatória.' }),
  time: z.string().min(1, { message: 'A hora é obrigatória.' }),
});

type BookingFormValues = z.infer<typeof bookingSchema>;
type BarbershopSettings = { operatingHours: DayHours; appointmentInterval: 30 | 60 };

interface BookingFormProps {
    barbershopId: string;
}

export function BookingForm({ barbershopId }: BookingFormProps) {
  const { session, loading: sessionLoading } = useClientSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);

  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<BarbershopSettings | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      service: '',
      barberId: '',
      date: new Date(),
      time: '',
    },
  });

  useEffect(() => {
    if (barbershopId) {
      const fetchData = async () => {
        const [fetchedStaff, fetchedServices, fetchedSettings] = await Promise.all([
          getStaff(barbershopId),
          getServices(barbershopId),
          getBarbershopSettings(barbershopId),
        ]);
        setStaff(fetchedStaff);
        setServices(fetchedServices);
        if (fetchedSettings) {
            setSettings({
                operatingHours: fetchedSettings.operatingHours,
                appointmentInterval: fetchedSettings.appointmentInterval,
            });
        }
      };
      fetchData();
    }
  }, [barbershopId]);
  
  const selectedDate = form.watch('date');
  const selectedBarberId = form.watch('barberId');
  const selectedService = form.watch('service');

  useEffect(() => {
    const service = services.find(s => s.name === selectedService);
    if (service && service.staffIds) {
      const staffForService = staff.filter(s => service.staffIds.includes(s.id));
      setFilteredStaff(staffForService);
    } else {
      setFilteredStaff([]);
    }
    // Reset barber and time when service changes
    form.resetField('barberId', { defaultValue: '' });
    form.resetField('time', { defaultValue: '' });
  }, [selectedService, services, staff, form]);


  useEffect(() => {
    const generateAndFilterTimeSlots = async () => {
        if (!settings || !selectedDate || !barbershopId) {
            setTimeSlots([]); return;
        }
        const dayKeys: (keyof DayHours)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayOfWeek = selectedDate.getDay();
        const dayKey = dayKeys[dayOfWeek];
        const dayHours = settings.operatingHours[dayKey];

        if (!dayHours || !dayHours.open) { setTimeSlots([]); return; }

        const allSlots: string[] = [];
        const interval = settings.appointmentInterval;
        let currentTime = new Date(selectedDate);
        const [startHour, startMinute] = dayHours.start.split(':').map(Number);
        currentTime.setHours(startHour, startMinute, 0, 0);

        const endTime = new Date(selectedDate);
        const [endHour, endMinute] = dayHours.end.split(':').map(Number);
        endTime.setHours(endHour, endMinute, 0, 0);

        while(currentTime < endTime) {
            allSlots.push(currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
            currentTime.setMinutes(currentTime.getMinutes() + interval);
        }

        if (!selectedBarberId || !selectedService) {
            setTimeSlots(allSlots); 
            form.resetField('time', { defaultValue: '' }); return;
        }

        setSlotsLoading(true);
        try {
            const bookedAppointments = await getBarberAppointmentsForDate(barbershopId, selectedBarberId, selectedDate);
            const serviceDurationMap = new Map(services.map(s => [s.name, s.duration]));
            
            const blockedSlots = new Set<string>();
            bookedAppointments.forEach(app => {
                const duration = serviceDurationMap.get(app.service) || interval;
                const slotsToBlock = Math.ceil(duration / interval);
                const timeParts = app.time.split(':').map(Number);
                const startTime = new Date(selectedDate);
                startTime.setHours(timeParts[0], timeParts[1]);
                
                for (let i = 0; i < slotsToBlock; i++) {
                    const slotTime = new Date(startTime.getTime() + i * interval * 60000);
                    blockedSlots.add(slotTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                }
            });

            const newServiceDuration = serviceDurationMap.get(selectedService) || interval;
            const slotsRequired = Math.ceil(newServiceDuration / interval);

            const availableSlots = allSlots.filter((slot, index) => {
                const [slotHour, slotMinute] = slot.split(':').map(Number);
                const slotStartTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), slotHour, slotMinute);
                
                // Check for lunch break
                if (dayHours.hasBreak) {
                    const [breakStartHour, breakStartMinute] = dayHours.breakStart.split(':').map(Number);
                    const breakStartTime = new Date(selectedDate);
                    breakStartTime.setHours(breakStartHour, breakStartMinute, 0, 0);
                    
                    const [breakEndHour, breakEndMinute] = dayHours.breakEnd.split(':').map(Number);
                    const breakEndTime = new Date(selectedDate);
                    breakEndTime.setHours(breakEndHour, breakEndMinute, 0, 0);

                    if (slotStartTime >= breakStartTime && slotStartTime < breakEndTime) {
                        return false;
                    }
                }

                const slotEndTime = new Date(slotStartTime.getTime() + newServiceDuration * 60000);
                
                if (slotEndTime > endTime) {
                    return false;
                }

                for (let i = 0; i < slotsRequired; i++) {
                    const currentSlot = allSlots[index + i];
                    if (!currentSlot || blockedSlots.has(currentSlot)) {
                        return false;
                    }
                }
                return true;
            });
            
            setTimeSlots(availableSlots);

        } catch (error) {
            console.error("Failed to fetch schedule", error);
            setTimeSlots([]);
        } finally {
            setSlotsLoading(false);
        }
        form.resetField('time', { defaultValue: '' });
    };
    generateAndFilterTimeSlots();
  }, [settings, selectedDate, selectedBarberId, selectedService, barbershopId, form, services]);


  const onSubmit = async (data: BookingFormValues) => {
    if (!session?.id || !barbershopId) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Sua sessão é inválida. Faça login novamente.' });
      return;
    }

    setLoading(true);
    try {
      const appointmentData = {
        clientId: session.id,
        barberId: data.barberId,
        service: data.service,
        date: format(data.date, 'yyyy-MM-dd'),
        time: data.time,
        status: 'Confirmado' as const,
      };

      await addAppointment(barbershopId, appointmentData);
      
      const barberName = staff.find(s => s.id === data.barberId)?.name || '';
      
      setBookingDetails({
          ...data,
          barberName,
          clientName: session.name
      });
      setBookingSuccess(true);
      
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Agendar',
        description: error.message || 'Não foi possível salvar seu agendamento. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (bookingSuccess) {
    return (
        <Card className="mt-8 text-center animate-in fade-in-50">
            <CardHeader>
                <div className="mx-auto bg-green-100 dark:bg-green-900 rounded-full h-16 w-16 flex items-center justify-center">
                    <PartyPopper className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="mt-4 text-2xl">Agendamento Confirmado!</CardTitle>
                <CardDescription>
                    Seu horário foi reservado com sucesso.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg text-left space-y-2">
                    <p><strong>Serviço:</strong> {bookingDetails.service}</p>
                    <p><strong>Profissional:</strong> {bookingDetails.barberName}</p>
                    <p><strong>Data:</strong> {format(bookingDetails.date, "PPP", { locale: ptBR })}</p>
                    <p><strong>Hora:</strong> {bookingDetails.time}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                    Mal podemos esperar para te ver!
                </p>
            </CardContent>
            <CardFooter className="flex-col sm:flex-row gap-2 justify-center">
                 <Button onClick={() => setBookingSuccess(false)}>Fazer novo agendamento</Button>
                 <Button variant="outline" asChild>
                    <Link href={`/portal/meus-agendamentos?barbershopId=${barbershopId}`}>Ver meus agendamentos</Link>
                 </Button>
            </CardFooter>
        </Card>
    )
  }

  return (
    <Card className="mt-8">
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle>Selecione os Detalhes</CardTitle>
          <CardDescription>Escolha um serviço, profissional, data e horário.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
               <FormField
                  control={form.control}
                  name="service"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviço</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione um serviço" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="barberId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profissional</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedService}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder={!selectedService ? "Escolha um serviço primeiro" : "Selecione um profissional"} /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{filteredStaff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} initialFocus locale={ptBR}/>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <div className="space-y-2">
                <FormLabel>Horário Disponível</FormLabel>
                {slotsLoading ? (
                    <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>
                ) : (
                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                            <FormControl>
                               <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-3 gap-2">
                                  {timeSlots.length > 0 ? timeSlots.map(slot => (
                                      <FormItem key={slot}>
                                        <FormControl>
                                            <RadioGroupItem value={slot} id={slot} className="sr-only peer" />
                                        </FormControl>
                                        <Label htmlFor={slot} className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                            {slot}
                                        </Label>
                                      </FormItem>
                                  )) : <p className="text-muted-foreground col-span-3 text-center pt-8">Nenhum horário disponível para esta combinação.</p>}
                                </RadioGroup>
                            </FormControl>
                            <FormMessage className="pt-2" />
                        </FormItem>
                      )}
                    />
                )}
            </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading} className="w-full md:w-auto ml-auto">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Agendamento'}
          </Button>
        </CardFooter>
      </form>
    </Form>
    </Card>
  );
}
