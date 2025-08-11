
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getProducts, updateAppointmentProducts, Product, AppointmentDocument, deleteAppointment, getStaff, getServices, getBarbershopSettings, DayHours, getBarberAppointmentsForDate, Service, Staff, updateAppointmentDetails } from '@/lib/data';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, Trash2, Edit, CalendarIcon } from 'lucide-react';
import { Separator } from '../ui/separator';
import { AppointmentStatusUpdater } from './appointment-status-updater';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type SoldProduct = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
};

type PopulatedAppointment = AppointmentDocument & {
  client: { id: string; name: string; avatarUrl: string; };
  barber: { id: string; name: string; };
};
interface AppointmentDetailsDialogProps {
  appointment: PopulatedAppointment;
  onAppointmentUpdate: () => void;
  children: React.ReactNode;
}

const editAppointmentSchema = z.object({
  date: z.date({ required_error: 'A data é obrigatória.' }),
  time: z.string().min(1, { message: 'A hora é obrigatória.' }),
});

type EditAppointmentFormValues = z.infer<typeof editAppointmentSchema>;
type BarbershopSettings = { operatingHours: DayHours; appointmentInterval: 30 | 60 };

export function AppointmentDetailsDialog({ appointment, onAppointmentUpdate, children }: AppointmentDetailsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // States for product sale
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<SoldProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  
  // States for editing appointment details
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<BarbershopSettings | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  const form = useForm<EditAppointmentFormValues>({
    resolver: zodResolver(editAppointmentSchema),
  });
  
  const selectedDate = form.watch('date');

  useEffect(() => {
    if (open) {
      setIsEditing(false); // Reset edit mode on open
      // Reset form with current appointment data
      form.reset({
        date: new Date(appointment.date.replace(/-/g, '/')),
        time: appointment.time,
      });
      // Initialize cart with products already sold
      setCart(appointment.soldProducts || []);

      if (user?.uid) {
        // Fetch necessary data for both product sales and rescheduling
        Promise.all([
          getProducts(user.uid),
          getServices(user.uid),
          getBarbershopSettings(user.uid)
        ]).then(([products, services, settings]) => {
          setAvailableProducts(products);
          setServices(services);
          if (settings) {
            setSettings({
              operatingHours: settings.operatingHours,
              appointmentInterval: settings.appointmentInterval
            });
          }
        }).catch(err => {
            console.error("Error fetching data for dialog", err);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os dados.' });
        })
      }
    }
  }, [open, user, appointment, form, toast]);
  
   useEffect(() => {
    // This effect runs when isEditing is true, or selectedDate changes while editing
    if (!isEditing || !settings || !selectedDate || !user?.uid) {
        setTimeSlots([]);
        return;
    }

    const generateAndFilterTimeSlots = async () => {
        setSlotsLoading(true);
        try {
            const dayKeys: (keyof DayHours)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayOfWeek = selectedDate.getDay();
            const dayKey = dayKeys[dayOfWeek];
            const dayHours = settings.operatingHours[dayKey];

            if (!dayHours || !dayHours.open) {
                setTimeSlots([]); return;
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

            const bookedAppointments = (await getBarberAppointmentsForDate(user.uid, appointment.barberId, selectedDate))
                .filter(a => a.id !== appointment.id); // Exclude current appointment
                
            const serviceDurationMap = new Map(services.map(s => [s.name, s.duration]));
            
            const blockedSlots = new Set<string>();
            bookedAppointments.forEach(app => {
                const duration = serviceDurationMap.get(app.service) || interval;
                const slotsToBlock = Math.ceil(duration / interval);
                const timeParts = app.time.split(':').map(Number);
                const appStartTime = new Date(selectedDate);
                appStartTime.setHours(timeParts[0], timeParts[1]);
                
                for (let i = 0; i < slotsToBlock; i++) {
                    const slotTime = new Date(appStartTime.getTime() + i * interval * 60000);
                    blockedSlots.add(slotTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                }
            });

            const currentServiceDuration = serviceDurationMap.get(appointment.service) || interval;
            const slotsRequired = Math.ceil(currentServiceDuration / interval);

            const availableSlots = allSlots.filter((slot, index) => {
                const [slotHour, slotMinute] = slot.split(':').map(Number);
                const slotStartTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), slotHour, slotMinute);
                const slotEndTime = new Date(slotStartTime.getTime() + currentServiceDuration * 60000);
                if (slotEndTime > endDate) return false;
                for (let i = 0; i < slotsRequired; i++) {
                    if (!allSlots[index + i] || blockedSlots.has(allSlots[index + i])) return false;
                }
                return true;
            });
            
            setTimeSlots(availableSlots);
        } catch (error) {
            console.error("Failed to fetch professional's schedule", error);
            toast({ variant: 'destructive', title: 'Erro', description: "Não foi possível carregar os horários." });
            setTimeSlots([]);
        } finally {
            setSlotsLoading(false);
        }
        form.resetField('time', { defaultValue: '' });
    };

    generateAndFilterTimeSlots();
  }, [isEditing, settings, selectedDate, user, form, toast, services, appointment.barberId, appointment.service, appointment.id]);

  const handleAddProductToCart = () => {
    // ... (rest of the function is unchanged)
  };
  
  const handleRemoveProduct = (productId: string) => {
    // ... (rest of the function is unchanged)
  };
  
  const handleSaveProducts = async () => {
    // ... (rest of the function is unchanged)
  };
  
  const handleDelete = async () => {
    // ... (rest of the function is unchanged)
  };

  const onEditSubmit = async (data: EditAppointmentFormValues) => {
    if (!user) return;
    setLoading(true);
    try {
      const updateData = {
        date: format(data.date, 'yyyy-MM-dd'),
        time: data.time,
        barberId: appointment.barberId, // Keep original barber and service
        service: appointment.service,
      };
      await updateAppointmentDetails(user.uid, appointment.id, updateData);
      toast({ title: 'Sucesso!', description: 'Agendamento reagendado.' });
      onAppointmentUpdate();
      setIsEditing(false); // Exit edit mode
    } catch (error) {
      console.error("Error rescheduling appointment", error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar as alterações.' });
    } finally {
      setLoading(false);
    }
  };

  const totalProductsValue = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes do Agendamento</DialogTitle>
          <DialogDescription>
            Veja as informações do agendamento, adicione produtos ou reagende.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)}>
                <div className="py-4 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 text-sm">
                        <div>
                            <p className="font-semibold">Cliente</p>
                            <p className="text-muted-foreground">{appointment.client.name}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Profissional</p>
                            <p className="text-muted-foreground">{appointment.barber.name}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Serviço</p>
                            <p className="text-muted-foreground">{appointment.service}</p>
                        </div>
                        {isEditing ? (
                             <div className="flex gap-2 items-end">
                                <FormField
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Data</FormLabel>
                                        <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
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
                                <FormField
                                    control={form.control}
                                    name="time"
                                    render={({ field }) => (
                                        <FormItem className="w-32">
                                        <FormLabel>Hora</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={slotsLoading || timeSlots.length === 0}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={slotsLoading ? "..." : "Hora"} />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>{timeSlots.map(slot => <SelectItem key={slot} value={slot}>{slot}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                             </div>
                        ) : (
                            <div>
                                <p className="font-semibold">Data e Hora</p>
                                <p className="text-muted-foreground">{new Date(`${appointment.date}T${appointment.time}`).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short'})}</p>
                            </div>
                        )}
                    </div>

                    <Separator />

                    <div>
                        <h3 className="text-lg font-semibold mb-4">Venda de Produtos</h3>
                         <div className="p-4 border rounded-lg space-y-4">
                            <div className="flex items-end gap-2">
                                <div className="flex-grow">
                                    <label className="text-sm font-medium">Produto</label>
                                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                        <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                                        <SelectContent>{availableProducts.map(p => <SelectItem key={p.id} value={p.id} disabled={p.stock === 0}>{p.name} (R${p.price.toFixed(2)}) - {p.stock} em estoque</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="w-24">
                                    <label className="text-sm font-medium">Qtd.</label>
                                    <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}/>
                                </div>
                                <Button onClick={handleAddProductToCart} size="icon" disabled={!selectedProductId} type="button">
                                <PlusCircle className="h-4 w-4" />
                                </Button>
                            </div>

                            {cart.length > 0 && (
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Produto</TableHead>
                                            <TableHead className="text-center w-[80px]">Qtd.</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cart.map(item => (
                                            <TableRow key={item.productId}>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell className="text-center">{item.quantity}</TableCell>
                                                <TableCell className="text-right">R${(item.price * item.quantity).toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveProduct(item.productId)} type="button">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            )}
                             {cart.length > 0 && (
                                <div className="text-right font-bold text-lg">
                                    Total dos Produtos: R${totalProductsValue.toFixed(2)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <DialogFooter className="flex-col-reverse gap-2 pt-4 border-t sm:flex-row sm:justify-between">
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" type="button">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir Agendamento
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o agendamento da sua base de dados.
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

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        {isEditing ? (
                            <>
                                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                                <Button type="submit" disabled={loading || !form.formState.isDirty}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Reagendamento'}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button type="button" variant="ghost" onClick={() => setIsEditing(true)} disabled={appointment.status === 'Concluído'}>
                                    <Edit className="mr-2 h-4 w-4" /> Reagendar
                                </Button>
                                <Button onClick={handleSaveProducts} variant="secondary" type="button" disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Venda'}
                                </Button>
                                <AppointmentStatusUpdater 
                                    appointment={appointment}
                                    onStatusChange={() => {
                                        onAppointmentUpdate();
                                        setOpen(false); // Close dialog on status change
                                    }}
                                />
                            </>
                        )}
                    </div>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
