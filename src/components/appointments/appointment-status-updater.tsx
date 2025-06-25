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
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const statuses: AppointmentStatus[] = ['Confirmado', 'Concluído', 'Pendente'];
const paymentMethods = ['Dinheiro', 'Cartão', 'Pix', 'Cortesia'] as const;
type PaymentMethod = typeof paymentMethods[number];

interface AppointmentStatusUpdaterProps {
  appointmentId: string;
  currentStatus: AppointmentStatus;
  onStatusChange: (newStatus: AppointmentStatus) => void;
}

export function AppointmentStatusUpdater({ appointmentId, currentStatus, onStatusChange }: AppointmentStatusUpdaterProps) {
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
      case 'Confirmado':
        return 'secondary';
      case 'Pendente':
        return 'outline';
      default:
        return 'secondary';
    }
  };

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
          {statuses.filter(s => s !== currentStatus).map((status) => {
            if (status === 'Concluído') {
              return (
                <DropdownMenuItem key={status} onSelect={() => setDialogOpen(true)}>
                  <span>Mudar para {status}</span>
                </DropdownMenuItem>
              );
            }
            return (
              <DropdownMenuItem key={status} onSelect={() => handleStatusChange(status)}>
                <span>Mudar para {status}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Concluir Agendamento</DialogTitle>
          <DialogDescription>
            Selecione a forma de pagamento para concluir este serviço.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup value={selectedPaymentMethod} onValueChange={(value) => setSelectedPaymentMethod(value as PaymentMethod)} className="gap-4">
            {paymentMethods.map(method => (
              <div key={method} className="flex items-center space-x-2">
                <RadioGroupItem value={method} id={`payment-${method}-${appointmentId}`} />
                <Label htmlFor={`payment-${method}-${appointmentId}`}>{method}</Label>
              </div>
            ))}
          </RadioGroup>
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
