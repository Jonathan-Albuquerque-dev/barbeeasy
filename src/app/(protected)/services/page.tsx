
'use client';

import { getServices, getStaff, Staff, deleteService } from "@/lib/data";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Clock, DollarSign, Edit, Loader2, PlusCircle, Users, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useCallback } from "react";
import { AddServiceDialog } from "@/components/services/add-service-dialog";
import { EditServiceDialog } from "@/components/services/edit-service-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

type Service = Awaited<ReturnType<typeof getServices>>[0];

export default function ServicesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const staffMap = new Map(staff.map(s => [s.id, s]));

  const fetchServicesAndStaff = useCallback(async () => {
    if (user?.uid) {
      const [fetchedServices, fetchedStaff] = await Promise.all([
        getServices(user.uid),
        getStaff(user.uid)
      ]);
      setServices(fetchedServices);
      setStaff(fetchedStaff);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.uid) {
        setLoading(true);
        fetchServicesAndStaff();
    }
  }, [user, fetchServicesAndStaff]);
  
  const handleDelete = async (serviceId: string) => {
    if (!user) return;
    setDeletingId(serviceId);
    try {
      await deleteService(user.uid, serviceId);
      toast({
        title: "Sucesso!",
        description: "O serviço foi excluído.",
      });
      fetchServicesAndStaff(); // Refresh the list
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível excluir o serviço.",
      });
    } finally {
      setDeletingId(null);
    }
  };


  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Serviços</h1>
          <p className="text-muted-foreground">Navegue e gerencie os serviços e os profissionais que os executam.</p>
        </div>
        <AddServiceDialog staffList={staff} onServiceAdded={fetchServicesAndStaff}>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Serviço
            </Button>
        </AddServiceDialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(service => (
          <Card key={service.id} className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl">{service.name}</CardTitle>
                        <CardDescription className="line-clamp-2">{service.description}</CardDescription>
                    </div>
                     <div className="flex items-center">
                        <EditServiceDialog service={service} staffList={staff} onServiceUpdated={fetchServicesAndStaff}>
                            <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                            </Button>
                        </EditServiceDialog>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="ghost" size="icon" disabled={deletingId === service.id}>
                                  {deletingId === service.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  <span className="sr-only">Excluir</span>
                               </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso excluirá permanentemente o serviço e pode afetar agendamentos existentes.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(service.id)} className={buttonVariants({ variant: "destructive" })}>
                                Sim, excluir
                                </AlertDialogAction>
                            </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                     </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
              <div className="flex items-center text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4 mr-2"/>
                <span className="font-semibold text-lg text-foreground/90">R${service.price.toFixed(2)}</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-2"/>
                <span>{service.duration} minutos</span>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-4">
                 <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium text-muted-foreground">Profissionais</h4>
                </div>
                {service.staffIds && service.staffIds.length > 0 ? (
                     <div className="flex -space-x-2">
                        <TooltipProvider>
                        {service.staffIds.map(staffId => {
                            const member = staffMap.get(staffId);
                            if (!member) return null;
                            return (
                                <Tooltip key={member.id}>
                                    <TooltipTrigger>
                                        <Avatar className="h-8 w-8 border-2 border-background">
                                            <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="person face" />
                                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{member.name}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )
                        })}
                        </TooltipProvider>
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground pl-6">Nenhum profissional associado.</p>
                )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
