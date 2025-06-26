'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Scissors, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClientAccount, getTheBarbershopId } from '@/lib/data';

const signupSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  phone: z.string().min(8, { message: 'Por favor, insira um telefone válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function ClientSignupPage() {
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

  const onSubmit = async (data: SignupFormValues) => {
    setLoading(true);
    try {
      const barbershopId = await getTheBarbershopId();
      if (!barbershopId) {
        throw new Error("Não foi possível encontrar a barbearia. O sistema pode não estar configurado.");
      }
      
      await createClientAccount(barbershopId, data);

      toast({
        title: 'Conta Criada com Sucesso!',
        description: `Bem-vindo, ${data.name}!`,
      });

      router.push('/'); // Go to root, which will redirect to the correct portal
    } catch (error: any) {
      console.error(error);
      let description = 'Ocorreu um erro. Por favor, tente novamente.';
      if (error.code === 'auth/email-already-in-use') {
        description = 'Este email já está em uso. Tente outro ou faça login.';
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
            <div className="p-2 bg-primary/20 rounded-lg">
              <Scissors className="size-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-primary">BarberEasy</h1>
          </div>
          <CardTitle className="text-2xl">Crie sua Conta de Cliente</CardTitle>
          <CardDescription>Cadastre-se para agendar seu próximo corte.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                {...register('name')}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-8888"
                {...register('phone')}
                className={errors.phone ? 'border-destructive' : ''}
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
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
            <Link href="/portal/login" className="font-medium text-primary hover:underline">
              Faça login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
