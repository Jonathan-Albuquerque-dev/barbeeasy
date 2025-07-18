'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { updateAppointmentStatus, AppointmentStatus, AppointmentDocument, Subscription } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Timestamp } from 'firebase/firestore';

const paymentMethods = ['Dinheiro', 'Cartão de Crédito/Débito', 'Pix', 'Cortesia'] as const;
const courtesyTypes = ['Pontos Fidelidade', 'Prêmio'] as const;

type PaymentMethod = (typeof paymentMethods)[number];
type CourtesyType = typeof courtesyTypes[number];

type AppointmentWithClientSubscription = AppointmentDocument & {
  client: { 
      subscriptionId?: string;
      subscription?: Subscription;
      subscriptionEndDate?: Timestamp; // Add this field
  } 
};

interface AppointmentStatusUpdaterProps {
  appointment: AppointmentWithClientSubscription;
  appointmentId: string;
  currentStatus: AppointmentStatus;
  onStatusChange: (newStatus: AppointmentStatus) => void;
  totalValue?: number;
}

export function AppointmentStatusUpdater({ appointment, appointmentId, currentStatus, onStatusChange, totalValue = 0 }: AppointmentStatusUpdaterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Dinheiro');
  const [selectedCourtesyType, setSelectedCourtesyType] = useState<CourtesyType | null>(null);

  const isClientSubscribedAndActive = useMemo(() => {
    if (!appointment.client.subscriptionId || !appointment.client.subscriptionEndDate) {
        return false;
    }
    // Check if subscription end date is in the future
    return appointment.client.subscriptionEndDate.toDate() > new Date();
  }, [appointment.client]);
  
  const serviceIsIncludedInSubscription = isClientSubscribedAndActive && !!appointment.client.subscription?.includedServices.some(s => s.serviceName === appointment.service);


  const productsTotal = useMemo(() => {
    return (appointment.soldProducts || []).reduce((acc, p) => acc + (p.price * p.quantity), 0);
  }, [appointment.soldProducts]);

  const valueToPay = useMemo(() => {
    if (selectedPaymentMethod === 'Assinante') {
      return productsTotal;
    }
    if (selectedPaymentMethod === 'Cortesia') {
      return 0;
    }
    return totalValue;
  }, [selectedPaymentMethod, totalValue, productsTotal]);


  const handleStatusChange = async (newStatus: AppointmentStatus, paymentMethod?: string) => {
    if (!user || newStatus === currentStatus) return;

    setLoading(true);
    try {
      await updateAppointmentStatus(user.uid, appointmentId, newStatus, paymentMethod);
      onStatusChange(newStatus);
      toast({
        title: 'Sucesso!',
        description: 'Status do agendamento atualizado.',
      });
      setDialogOpen(false); // Close dialog only on success
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o status.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCompletion = async () => {
    const finalPaymentMethod = selectedPaymentMethod === 'Cortesia'
      ? `Cortesia (${selectedCourtesyType})`
      : selectedPaymentMethod;
    await handleStatusChange('Concluído', finalPaymentMethod);
  };

  if (loading) {
    return <Button size="sm" variant="outline" disabled><Loader2 className="h-4 w-4 animate-spin" /></Button>;
  }

  if (currentStatus === 'Concluído') {
    return <Badge variant="success">Concluído</Badge>;
  }

  if (currentStatus === 'Em atendimento') {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm">Finalizar Atendimento</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir Agendamento</DialogTitle>
            <DialogDescription>
              Confirme o valor total e selecione a forma de pagamento.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
              <div className="p-4 bg-muted/80 rounded-lg text-center">
                  <Label className="text-sm text-muted-foreground">Valor Total a Pagar</Label>
                  <p className="text-3xl font-bold tracking-tight">R$ {valueToPay.toFixed(2)}</p>
              </div>
              <div>
                <Label className="font-semibold">Forma de Pagamento</Label>
                <RadioGroup value={selectedPaymentMethod} onValueChange={(value) => {
                    setSelectedPaymentMethod(value);
                    if (value !== 'Cortesia') {
                      setSelectedCourtesyType(null);
                    }
                }} className="gap-4 mt-2">
                  {paymentMethods.map(method => (
                    <div key={method} className="flex items-center space-x-2">
                      <RadioGroupItem value={method} id={`payment-${method.replace(/[\s/]/g, '-')}-${appointmentId}`} />
                      <Label htmlFor={`payment-${method.replace(/[\s/]/g, '-')}-${appointmentId}`} className="font-normal">{method}</Label>
                    </div>
                  ))}
                  {serviceIsIncludedInSubscription && (
                    <div key="Assinante" className="flex items-center space-x-2">
                        <RadioGroupItem value="Assinante" id={`payment-Assinante-${appointmentId}`} />
                        <Label htmlFor={`payment-Assinante-${appointmentId}`} className="font-normal">Assinante</Label>
                    </div>
                  )}
                </RadioGroup>

                {selectedPaymentMethod === 'Cortesia' && (
                  <div className="pl-6 pt-4 border-l-2 ml-2 mt-2 space-y-4">
                    <Label className="font-semibold">Tipo de Cortesia</Label>
                    <RadioGroup value={selectedCourtesyType || ''} onValueChange={(value) => setSelectedCourtesyType(value as CourtesyType)} className="gap-4 mt-2">
                      {courtesyTypes.map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <RadioGroupItem value={type} id={`courtesy-${type.replace(/\s+/g, '-')}-${appointmentId}`} />
                          <Label htmlFor={`courtesy-${type.replace(/\s+/g, '-')}-${appointmentId}`} className="font-normal">{type}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleConfirmCompletion} disabled={loading || (selectedPaymentMethod === 'Cortesia' && !selectedCourtesyType)}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Conclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Case for 'Confirmado' or 'Pendente'
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => handleStatusChange('Em atendimento')}
    >
      Iniciar Atendimento
    </Button>
  );
}
