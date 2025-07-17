
'use client';

import { getProfessions } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Briefcase } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useCallback } from "react";
import { AddProfessionDialog } from "@/components/professions/add-profession-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Profession = {
  id: string;
  name: string;
};

export default function ProfessionsPage() {
  const { user } = useAuth();
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [loading, setLoading] = useState(true);

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
          <h1 className="text-3xl font-bold tracking-tight">Cadastro de Profissões</h1>
          <p className="text-muted-foreground">Gerencie os cargos e profissões do seu estabelecimento.</p>
        </div>
        <AddProfessionDialog onProfessionAdded={fetchProfessions}>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Profissão
            </Button>
        </AddProfessionDialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome da Profissão</TableHead>
              <TableHead><span className="sr-only">Ações</span></TableHead>
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
                  {/* Action buttons like Edit/Delete can be added here */}
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">
                        Nenhuma profissão cadastrada.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
