
'use client';

import { getStaff, Staff, deleteStaff } from "@/lib/data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Star, Loader2, Edit, Briefcase, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useCallback } from "react";
import { AddStaffDialog } from "@/components/staff/add-staff-dialog";
import { EditStaffDialog } from "@/components/staff/edit-staff-dialog";
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

export default function StaffPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    if (user?.uid) {
      // Don't set loading to true here to avoid full-page loader on re-fetch
      const fetchedStaff = await getStaff(user.uid);
      setStaff(fetchedStaff);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.uid) {
        setLoading(true);
        fetchStaff();
    }
  }, [user, fetchStaff]);

  const handleDelete = async (staffId: string) => {
    if (!user) return;
    setDeletingId(staffId);
    try {
      await deleteStaff(user.uid, staffId);
      toast({
        title: "Sucesso!",
        description: "O funcionário foi excluído.",
      });
      fetchStaff(); // Refresh the list
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível excluir o funcionário.",
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Perfis da Equipe</h1>
          <p className="text-muted-foreground">Gerencie sua talentosa equipe de profissionais.</p>
        </div>
        <AddStaffDialog onStaffAdded={fetchStaff}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Profissional
          </Button>
        </AddStaffDialog>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Profissão</TableHead>
              <TableHead className="hidden lg:table-cell">Especializações</TableHead>
              <TableHead><span className="sr-only">Ações</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map(member => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="person face" />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{member.name}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline">
                    <Briefcase className="mr-1 h-3 w-3"/>
                    {member.professionName || 'Não definida'}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {member.specializations.map(spec => (
                      <Badge key={spec} variant="secondary">
                        <Star className="mr-1 h-3 w-3 text-accent"/>
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/staff/${member.id}`}>Ver Perfil</Link>
                    </Button>
                    <EditStaffDialog staffMember={member} onStaffUpdated={fetchStaff}>
                       <Button variant="ghost" size="icon">
                         <Edit className="h-4 w-4" />
                         <span className="sr-only">Editar {member.name}</span>
                       </Button>
                    </EditStaffDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" disabled={deletingId === member.id}>
                          {deletingId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          <span className="sr-only">Excluir {member.name}</span>
                         </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o funcionário e pode afetar agendamentos existentes.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(member.id)} className={buttonVariants({ variant: "destructive" })}>
                            Sim, excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
