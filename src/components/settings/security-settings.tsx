'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { app } from '@/lib/firebase';


const securitySchema = z.object({
    currentPassword: z.string().min(1, 'A senha atual é obrigatória.'),
    newPassword: z.string().min(6, 'A nova senha deve ter pelo menos 6 caracteres.'),
    confirmPassword: z.string().min(6, 'A confirmação de senha deve ter pelo menos 6 caracteres.'),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
});

type SecurityFormValues = z.infer<typeof securitySchema>;

export function SecuritySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const { formState: { isSubmitting }, reset } = form;

  const onSubmit = async (data: SecurityFormValues) => {
    if (!user || !user.email) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
        return;
    };

    const auth = getAuth(app);
    const credential = EmailAuthProvider.credential(user.email, data.currentPassword);

    try {
        // Re-autenticar o usuário é uma prática de segurança recomendada
        await reauthenticateWithCredential(user, credential);
        
        // Se a re-autenticação for bem-sucedida, atualize a senha
        await updatePassword(user, data.newPassword);

        toast({
            title: 'Sucesso!',
            description: 'Sua senha foi alterada.',
        });
        reset();
    } catch (error: any) {
      console.error(error);
      let description = 'Ocorreu um erro ao alterar sua senha.';
      if (error.code === 'auth/wrong-password') {
        description = 'A senha atual está incorreta. Tente novamente.';
      } else if (error.code === 'auth/too-many-requests') {
        description = 'Muitas tentativas. Tente novamente mais tarde.'
      }
      toast({
        variant: 'destructive',
        title: 'Erro de Segurança',
        description,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alterar Senha</CardTitle>
        <CardDescription>
          Recomendamos usar uma senha forte que você não esteja usando em nenhum outro lugar.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha Atual</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova Senha</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Nova Senha</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Alterar Senha
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
