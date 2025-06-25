'use client';

import { getStaffById } from '@/lib/data';
import { useParams, notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Star, Scissors, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';

type StaffMember = Awaited<ReturnType<typeof getStaffById>>;

export default function StaffDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [member, setMember] = useState<StaffMember>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStaffMember() {
      if (user?.uid) {
        setLoading(true);
        const fetchedMember = await getStaffById(user.uid, params.id);
        if (!fetchedMember) {
          notFound();
        }
        setMember(fetchedMember);
        setLoading(false);
      }
    }
    fetchStaffMember();
  }, [user, params.id]);

  if (loading || !member) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{member.name}</h1>
          <p className="text-muted-foreground">Perfil do Funcionário</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/staff">Voltar para Todos os Funcionários</Link>
        </Button>
      </div>
      
      <Card className="overflow-hidden">
        <div className="bg-primary/10 h-32" />
        <CardContent className="pt-6 flex flex-col items-center text-center -mt-20">
          <Avatar className="h-32 w-32 mb-4 border-4 border-background shadow-lg">
            <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="person portrait" />
            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <h2 className="text-3xl font-semibold">{member.name}</h2>
          <CardDescription className="max-w-prose mx-auto mt-4 mb-6">
            {member.bio}
          </CardDescription>

          <div className="w-full max-w-md mx-auto">
            <Card className="bg-background/80">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2">
                        <Scissors className="h-5 w-5" />
                        Especializações
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap justify-center gap-2">
                        {member.specializations.map(spec => (
                        <Badge key={spec} variant="secondary" className="text-sm py-1 px-3">
                            <Star className="mr-2 h-4 w-4 text-accent"/>
                            {spec}
                        </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
