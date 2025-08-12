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
import { ImagePicker } from '../ui/image-picker';

const profileSchema = z.object({
  name: z.string().min(2, 'O nome do estabelecimento é obrigatório.'),
  avatarUrl: z.string().nullable(),
  whatsappNumber: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      avatarUrl: null,
      whatsappNumber: '',
    },
  });

  const { formState: { isSubmitting, isDirty }, reset } = form;

  useEffect(() => {
    if (user) {
      getBarbershopSettings(user.uid).then(settings => {
        if (settings) {
          reset({
            name: settings.name,
            avatarUrl: settings.avatarUrl || null,
            whatsappNumber: settings.whatsappNumber || '',
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
      // A função de atualização lida com o upload, então podemos resetar com a URL do data URL
      // ou a URL original, pois a UI já está mostrando a prévia.
      reset(data);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar o perfil.',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil do Estabelecimento</CardTitle>
        <CardDescription>
          Atualize o nome e as informações de contato do seu negócio.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
             <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                       <ImagePicker
                          label="Foto/Logo do Estabelecimento"
                          currentImage={field.value}
                          onImageChange={field.onChange}
                          fallbackText={form.watch('name')?.charAt(0) || 'B'}
                        />
                    </FormControl>
                    <FormMessage />
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
            <FormField
              control={form.control}
              name="whatsappNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do WhatsApp</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="5511999998888" {...field} />
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
