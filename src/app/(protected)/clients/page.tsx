'use client';

import { getClients } from "@/lib/data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Award, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";

type ClientListItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  loyaltyStatus: 'Ouro' | 'Prata' | 'Bronze';
  avatarUrl: string;
};

export default function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClients() {
      if (user?.uid) {
        setLoading(true);
        const fetchedClients = await getClients(user.uid);
        setClients(fetchedClients);
        setLoading(false);
      }
    }
    fetchClients();
  }, [user]);

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
          <h1 className="text-3xl font-bold tracking-tight">Cadastro de Clientes</h1>
          <p className="text-muted-foreground">Veja e gerencie todos os seus clientes.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Cliente
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status de Fidelidade</TableHead>
              <TableHead><span className="sr-only">Ações</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map(client => (
              <TableRow key={client.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={client.avatarUrl} alt={client.name} data-ai-hint="person face" />
                      <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{client.name}</span>
                  </div>
                </TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell>{client.phone}</TableCell>
                <TableCell>
                   <Badge variant={client.loyaltyStatus === 'Ouro' ? 'default' : 'secondary'} className={client.loyaltyStatus === 'Ouro' ? 'bg-accent text-accent-foreground' : ''}>
                    <Award className="mr-2 h-4 w-4" />
                    {client.loyaltyStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/clients/${client.id}`}>Ver Perfil</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
