'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { getStaff, getServices, DayHours, getBarberAppointmentsForDate, Service, Staff, AppointmentDocument, deleteAppointment, updateAppointmentDetails, getBarbershopSettings } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, CalendarIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';

type PopulatedAppointment = AppointmentDocument & {
  client: { id: string; name: string; avatarUrl: string; subscriptionId?: string };
  barber: { id: string; name: string; };
};

const editAppointmentSchema = z.object({
  service: z.string().min(1, { message: 'Selecione um serviço.' }),
  barberId: z.string({ required_error: 'Selecione um profissional.' }),
  date: z.date({ required_error: 'A data é obrigatória.' }),
  time: z.string().min(1, { message: 'A hora é obrigatória.' }),
});

type EditAppointmentFormValues = z.infer<typeof editAppointmentSchema>;
type BarbershopSettings = { operatingHours: DayHours; appointmentInterval: 30 | 60 };

interface EditAppointmentDialogProps {
  onAppointmentUpdate: () => void;
  children: React.ReactNode;
  appointment: PopulatedAppointment;
}

export function EditAppointmentDialog({ onAppointmentUpdate, children, appointment }: EditAppointmentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<BarbershopSettings | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);

  const form = useForm<EditAppointmentFormValues>({
    resolver: zodResolver(editAppointmentSchema),
    defaultValues: {
      service: appointment.service,
      barberId: appointment.barberId,
      date: new Date(appointment.date.replace(/-/g, '/')), // Fix for Safari date parsing
      time: appointment.time,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        service: appointment.service,
        barberId: appointment.barberId,
        date: new Date(appointment.date.replace(/-/g, '/')),
        time: appointment.time,
      });
    }
  }, [open, appointment, form]);

  const selectedDate = form.watch('date');
  const selectedBarberId = form.watch('barberId');
  const selectedService = form.watch('service');

  useEffect(() => {
    if (open && user?.uid) {
      const fetchData = async () => {
        const [fetchedStaff, fetchedServices, fetchedSettings] = await Promise.all([
          getStaff(user.uid),
          getServices(user.uid),
          getBarbershopSettings(user.uid),
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
  }, [open, user]);
  
  useEffect(() => {
    const service = services.find(s => s.name === selectedService);
    if (service && service.staffIds) {
      const staffForService = staff.filter(s => service.staffIds.includes(s.id));
      setFilteredStaff(staffForService);
    } else {
      setFilteredStaff([]);
    }
    
    // Only reset barber if the current one isn't valid for the new service
    if(service && !service.staffIds.includes(form.getValues('barberId'))){
      form.resetField('barberId', { defaultValue: '' });
    }

  }, [selectedService, services, staff, form]);

  useEffect(() => {
    const generateAndFilterTimeSlots = async () => {
        if (!settings || !selectedDate || !user?.uid) {
            setTimeSlots([]);
            return;
        }

        const dayKeys: (keyof DayHours)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayOfWeek = selectedDate.getDay();
        const dayKey = dayKeys[dayOfWeek];
        const dayHours = settings.operatingHours[dayKey];

        if (!dayHours || !dayHours.open) {
            setTimeSlots([]);
            return;
        }

        const allSlots: string[] = [];
        const interval = settings.appointmentInterval;
        const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), parseInt(dayHours.start.split(':')[0]), parseInt(dayHours.start.split(':')[1]));
        const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), parseInt(dayHours.end.split(':')[0]), parseInt(dayHours.end.split(':')[1]));
        let currentTime = new Date(startDate);

        while(currentTime < endDate) {
            allSlots.push(currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
            currentTime.setMinutes(currentTime.getMinutes() + interval);
        }

        if (!selectedBarberId || !selectedService) {
            setTimeSlots(allSlots);
            form.resetField('time', { defaultValue: '' });
            return;
        }

        setSlotsLoading(true);
        try {
            // Exclude the current appointment from the booked list
            const bookedAppointments = (await getBarberAppointmentsForDate(user.uid, selectedBarberId, selectedDate))
                .filter(a => a.id !== appointment.id);

            const serviceDurationMap = new Map(services.map(s => [s.name, s.duration]));
            
            const blockedSlots = new Set<string>();
            bookedAppointments.forEach(app => {
                const duration = serviceDurationMap.get(app.service) || interval;
                const slotsToBlock = Math.ceil(duration / interval);
                const timeParts = app.time.split(':').map(Number);
                const startTime = new Date(selectedDate);
                startTime.setHours(timeParts[0], timeParts[1], 0, 0);

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
                const slotEndTime = new Date(slotStartTime.getTime() + newServiceDuration * 60000);
                if (slotEndTime > endDate) return false;

                for (let i = 0; i < slotsRequired; i++) {
                    const currentSlot = allSlots[index + i];
                    if (!currentSlot || blockedSlots.has(currentSlot)) return false;
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

        if (form.getValues('date').toDateString() !== new Date(appointment.date.replace(/-/g, '/')).toDateString()) {
             form.resetField('time', { defaultValue: '' });
        }
       
    };

    generateAndFilterTimeSlots();
  }, [settings, selectedDate, selectedBarberId, selectedService, user, form, toast, services, appointment.id, appointment.date]);

  const onSubmit = async (data: EditAppointmentFormValues) => {
    if (!user) return;

    setLoading(true);
    try {
      const appointmentData = {
        barberId: data.barberId,
        service: data.service,
        date: format(data.date, 'yyyy-MM-dd'),
        time: data.time,
      };

      await updateAppointmentDetails(user.uid, appointment.id, appointmentData);
      
      toast({
        title: 'Sucesso!',
        description: `Agendamento atualizado para ${format(data.date, 'PPP', { locale: ptBR })}.`,
      });
      onAppointmentUpdate();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar agendamento',
        description: 'Não foi possível salvar. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleteLoading(true);
    try {
      await deleteAppointment(user.uid, appointment.id);
      toast({ title: 'Sucesso!', description: 'O agendamento foi excluído.' });
      onAppointmentUpdate();
      setOpen(false);
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível excluir o agendamento.' });
    } finally {
        setDeleteLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Agendamento</DialogTitle>
          <DialogDescription>
            {appointment.client.name} - {appointment.service}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
                 <FormField
                  control={form.control}
                  name="service"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviço</FormLabel>
                       <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um serviço" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                        </SelectContent>
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
                          <SelectTrigger>
                            <SelectValue placeholder={!selectedService ? "Escolha um serviço primeiro" : "Selecione um profissional"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredStaff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn("pl-3 text-left font-normal",!field.value && "text-muted-foreground")}
                              >
                                {field.value ? (format(field.value, "PPP", { locale: ptBR })) : (<span>Escolha uma data</span>)}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                              initialFocus
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Hora</FormLabel>
                            <Select 
                                onValueChange={field.onChange} 
                                value={field.value} 
                                disabled={slotsLoading || !selectedBarberId || !selectedService || timeSlots.length === 0}
                            >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={
                                    slotsLoading ? "Carregando..." : 
                                    !selectedService ? "Escolha um serviço" :
                                    !selectedBarberId ? "Escolha um profissional" : 
                                    timeSlots.length === 0 ? "Nenhum horário vago" : 
                                    "Selecione um horário"
                                } />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {timeSlots.map(slot => <SelectItem key={slot} value={slot}>{slot}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
                </div>
            </div>
            <DialogFooter>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" className="mr-auto">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso excluirá permanentemente o agendamento.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className={buttonVariants({ variant: "destructive" })}>
                                {deleteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sim, excluir'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading || !form.formState.isDirty}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
