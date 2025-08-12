
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { app } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';

const setupSchema = z.object({
  barbershopName: z.string().min(2, { message: 'O nome do salão é obrigatório.' }),
});

type SetupFormValues = z.infer<typeof setupSchema>;

export default function SetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading, setupComplete } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
  });

  useEffect(() => {
    // If setup is already complete, redirect away.
    if (!authLoading && setupComplete) {
      router.replace('/dashboard');
    }
  }, [authLoading, setupComplete, router]);

  const db = getFirestore(app);

  const onSubmit = async (data: SetupFormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Você não está logado.' });
        return;
    }
    setLoading(true);
    try {
      // Create the document for the barbershop in Firestore
      await setDoc(doc(db, "barbershops", user.uid), {
        name: data.barbershopName,
        email: user.email,
        ownerId: user.uid,
        createdAt: new Date(),
        avatarUrl: `https://placehold.co/400x400.png`,
        whatsappNumber: '',
        operatingHours: {
            monday: { open: true, start: '09:00', end: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
            tuesday: { open: true, start: '09:00', end: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
            wednesday: { open: true, start: '09:00', end: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
            thursday: { open: true, start: '09:00', end: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
            friday: { open: true, start: '09:00', end: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
            saturday: { open: true, start: '09:00', end: '14:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
            sunday: { open: false, start: '09:00', end: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
        },
        appointmentInterval: 30,
        loyaltyProgram: {
          enabled: false,
          rewards: [],
        },
      });

      toast({
        title: 'Perfil Criado com Sucesso!',
        description: `Bem-vindo, ${data.barbershopName}!`,
      });

      // Force a reload of the window. This will trigger the auth context to re-evaluate
      // and find the newly created Firestore document, then redirect to the dashboard.
      window.location.href = '/dashboard';

    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro na Configuração',
        description: 'Não foi possível salvar seu perfil. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (authLoading || !user || setupComplete) {
      return (
         <div className="flex h-screen items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div>
              <h1 className="text-3xl font-bold leading-none font-body">
                <span className="text-foreground">Estilo</span><span className="text-primary">Gestor</span>
              </h1>
            </div>
          </div>
          <CardTitle className="text-2xl">Complete seu Cadastro</CardTitle>
          <CardDescription>Para começar, precisamos de mais algumas informações sobre seu estabelecimento.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="barbershopName">Nome do Salão/Barbearia</Label>
              <Input
                id="barbershopName"
                type="text"
                placeholder="Ex: Salão da Maria"
                {...register('barbershopName')}
                className={errors.barbershopName ? 'border-destructive' : ''}
              />
              {errors.barbershopName && <p className="text-sm text-destructive">{errors.barbershopName.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Salvar e Continuar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
