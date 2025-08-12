
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { app } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';

const loginSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  
  const router = useRouter();
  const { user, loading: authLoading, isBarberOwner } = useAuth();

  useEffect(() => {
    // Redirect if user is already logged in and confirmed as an owner
    if (!authLoading && user && isBarberOwner) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, isBarberOwner, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });
  
  const auth = getAuth(app);

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      // The auth context and protected layout will handle the redirect
      // to either the dashboard or the setup page.
      // We can just push to a default protected route.
      router.push('/dashboard'); 
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro de Login',
        description: 'Email ou senha inválidos. Por favor, tente novamente.',
      });
      setLoading(false);
    }
  };
  
  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({
        variant: 'destructive',
        title: 'Email necessário',
        description: 'Por favor, insira seu email para redefinir a senha.',
      });
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: 'Email Enviado',
        description: 'Verifique sua caixa de entrada para o link de redefinição de senha.',
      });
    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível enviar o email de redefinição. Verifique o email e tente novamente.',
      });
    } finally {
      setResetLoading(false);
    }
  };

  // Show a loader if auth is still loading or if a redirect is imminent
  if (authLoading || (user && isBarberOwner)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-3">
                <div className="text-center">
                  <h1 className="text-3xl font-bold leading-none font-body">
                    <span className="text-foreground">Estilo</span><span className="text-primary">Gestor</span>
                  </h1>
                  <p className="text-sm text-muted-foreground">Gestão de Salão</p>
                </div>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
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
          <div className="mt-6 text-center text-sm space-y-4">
             <p>
                Não tem uma conta de administrador?{' '}
                <Link href="/signup" className="font-medium text-primary hover:underline">
                    Cadastre-se aqui
                </Link>
            </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="link" className="p-0 h-auto font-medium text-primary">
                      Esqueceu sua senha?
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Redefinir Senha</AlertDialogTitle>
                    <AlertDialogDescription>
                      Digite seu email abaixo. Enviaremos um link para você redefinir sua senha.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                      <Label htmlFor="reset-email" className="sr-only">Email</Label>
                      <Input
                          id="reset-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                      />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePasswordReset} disabled={resetLoading}>
                      {resetLoading ? <Loader2 className="animate-spin" /> : 'Enviar Link'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
