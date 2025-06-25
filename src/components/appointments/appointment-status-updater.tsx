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

const statuses: AppointmentStatus[] = ['Confirmado', 'Concluído', 'Pendente'];

interface AppointmentStatusUpdaterProps {
  appointmentId: string;
  currentStatus: AppointmentStatus;
  onStatusChange: (newStatus: AppointmentStatus) => void;
}

export function AppointmentStatusUpdater({ appointmentId, currentStatus, onStatusChange }: AppointmentStatusUpdaterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    if (!user || newStatus === currentStatus) return;

    setLoading(true);
    try {
      await updateAppointmentStatus(user.uid, appointmentId, newStatus);
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
    }
  };

  const getBadgeVariant = (status: AppointmentStatus) => {
    switch (status) {
      case 'Concluído':
        return 'default';
      case 'Confirmado':
        return 'secondary';
      case 'Pendente':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button disabled={loading} className="disabled:opacity-50 focus:outline-none">
           {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 
            <Badge 
              variant={getBadgeVariant(currentStatus)} 
              className={cn("cursor-pointer", currentStatus === "Concluído" && "bg-primary/80")}
            >
              {currentStatus}
            </Badge>
           }
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {statuses.filter(s => s !== currentStatus).map((status) => (
          <DropdownMenuItem key={status} onSelect={() => handleStatusChange(status)}>
            <span>Mudar para {status}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
