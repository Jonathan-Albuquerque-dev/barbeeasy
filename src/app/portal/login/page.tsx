
'use client';

import { useState, Suspense, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { clientLogin, getBarbershopSettings } from '@/lib/data';
import { useClientSession } from '../layout';

const loginSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(1, { message: 'A senha é obrigatória.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function ClientLoginPageContent() {
  const searchParams = useSearchParams();
  const barbershopId = searchParams.get('barbershopId');
  const { login } = useClientSession();
  const [barbershopName, setBarbershopName] = useState('');

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (barbershopId) {
        getBarbershopSettings(barbershopId).then(settings => {
            if (settings) {
                setBarbershopName(settings.name);
            }
        });
    }
  }, [barbershopId]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    if (!barbershopId) {
        toast({
            variant: 'destructive',
            title: 'Erro de Configuração',
            description: 'ID da barbearia não encontrado. Use o link correto.',
        });
        return;
    }

    setLoading(true);
    try {
      const clientData = await clientLogin(barbershopId, data.email, data.password);
      
      if (clientData) {
        const session = {
          id: clientData.id,
          name: clientData.name,
          email: clientData.email,
          avatarUrl: clientData.avatarUrl,
          barbershopId: barbershopId,
        };
        login(session); // Call login from context. Redirect is handled by layout.
      } else {
        toast({
            variant: 'destructive',
            title: 'Erro de Login',
            description: 'Email ou senha inválidos. Por favor, tente novamente.',
        });
      }
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro de Login',
        description: error.message || 'Ocorreu um erro inesperado.',
      });
    } finally {
      setLoading(false);
    }
  };

  const signupLink = barbershopId ? `/portal/signup?barbershopId=${barbershopId}` : '/portal/signup';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-3 mb-4">
                {barbershopName ? (
                     <h1 className="text-3xl font-bold text-primary">{barbershopName}</h1>
                ) : (
                    <div>
                        <h1 className="text-3xl font-bold leading-none font-body">
                            <span className="text-foreground">Barbe</span><span className="text-primary">Easy</span>
                        </h1>
                        <p className="text-sm text-muted-foreground text-left">Gestão de Barbearia</p>
                    </div>
                )}
            </div>
          <CardTitle className="text-2xl">Bem-vindo(a)!</CardTitle>
          <CardDescription>{barbershopName ? `Acesse sua conta para agendar na ${barbershopName}.` : 'Acesse sua conta para agendar um horário.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                placeholder="********"
                {...register('password')}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Entrar'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <p>
              Não tem uma conta?{' '}
              <Link href={signupLink} className="font-medium text-primary hover:underline">
                Cadastre-se
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ClientLoginPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <ClientLoginPageContent />
        </Suspense>
    )
}
