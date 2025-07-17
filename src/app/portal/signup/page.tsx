'use client';

import { useState, Suspense, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClientAccount, getBarbershopSettings } from '@/lib/data';
import { useClientSession } from '../layout';

const signupSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  phone: z.string().min(8, { message: 'Por favor, insira um telefone válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
});

type SignupFormValues = z.infer<typeof signupSchema>;

function ClientSignupPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const barbershopId = searchParams.get('barbershopId');
  const { setClientSession } = useClientSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [barbershopName, setBarbershopName] = useState('');

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
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    if (!barbershopId) {
        toast({
            variant: 'destructive',
            title: 'Erro de Configuração',
            description: 'Não foi possível identificar o estabelecimento. Por favor, use o link de cadastro fornecido.',
        });
        return;
    }
    
    setLoading(true);
    try {
      const newClient = await createClientAccount(barbershopId, data);

      toast({
        title: 'Conta Criada com Sucesso!',
        description: `Bem-vindo, ${data.name}! Você já está conectado.`,
      });
      
      const session = {
          id: newClient.id,
          name: newClient.name,
          email: newClient.email,
          avatarUrl: newClient.avatarUrl,
          barbershopId: barbershopId,
      };
      setClientSession(session); // Call setClientSession from context
      router.replace(`/portal/agendar?barbershopId=${barbershopId}`); // Explicitly redirect

    } catch (error: any) {
      console.error(error);
      let description = 'Ocorreu um erro. Por favor, tente novamente.';
      if (error.message.includes('email já está em uso')) {
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

  const loginLink = barbershopId ? `/portal/login?barbershopId=${barbershopId}` : '/portal/login';

  if (!barbershopId) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-background p-4">
              <Card className="w-full max-w-md shadow-2xl">
                  <CardHeader className="text-center">
                      <CardTitle className="text-2xl text-destructive">Link de Cadastro Inválido</CardTitle>
                      <CardDescription>
                          Parece que o link que você está usando está incompleto. Por favor, solicite um novo link de cadastro ao estabelecimento.
                      </CardDescription>
                  </CardHeader>
              </Card>
          </div>
      )
  }

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
                         <span className="text-foreground">Estilo</span><span className="text-primary">Gestor</span>
                    </h1>
                    <p className="text-sm text-muted-foreground">Gestão de Salão</p>
                </div>
            )}
          </div>
          <CardTitle className="text-2xl">Crie sua Conta de Cliente</CardTitle>
          <CardDescription>{barbershopName ? `Cadastre-se para agendar seu próximo horário em ${barbershopName}.` : 'Cadastre-se para agendar seu próximo horário.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
             <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a senha"
                {...register('confirmPassword')}
                className={errors.confirmPassword ? 'border-destructive' : ''}
              />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Criar Conta'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            Já tem uma conta?{' '}
            <Link href={loginLink} className="font-medium text-primary hover:underline">
              Faça login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


export default function ClientSignupPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <ClientSignupPageContent />
        </Suspense>
    )
}
