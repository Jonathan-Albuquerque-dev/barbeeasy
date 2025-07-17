'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getBarbershopSettings, updateBarbershopProfile } from '@/lib/data';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const profileSchema = z.object({
  name: z.string().min(2, 'O nome do estabelecimento é obrigatório.'),
  avatarUrl: z.string().url('Insira uma URL de imagem válida.').or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      avatarUrl: '',
    },
  });

  const { formState: { isSubmitting, isDirty }, reset, watch } = form;

  useEffect(() => {
    if (user) {
      getBarbershopSettings(user.uid).then(settings => {
        if (settings) {
          reset({
            name: settings.name,
            avatarUrl: settings.avatarUrl || '',
          });
        }
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    try {
      await updateBarbershopProfile(user.uid, data);
      toast({
        title: 'Sucesso!',
        description: 'O perfil do seu negócio foi atualizado.',
      });
      reset(data); // Resets the form's dirty state
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar o perfil.',
      });
    }
  };
  
  const watchedAvatarUrl = watch('avatarUrl');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil do Estabelecimento</CardTitle>
        <CardDescription>
          Atualize o nome e a foto de perfil do seu negócio.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
             <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                <FormItem className='flex items-center gap-4'>
                    <Avatar className='h-20 w-20'>
                        <AvatarImage src={watchedAvatarUrl} data-ai-hint="logo barbershop" />
                        <AvatarFallback>{form.watch('name')?.charAt(0) || 'B'}</AvatarFallback>
                    </Avatar>
                    <div className='flex-grow space-y-2'>
                        <FormLabel>URL da Foto/Logo</FormLabel>
                        <FormControl>
                            <Input placeholder="https://exemplo.com/sua-logo.png" {...field} />
                        </FormControl>
                        <FormMessage />
                    </div>
                </FormItem>
                )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Estabelecimento</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu Salão" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
