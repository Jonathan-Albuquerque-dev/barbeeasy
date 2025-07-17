
'use client';

import { getStaff, Staff } from "@/lib/data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Star, Loader2, Edit, Briefcase } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useCallback } from "react";
import { AddStaffDialog } from "@/components/staff/add-staff-dialog";
import { EditStaffDialog } from "@/components/staff/edit-staff-dialog";

export default function StaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

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
          <p className="text-muted-foreground">Gerencie sua talentosa equipe de profissionais.</p>
        </div>
        <AddStaffDialog onStaffAdded={fetchStaff}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Profissional
          </Button>
        </AddStaffDialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Profissão</TableHead>
              <TableHead>Especializações</TableHead>
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
                  <Badge variant="outline">
                    <Briefcase className="mr-1 h-3 w-3"/>
                    {member.professionName || 'Não definida'}
                  </Badge>
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
