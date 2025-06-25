'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { updateAppointmentStatus, AppointmentStatus } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const statuses: AppointmentStatus[] = ['Em atendimento', 'Confirmado', 'Concluído', 'Pendente'];
const paymentMethods = ['Dinheiro', 'Cartão', 'Pix', 'Cortesia'] as const;
type PaymentMethod = typeof paymentMethods[number];

interface AppointmentStatusUpdaterProps {
  appointmentId: string;
  currentStatus: AppointmentStatus;
  onStatusChange: (newStatus: AppointmentStatus) => void;
  totalValue?: number;
}

export function AppointmentStatusUpdater({ appointmentId, currentStatus, onStatusChange, totalValue = 0 }: AppointmentStatusUpdaterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('Dinheiro');

  const handleStatusChange = async (newStatus: AppointmentStatus, paymentMethod?: PaymentMethod) => {
    if (!user || newStatus === currentStatus) return;

    setLoading(true);
    try {
      await updateAppointmentStatus(user.uid, appointmentId, newStatus, paymentMethod);
      onStatusChange(newStatus);
      toast({
        title: 'Sucesso!',
        description: 'Status do agendamento atualizado.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
      });
    } finally {
      setLoading(false);
      setDialogOpen(false);
    }
  };

  const handleConfirmCompletion = () => {
    handleStatusChange('Concluído', selectedPaymentMethod);
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

  // Se o status for 'Concluído', ele se torna um estado final e não pode ser alterado.
  if (currentStatus === 'Concluído') {
    return (
      <Badge variant={getBadgeVariant(currentStatus)}>
        {currentStatus}
      </Badge>
    );
  }


  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button disabled={loading} className="disabled:opacity-50 focus:outline-none">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 
              <Badge 
                variant={getBadgeVariant(currentStatus)} 
                className="cursor-pointer"
              >
                {currentStatus}
              </Badge>
            }
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {statuses.filter(s => s !== currentStatus && s !== 'Concluído').map((status) => (
              <DropdownMenuItem key={status} onSelect={() => handleStatusChange(status)}>
                <span>Mudar para {status}</span>
              </DropdownMenuItem>
          ))}
           {/* Botão para "Concluído" é tratado separadamente para abrir o diálogo */}
          {currentStatus !== 'Concluído' && (
             <DropdownMenuItem onSelect={() => setDialogOpen(true)}>
                <span>Mudar para Concluído</span>
             </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
                <p className="text-3xl font-bold tracking-tight">R$ {totalValue.toFixed(2)}</p>
            </div>
            <div>
              <Label className="font-semibold">Forma de Pagamento</Label>
              <RadioGroup value={selectedPaymentMethod} onValueChange={(value) => setSelectedPaymentMethod(value as PaymentMethod)} className="gap-4 mt-2">
                {paymentMethods.map(method => (
                  <div key={method} className="flex items-center space-x-2">
                    <RadioGroupItem value={method} id={`payment-${method}-${appointmentId}`} />
                    <Label htmlFor={`payment-${method}-${appointmentId}`} className="font-normal">{method}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleConfirmCompletion} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Conclusão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
