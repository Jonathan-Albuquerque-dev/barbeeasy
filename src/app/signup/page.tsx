'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { app } from '@/lib/firebase';
import Link from 'next/link';

const signupSchema = z.object({
  barbershopName: z.string().min(2, { message: 'O nome do salão é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const auth = getAuth(app);
  const db = getFirestore(app);

  const onSubmit = async (data: SignupFormValues) => {
    setLoading(true);
    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      // 2. Update user profile with barbershop name
      await updateProfile(user, {
        displayName: data.barbershopName,
      });

      // 3. Create a document for the barbershop in Firestore
      await setDoc(doc(db, "barbershops", user.uid), {
        name: data.barbershopName,
        email: data.email,
        ownerId: user.uid,
        createdAt: new Date(),
        avatarUrl: `https://placehold.co/400x400.png`,
        whatsappNumber: '',
        operatingHours: {
            monday: { open: true, start: '09:00', end: '18:00' },
            tuesday: { open: true, start: '09:00', end: '18:00' },
            wednesday: { open: true, start: '09:00', end: '18:00' },
            thursday: { open: true, start: '09:00', end: '18:00' },
            friday: { open: true, start: '09:00', end: '18:00' },
            saturday: { open: true, start: '09:00', end: '14:00' },
            sunday: { open: false, start: '09:00', end: '18:00' },
        },
        appointmentInterval: 30,
        loyaltyProgram: {
          enabled: false,
          pointsPerService: 1,
          rewards: [],
        },
      });

      toast({
        title: 'Conta Criada com Sucesso!',
        description: `Bem-vindo, ${data.barbershopName}!`,
      });

      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      let description = 'Ocorreu um erro. Por favor, tente novamente.';
      if (error.code === 'auth/email-already-in-use') {
        description = 'Este email já está em uso. Tente outro.';
      }
      toast({
        variant: 'destructive',
        title: 'Erro no Cadastro',
        description,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div>
              <h1 className="text-3xl font-bold leading-none font-body">
                <span className="text-foreground">Estilo</span><span className="text-primary">Gestor</span>
              </h1>
              <p className="text-sm text-muted-foreground text-left">Gestão de Salão</p>
            </div>
          </div>
          <CardTitle className="text-2xl">Crie sua Conta</CardTitle>
          <CardDescription>Cadastre seu salão e comece a gerenciar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="barbershopName">Nome do Salão</Label>
              <Input
                id="barbershopName"
                type="text"
                placeholder="Ex: Salão da Maria"
                {...register('barbershopName')}
                className={errors.barbershopName ? 'border-destructive' : ''}
              />
              {errors.barbershopName && <p className="text-sm text-destructive">{errors.barbershopName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register('email')}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                {...register('password')}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Criar Conta'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            Já tem uma conta?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Faça login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
