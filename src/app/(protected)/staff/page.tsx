'use client';

import { getStaff } from "@/lib/data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Star, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";

type StaffMember = Awaited<ReturnType<typeof getStaff>>[0];

export default function StaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStaff() {
      if (user?.uid) {
        setLoading(true);
        const fetchedStaff = await getStaff(user.uid);
        setStaff(fetchedStaff);
        setLoading(false);
      }
    }
    fetchStaff();
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
          <h1 className="text-3xl font-bold tracking-tight">Perfis da Equipe</h1>
          <p className="text-muted-foreground">Gerencie sua talentosa equipe de barbeiros.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Funcionário
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Especializações</TableHead>
              <TableHead>Comissão</TableHead>
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
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {member.specializations.map(spec => (
                      <Badge key={spec} variant="secondary">
                        <Star className="mr-1 h-3 w-3 text-accent"/>
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{(member.commissionRate * 100).toFixed(0)}%</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/staff/${member.id}`}>Ver Perfil</Link>
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
