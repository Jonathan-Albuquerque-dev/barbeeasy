'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { addAppointment, getClients, getStaff, getServices, getBarbershopSettings, DayHours } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const appointmentSchema = z.object({
  clientId: z.string({ required_error: 'Selecione um cliente.' }),
  barberId: z.string({ required_error: 'Selecione um barbeiro.' }),
  service: z.string().min(1, { message: 'Selecione um serviço.' }),
  date: z.date({ required_error: 'A data é obrigatória.' }),
  time: z.string().min(1, { message: 'A hora é obrigatória.' }),
  status: z.enum(['Confirmado', 'Pendente', 'Concluído'], { required_error: 'O status é obrigatório.' }),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

type Client = { id: string; name: string };
type Staff = { id: string; name: string };
type Service = { id: string; name: string };
type BarbershopSettings = { operatingHours: DayHours; appointmentInterval: 30 | 60 };

interface AddAppointmentDialogProps {
  onAppointmentAdded: () => void;
  children: React.ReactNode;
  initialDate?: Date;
}

export function AddAppointmentDialog({ onAppointmentAdded, children, initialDate }: AddAppointmentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<BarbershopSettings | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clientId: '',
      barberId: '',
      service: '',
      date: initialDate || new Date(),
      time: '',
      status: 'Confirmado',
    },
  });

  const selectedDate = form.watch('date');

  useEffect(() => {
    if (open && user?.uid) {
      setLoading(true);
      const fetchData = async () => {
        const [fetchedClients, fetchedStaff, fetchedServices, fetchedSettings] = await Promise.all([
          getClients(user.uid),
          getStaff(user.uid),
          getServices(user.uid),
          getBarbershopSettings(user.uid),
        ]);
        setClients(fetchedClients.map(c => ({ id: c.id, name: c.name })));
        setStaff(fetchedStaff.map(s => ({ id: s.id, name: s.name })));
        setServices(fetchedServices.map(s => ({ id: s.id, name: s.name })));
        if (fetchedSettings) {
            setSettings({
                operatingHours: fetchedSettings.operatingHours,
                appointmentInterval: fetchedSettings.appointmentInterval,
            });
        }
        setLoading(false);
      };
      fetchData();
    }
  }, [open, user]);
  
  useEffect(() => {
    if (initialDate) {
      form.setValue('date', initialDate);
    }
  }, [initialDate, form]);
  
  useEffect(() => {
    if (!settings || !selectedDate) {
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

    const slots: string[] = [];
    const interval = settings.appointmentInterval;
    
    // Set date part to avoid timezone issues, work with local time
    const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), parseInt(dayHours.start.split(':')[0]), parseInt(dayHours.start.split(':')[1]));
    const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), parseInt(dayHours.end.split(':')[0]), parseInt(dayHours.end.split(':')[1]));

    let currentTime = startDate;

    while(currentTime < endDate) {
        slots.push(currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        currentTime.setMinutes(currentTime.getMinutes() + interval);
    }
    
    setTimeSlots(slots);
    form.resetField('time', { defaultValue: '' });

  }, [settings, selectedDate, form]);

  const onSubmit = async (data: AppointmentFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado.' });
      return;
    }

    setLoading(true);
    try {
      const appointmentData = {
        ...data,
        date: format(data.date, 'yyyy-MM-dd'),
      };

      await addAppointment(user.uid, appointmentData);
      
      toast({
        title: 'Sucesso!',
        description: `Agendamento criado para ${format(data.date, 'PPP', { locale: ptBR })}.`,
      });
      onAppointmentAdded();
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar agendamento',
        description: 'Não foi possível salvar. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Novo Agendamento</DialogTitle>
          <DialogDescription>
            Preencha os detalhes do novo agendamento.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
                  <FormLabel>Barbeiro</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um barbeiro" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="service"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serviço</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Escolha uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0,0,0,0)) 
                          }
                          initialFocus
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
                       <Select onValueChange={field.onChange} value={field.value} disabled={timeSlots.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={timeSlots.length === 0 ? "Dia fechado" : "Selecione um horário"} />
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
             <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Confirmado">Confirmado</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Concluído">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Agendamento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
