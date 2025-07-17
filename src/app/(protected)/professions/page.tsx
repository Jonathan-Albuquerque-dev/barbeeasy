
'use client';

import { getProfessions, deleteProfession } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Loader2, PlusCircle, Briefcase, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useCallback } from "react";
import { AddProfessionDialog } from "@/components/professions/add-profession-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

type Profession = {
  id: string;
  name: string;
};

export default function ProfessionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProfessions = useCallback(async () => {
    if (user?.uid) {
      const fetchedProfessions = await getProfessions(user.uid);
      setProfessions(fetchedProfessions);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.uid) {
        setLoading(true);
        fetchProfessions();
    }
  }, [user, fetchProfessions]);

  const handleDelete = async (professionId: string) => {
    if (!user) return;
    setDeletingId(professionId);
    try {
      await deleteProfession(user.uid, professionId);
      toast({
        title: "Sucesso!",
        description: "O cargo foi excluído.",
      });
      fetchProfessions(); // Refresh the list
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível excluir o cargo.",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cadastro de Cargos/Profissões</h1>
          <p className="text-muted-foreground">Gerencie os cargos e profissões do seu estabelecimento.</p>
        </div>
        <AddProfessionDialog onProfessionAdded={fetchProfessions}>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Cargo
            </Button>
        </AddProfessionDialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome do Cargo</TableHead>
              <TableHead className="text-right w-32">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {professions.length > 0 ? professions.map(profession => (
              <TableRow key={profession.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{profession.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="ghost" size="icon" disabled={deletingId === profession.id}>
                          {deletingId === profession.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          <span className="sr-only">Excluir</span>
                       </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Isso excluirá permanentemente o cargo.
                          Certifique-se de que nenhum funcionário esteja associado a este cargo antes de excluir.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(profession.id)} className={buttonVariants({ variant: "destructive" })}>
                          Sim, excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">
                        Nenhum cargo cadastrado.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
