
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { updateAppointmentStatus, AppointmentStatus, Service, getServices } from '@/lib/data';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

type PopulatedAppointment = {
  id: string;
  service: string;
  status: AppointmentStatus;
  soldProducts?: { price: number, quantity: number }[];
  client: {
    subscriptionId?: string;
    subscriptionName?: string;
    subscriptionEndDate?: any; 
    subscription?: { includedServices: { serviceName: string }[] };
  };
};

interface AppointmentStatusUpdaterProps {
  appointment: PopulatedAppointment;
  onStatusChange: () => void;
}

export function AppointmentStatusUpdater({ appointment, onStatusChange }: AppointmentStatusUpdaterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Dinheiro');
  
  useEffect(() => {
    if (user && paymentDialogOpen) {
      getServices(user.uid).then(setServices);
    }
  }, [user, paymentDialogOpen]);

  const serviceIsIncludedInSubscription = useMemo(() => {
    if (!appointment.client.subscriptionId || !appointment.client.subscriptionEndDate) {
      return false;
    }
    const isActive = appointment.client.subscriptionEndDate.toDate() > new Date();
    if (!isActive) return false;

    return appointment.client.subscription?.includedServices.some(s => s.serviceName === appointment.service) ?? false;
  }, [appointment.client, appointment.service]);

  const totalValue = useMemo(() => {
    const servicePrice = services.find(s => s.name === appointment.service)?.price || 0;
    const productsTotal = (appointment.soldProducts || []).reduce((acc, p) => acc + (p.price * p.quantity), 0);
    return servicePrice + productsTotal;
  }, [services, appointment.service, appointment.soldProducts]);

  const valueToPay = useMemo(() => {
    if (selectedPaymentMethod === 'Assinante' || selectedPaymentMethod === 'Cortesia') {
        const productsTotal = (appointment.soldProducts || []).reduce((acc, p) => acc + (p.price * p.quantity), 0);
        return productsTotal;
    }
    return totalValue;
  }, [selectedPaymentMethod, totalValue, appointment.soldProducts]);

  const handleStatusChange = async (newStatus: AppointmentStatus, paymentMethod?: string) => {
    if (!user || newStatus === appointment.status) return;
    setLoading(true);
    try {
      await updateAppointmentStatus(user.uid, appointment.id, newStatus, paymentMethod);
      onStatusChange();
      toast({ title: 'Sucesso!', description: 'Status do agendamento atualizado.' });
      if (paymentDialogOpen) setPaymentDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setLoading(false);
    }
  };
  
  const handleConfirmCompletion = async () => {
    await handleStatusChange('Concluído', selectedPaymentMethod);
  };

  const renderButton = () => {
    switch (appointment.status) {
      case 'Pendente':
        return <Button onClick={() => handleStatusChange('Confirmado')}>Confirmar</Button>;
      case 'Confirmado':
        return <Button onClick={() => handleStatusChange('Em atendimento')}>Iniciar Atendimento</Button>;
      case 'Em atendimento':
        return <Button onClick={() => setPaymentDialogOpen(true)}>Finalizar Atendimento</Button>;
      case 'Concluído':
        return <Button className="bg-success text-success-foreground hover:bg-success/90" disabled>Concluído</Button>;
      default:
        return null;
    }
  };

  return (
    <>
      {renderButton()}

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
              <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod} className="gap-4 mt-2">
                <div className="flex items-center space-x-2"><RadioGroupItem value="Dinheiro" id="p-dinheiro" /><Label htmlFor="p-dinheiro" className="font-normal">Dinheiro</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Cartão de Crédito/Débito" id="p-cartao" /><Label htmlFor="p-cartao" className="font-normal">Cartão de Crédito/Débito</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Pix" id="p-pix" /><Label htmlFor="p-pix" className="font-normal">Pix</Label></div>
                {serviceIsIncludedInSubscription && <div className="flex items-center space-x-2"><RadioGroupItem value="Assinante" id="p-assinante" /><Label htmlFor="p-assinante" className="font-normal">Assinante</Label></div>}
                <div className="flex items-center space-x-2"><RadioGroupItem value="Cortesia" id="p-cortesia" /><Label htmlFor="p-cortesia" className="font-normal">Cortesia / Resgate</Label></div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmCompletion} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Conclusão'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
