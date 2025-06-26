'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getClientByAuthId, updateClientProfile } from '@/lib/data';
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';

const profileSchema = z.object({
  name: z.string().min(2, 'O nome é obrigatório.'),
  phone: z.string().min(8, 'Insira um telefone válido.'),
  avatarUrl: z.string().url('Insira uma URL de imagem válida.').or(z.literal('')),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'A senha atual é obrigatória.'),
    newPassword: z.string().min(6, 'A nova senha deve ter pelo menos 6 caracteres.'),
    confirmPassword: z.string().min(6, 'A confirmação de senha deve ter pelo menos 6 caracteres.'),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export function ClientProfileForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const barbershopId = searchParams.get('barbershopId');
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(true);

  // Profile Form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', phone: '', avatarUrl: '' },
  });
  
  // Password Form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (user && barbershopId) {
      setLoading(true);
      getClientByAuthId(barbershopId, user.uid).then(clientData => {
        if (clientData) {
          profileForm.reset({
            name: clientData.name,
            phone: clientData.phone,
            avatarUrl: clientData.avatarUrl || '',
          });
          setClientId(clientData.id);
        }
        setLoading(false);
      });
    }
  }, [user, barbershopId, profileForm]);

  const onProfileSubmit = async (data: ProfileFormValues) => {
    if (!user || !barbershopId || !clientId) return;
    
    try {
      await updateClientProfile(barbershopId, clientId, user, data);
      toast({ title: 'Sucesso!', description: 'Seu perfil foi atualizado.' });
      profileForm.reset(data);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o perfil.' });
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    if (!user || !user.email) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }
    const auth = getAuth(app);
    const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
    
    try {
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, data.newPassword);
        toast({ title: 'Sucesso!', description: 'Sua senha foi alterada.' });
        passwordForm.reset();
    } catch (error: any) {
      let description = 'Ocorreu um erro ao alterar sua senha.';
      if (error.code === 'auth/wrong-password') {
        description = 'A senha atual está incorreta.';
      }
      toast({ variant: 'destructive', title: 'Erro de Segurança', description });
    }
  };

  const watchedAvatarUrl = profileForm.watch('avatarUrl');

  if (loading) {
      return (
          <div className='space-y-8'>
              <Card><CardHeader><Skeleton className="h-8 w-48" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
              <Card><CardHeader><Skeleton className="h-8 w-48" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
          </div>
      )
  }

  return (
    <div className="space-y-8">
        {/* Profile Details Form */}
        <Card>
            <CardHeader>
                <CardTitle>Informações do Perfil</CardTitle>
                <CardDescription>Atualize seu nome, telefone e foto.</CardDescription>
            </CardHeader>
            <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                    <CardContent className="space-y-6">
                         <FormField
                            control={profileForm.control}
                            name="avatarUrl"
                            render={({ field }) => (
                            <FormItem className='flex items-center gap-4'>
                                <Avatar className='h-20 w-20'>
                                    <AvatarImage src={watchedAvatarUrl} data-ai-hint="person face" />
                                    <AvatarFallback>{profileForm.watch('name')?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                                <div className='flex-grow space-y-2'>
                                    <FormLabel>URL da Foto</FormLabel>
                                    <FormControl><Input placeholder="https://exemplo.com/sua-foto.png" {...field} /></FormControl>
                                    <FormMessage />
                                </div>
                            </FormItem>
                            )}
                        />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={profileForm.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome Completo</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={profileForm.control} name="phone" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Telefone</FormLabel>
                                    <FormControl><Input type="tel" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                         </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button type="submit" disabled={profileForm.formState.isSubmitting || !profileForm.formState.isDirty}>
                            {profileForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Alterações
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>

        {/* Password Change Form */}
        <Card>
            <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>Use uma senha forte que você não esteja usando em outro lugar.</CardDescription>
            </CardHeader>
            <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                    <CardContent className="space-y-4">
                         <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                            <FormItem><FormLabel>Senha Atual</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                            <FormItem><FormLabel>Nova Senha</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                            <FormItem><FormLabel>Confirmar Nova Senha</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                            {passwordForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Alterar Senha
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    </div>
  );
}
