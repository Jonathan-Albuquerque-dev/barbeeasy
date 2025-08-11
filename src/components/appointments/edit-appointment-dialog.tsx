
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { getStaff, getServices, DayHours, getBarberAppointmentsForDate, Service, Staff, AppointmentDocument, deleteAppointment, updateAppointmentDetails, getBarbershopSettings, Product, getProducts, updateAppointmentProducts, updateAppointmentStatus, AppointmentStatus } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, CalendarIcon, Trash2, Edit, PlusCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';

type PopulatedAppointment = AppointmentDocument & {
  client: { id: string; name: string; avatarUrl: string; subscriptionId?: string; subscriptionName?: string; subscriptionEndDate?: any; subscription?: { includedServices: { serviceName: string }[] } };
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

const paymentMethods = ['Dinheiro', 'Cartão de Crédito/Débito', 'Pix', 'Cortesia'] as const;
const courtesyTypes = ['Pontos Fidelidade', 'Prêmio'] as const;
type CourtesyType = typeof courtesyTypes[number];

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
  const [isEditing, setIsEditing] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Dinheiro');
  const [selectedCourtesyType, setSelectedCourtesyType] = useState<CourtesyType | null>(null);
  const [totalValue, setTotalValue] = useState(0);

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
      date: new Date(appointment.date.replace(/-/g, '/')),
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
      setIsEditing(false);
    }
  }, [open, appointment, form]);

  const selectedDate = form.watch('date');
  const selectedBarberId = form.watch('barberId');
  const selectedService = form.watch('service');

  useEffect(() => {
    if (open && user?.uid) {
      const fetchData = async () => {
        const [fetchedStaff, fetchedServices, fetchedSettings, fetchedProducts] = await Promise.all([
          getStaff(user.uid),
          getServices(user.uid),
          getBarbershopSettings(user.uid),
          getProducts(user.uid),
        ]);
        setStaff(fetchedStaff);
        setServices(fetchedServices);
        setProducts(fetchedProducts);
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
    
    if(service && !service.staffIds.includes(form.getValues('barberId'))){
      form.resetField('barberId', { defaultValue: '' });
    }

  }, [selectedService, services, staff, form]);

  useEffect(() => {
    if (!isEditing) return;
    
    const generateAndFilterTimeSlots = async () => {
      if (!settings || !selectedDate || !user?.uid) { setTimeSlots([]); return; }
      const dayKeys: (keyof DayHours)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = selectedDate.getDay();
      const dayKey = dayKeys[dayOfWeek];
      const dayHours = settings.operatingHours[dayKey];
      if (!dayHours || !dayHours.open) { setTimeSlots([]); return; }
      const allSlots: string[] = [];
      const interval = settings.appointmentInterval;
      const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), parseInt(dayHours.start.split(':')[0]), parseInt(dayHours.start.split(':')[1]));
      const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), parseInt(dayHours.end.split(':')[0]), parseInt(dayHours.end.split(':')[1]));
      let currentTime = new Date(startDate);
      while(currentTime < endDate) {
          allSlots.push(currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
          currentTime.setMinutes(currentTime.getMinutes() + interval);
      }
      if (!selectedBarberId || !selectedService) { setTimeSlots(allSlots); return; }

      setSlotsLoading(true);
      try {
          const bookedAppointments = (await getBarberAppointmentsForDate(user.uid, selectedBarberId, selectedDate)).filter(a => a.id !== appointment.id);
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
      } catch (error) { console.error("Failed to fetch schedule", error); setTimeSlots([]); }
      finally { setSlotsLoading(false); }
    };
    
    generateAndFilterTimeSlots();
    
  }, [settings, selectedDate, selectedBarberId, selectedService, user, form, services, appointment.id, isEditing]);

  const onSubmit = async (data: EditAppointmentFormValues) => {
    if (!user) return;
    setLoading(true);
    try {
      const appointmentData = {
        barberId: data.barberId, service: data.service, date: format(data.date, 'yyyy-MM-dd'), time: data.time,
      };
      await updateAppointmentDetails(user.uid, appointment.id, appointmentData);
      toast({ title: 'Sucesso!', description: `Agendamento atualizado.` });
      onAppointmentUpdate();
      setIsEditing(false);
    } catch (error) { console.error(error); toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar.' }); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleteLoading(true);
    try {
      await deleteAppointment(user.uid, appointment.id);
      toast({ title: 'Sucesso!', description: 'O agendamento foi excluído.' });
      onAppointmentUpdate();
      setOpen(false);
    } catch (error) { console.error(error); toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível excluir.' }); }
    finally { setDeleteLoading(false); }
  };

  const handleStatusChange = async (newStatus: AppointmentStatus, paymentData?: { method: string, total: number }) => {
    if (!user || newStatus === appointment.status) return;
    setLoading(true);
    try {
      await updateAppointmentStatus(user.uid, appointment.id, newStatus, paymentData?.method);
      onAppointmentUpdate();
      toast({ title: 'Sucesso!', description: 'Status do agendamento atualizado.' });
      if (paymentDialogOpen) setPaymentDialogOpen(false);
      if (newStatus === 'Concluído') setOpen(false);
    } catch (error: any) { toast({ variant: 'destructive', title: 'Erro', description: error.message }); }
    finally { setLoading(false); }
  };

  const handleAddProduct = async () => {
    if (!user || !selectedProductId) return;
    const productToAdd = products.find(p => p.id === selectedProductId);
    if (!productToAdd) return;
    const newProduct = { productId: productToAdd.id, name: productToAdd.name, quantity: 1, price: productToAdd.price };
    const updatedProducts = [...(appointment.soldProducts || []), newProduct];
    try {
      await updateAppointmentProducts(user.uid, appointment.id, updatedProducts);
      onAppointmentUpdate();
      setSelectedProductId('');
      toast({ title: 'Produto Adicionado!' });
    } catch (error) { toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível adicionar o produto.' }); }
  };

  const handleRemoveProduct = async (productId: string) => {
    if (!user) return;
    const updatedProducts = (appointment.soldProducts || []).filter(p => p.productId !== productId);
    try {
      await updateAppointmentProducts(user.uid, appointment.id, updatedProducts);
      onAppointmentUpdate();
      toast({ title: 'Produto Removido!' });
    } catch (error) { toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível remover o produto.' }); }
  };

  const handleOpenPaymentDialog = async () => {
    if (!user) return;
    const servicePrice = services.find(s => s.name === appointment.service)?.price || 0;
    const productsTotal = (appointment.soldProducts || []).reduce((acc, p) => acc + (p.price * p.quantity), 0);
    setTotalValue(servicePrice + productsTotal);
    setPaymentDialogOpen(true);
  };
  
  const handleConfirmCompletion = async () => {
    const finalPaymentMethod = selectedPaymentMethod === 'Cortesia' ? `Cortesia (${selectedCourtesyType})` : selectedPaymentMethod;
    await handleStatusChange('Concluído', { method: finalPaymentMethod, total: valueToPay });
  };

  const isClientSubscribedAndActive = useMemo(() => {
    if (!appointment.client.subscriptionId || !appointment.client.subscriptionEndDate) return false;
    return appointment.client.subscriptionEndDate.toDate() > new Date();
  }, [appointment.client]);
  
  const serviceIsIncludedInSubscription = useMemo(() => isClientSubscribedAndActive && !!appointment.client.subscription?.includedServices.some(s => s.serviceName === appointment.service), [isClientSubscribedAndActive, appointment.client.subscription, appointment.service]);

  const productsTotal = useMemo(() => (appointment.soldProducts || []).reduce((acc, p) => acc + (p.price * p.quantity), 0), [appointment.soldProducts]);
  
  const valueToPay = useMemo(() => {
    if (selectedPaymentMethod === 'Assinante') return productsTotal;
    if (selectedPaymentMethod === 'Cortesia') return 0;
    return totalValue;
  }, [selectedPaymentMethod, totalValue, productsTotal]);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Agendamento' : 'Detalhes do Agendamento'}</DialogTitle>
                <DialogDescription>{appointment.client.name} - {appointment.service}</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <FormField control={form.control} name="service" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serviço</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione um serviço" /></SelectTrigger></FormControl>
                          <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="barberId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profissional</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedService}>
                          <FormControl><SelectTrigger><SelectValue placeholder={!selectedService ? "Escolha um serviço" : "Selecione"} /></SelectTrigger></FormControl>
                          <SelectContent>{filteredStaff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="date" render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><>{field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus locale={ptBR} /></PopoverContent>
                          </Popover><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="time" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={slotsLoading || !selectedBarberId || !selectedService || timeSlots.length === 0}>
                            <FormControl><SelectTrigger><SelectValue placeholder={slotsLoading ? "Carregando..." : !selectedService ? "Escolha serviço" : !selectedBarberId ? "Escolha prof." : timeSlots.length === 0 ? "Sem horários" : "Selecione"} /></SelectTrigger></FormControl>
                            <SelectContent>{timeSlots.map(slot => <SelectItem key={slot} value={slot}>{slot}</SelectItem>)}</SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm space-y-2">
                      <p><strong>Cliente:</strong> {appointment.client.name}</p>
                      <p><strong>Serviço:</strong> {appointment.service}</p>
                      <p><strong>Profissional:</strong> {appointment.barber.name}</p>
                      <p><strong>Data:</strong> {format(new Date(appointment.date.replace(/-/g, '/')), 'PPP', { locale: ptBR })} às {appointment.time}</p>
                      <p><strong>Status:</strong> {appointment.status}</p>
                    </div>

                    {appointment.status === 'Em atendimento' && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Produtos Vendidos</h4>
                          <div className="flex gap-2">
                            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                              <SelectTrigger><SelectValue placeholder="Selecione um produto..." /></SelectTrigger>
                              <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id} disabled={p.stock <= 0}>{p.name} ({p.stock})</SelectItem>)}</SelectContent>
                            </Select>
                            <Button type="button" size="icon" onClick={handleAddProduct} disabled={!selectedProductId}><PlusCircle className="h-4 w-4" /></Button>
                          </div>
                          <div className="space-y-1 pt-2">
                            {(appointment.soldProducts || []).map(p => (
                              <div key={p.productId} className="flex justify-between items-center text-xs">
                                <span>{p.name} (x{p.quantity})</span>
                                <div className='flex items-center gap-2'>
                                  <span>R$ {(p.price * p.quantity).toFixed(2)}</span>
                                  <Button type='button' variant='ghost' size='icon' className='h-5 w-5' onClick={() => handleRemoveProduct(p.productId)}><X className='h-3 w-3' /></Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter className="sm:justify-between">
                {isEditing ? (
                  <div className="flex w-full justify-between items-center">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="mr-2 h-4 w-4" />Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita e excluirá permanentemente o agendamento.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className={buttonVariants({ variant: "destructive" })}>
                            {deleteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sim, excluir'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                      <Button type="submit" disabled={loading || !form.formState.isDirty}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar'}</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex w-full justify-between items-center">
                    <Button type="button" variant="ghost" onClick={() => setIsEditing(true)} disabled={appointment.status === 'Concluído' || appointment.status === 'Em atendimento'}><Edit className='mr-2 h-4 w-4' />Editar</Button>
                    <div className='flex gap-2'>
                      {appointment.status !== 'Concluído' && (
                        <DialogClose asChild><Button type="button" variant="outline">Fechar</Button></DialogClose>
                      )}
                      {appointment.status === 'Concluído' ? <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" disabled>Concluído</Button>
                        : appointment.status === 'Em atendimento' ? <Button size="sm" onClick={handleOpenPaymentDialog}>Finalizar Atendimento</Button>
                          : <Button variant="outline" size="sm" onClick={() => handleStatusChange('Em atendimento')}>Iniciar Atendimento</Button>}
                    </div>
                  </div>
                )}
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir Agendamento</DialogTitle>
            <DialogDescription>Confirme o valor total e selecione a forma de pagamento.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="p-4 bg-muted/80 rounded-lg text-center">
              <Label className="text-sm text-muted-foreground">Valor Total a Pagar</Label>
              <p className="text-3xl font-bold tracking-tight">R$ {valueToPay.toFixed(2)}</p>
            </div>
            <div>
              <Label className="font-semibold">Forma de Pagamento</Label>
              <RadioGroup value={selectedPaymentMethod} onValueChange={(v) => { setSelectedPaymentMethod(v); if (v !== 'Cortesia') setSelectedCourtesyType(null); }} className="gap-4 mt-2">
                {paymentMethods.map(m => (<div key={m} className="flex items-center space-x-2"><RadioGroupItem value={m} id={`p-${m}`} /><Label htmlFor={`p-${m}`} className="font-normal">{m}</Label></div>))}
                {serviceIsIncludedInSubscription && <div className="flex items-center space-x-2"><RadioGroupItem value="Assinante" id="p-sub" /><Label htmlFor="p-sub" className="font-normal">Assinante</Label></div>}
              </RadioGroup>
              {selectedPaymentMethod === 'Cortesia' && (
                <div className="pl-6 pt-4 border-l-2 ml-2 mt-2 space-y-4">
                  <Label className="font-semibold">Tipo de Cortesia</Label>
                  <RadioGroup value={selectedCourtesyType || ''} onValueChange={(v) => setSelectedCourtesyType(v as CourtesyType)} className="gap-4 mt-2">
                    {courtesyTypes.map(t => (<div key={t} className="flex items-center space-x-2"><RadioGroupItem value={t} id={`c-${t}`} /><Label htmlFor={`c-${t}`} className="font-normal">{t}</Label></div>))}
                  </RadioGroup>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmCompletion} disabled={loading || (selectedPaymentMethod === 'Cortesia' && !selectedCourtesyType)}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Conclusão'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
