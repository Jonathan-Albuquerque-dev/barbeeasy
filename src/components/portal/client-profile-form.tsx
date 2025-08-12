
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { updateClientProfile, updateClientPassword, Client } from '@/lib/data';
import { useClientSession } from '@/app/portal/layout';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Edit } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ImageCropper } from '../ui/image-cropper';

const profileSchema = z.object({
  name: z.string().min(2, 'O nome é obrigatório.'),
  phone: z.string().min(8, 'Insira um telefone válido.'),
  avatarUrl: z.string().optional(),
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

interface ClientProfileFormProps {
    client: Omit<Client, 'password'>;
}

export function ClientProfileForm({ client }: ClientProfileFormProps) {
  const { toast } = useToast();
  const { session, setClientSession } = useClientSession();
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [newAvatarDataUrl, setNewAvatarDataUrl] = useState<string | null>(null);

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
    if (client) {
        profileForm.reset({
            name: client.name,
            phone: client.phone,
            avatarUrl: client.avatarUrl || '',
        });
        setNewAvatarDataUrl(null);
    }
  }, [client, profileForm]);

  const onProfileSubmit = async (data: ProfileFormValues) => {
    if (!session?.barbershopId || !client.id) return;
    
    try {
        const profileData = {
            ...data,
            avatarUrl: newAvatarDataUrl || data.avatarUrl || `https://placehold.co/400x400.png`,
        };

      await updateClientProfile(session.barbershopId, client.id, profileData);
      toast({ title: 'Sucesso!', description: 'Seu perfil foi atualizado.' });
      profileForm.reset(profileData);
      
      const updatedSession = { ...session, name: profileData.name, avatarUrl: profileData.avatarUrl };
      setClientSession(updatedSession);
      setNewAvatarDataUrl(null);

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o perfil.' });
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    if (!session?.barbershopId || !client.id) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Sessão inválida.' });
      return;
    }
    
    try {
        await updateClientPassword(session.barbershopId, client.id, data.currentPassword, data.newPassword);
        toast({ title: 'Sucesso!', description: 'Sua senha foi alterada.' });
        passwordForm.reset();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro de Segurança', description: error.message });
    }
  };
  
  const handleCroppedImage = (dataUrl: string) => {
    setNewAvatarDataUrl(dataUrl);
    profileForm.setValue('avatarUrl', dataUrl, { shouldDirty: true });
    setIsCropperOpen(false);
  };


  const watchedName = profileForm.watch('name');
  const watchedAvatarUrl = profileForm.watch('avatarUrl');
  const isProfileFormDirty = profileForm.formState.isDirty || newAvatarDataUrl !== null;

  return (
    <>
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
                            <div className='flex items-center gap-4'>
                                <div className="relative">
                                    <Avatar className='h-20 w-20'>
                                        <AvatarImage src={newAvatarDataUrl || watchedAvatarUrl || undefined} data-ai-hint="person face" />
                                        <AvatarFallback>{watchedName?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <Button 
                                        type="button" 
                                        size="icon" 
                                        variant="secondary" 
                                        className="absolute bottom-0 right-0 rounded-full h-7 w-7"
                                        onClick={() => setIsCropperOpen(true)}
                                    >
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">Alterar foto</span>
                                    </Button>
                                </div>
                                <div className='flex-grow'>
                                     <FormField control={profileForm.control} name="name" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome Completo</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                            <FormField control={profileForm.control} name="phone" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Telefone</FormLabel>
                                    <FormControl><Input type="tel" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4">
                            <Button type="submit" disabled={profileForm.formState.isSubmitting || !isProfileFormDirty}>
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
        <ImageCropper
            isOpen={isCropperOpen}
            onClose={() => setIsCropperOpen(false)}
            onImageCropped={handleCroppedImage}
        />
    </>
  );
}
