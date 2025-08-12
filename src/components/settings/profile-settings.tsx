
'use client';

import { useEffect, useRef, useState } from 'react';
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
  avatarUrl: z.any(),
  whatsappNumber: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      avatarUrl: null,
      whatsappNumber: '',
    },
  });

  const { formState: { isSubmitting, isDirty }, reset, watch, setValue } = form;

  useEffect(() => {
    if (user) {
      getBarbershopSettings(user.uid).then(settings => {
        if (settings) {
          reset({
            name: settings.name,
            avatarUrl: settings.avatarUrl || null,
            whatsappNumber: settings.whatsappNumber || '',
          });
          if (settings.avatarUrl) {
            setPreview(settings.avatarUrl);
          }
        }
      });
    }
  }, [user, reset]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setValue('avatarUrl', file, { shouldDirty: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    try {
        let avatarUrlToSave = data.avatarUrl;
        if (data.avatarUrl instanceof File) {
            const reader = new FileReader();
            avatarUrlToSave = await new Promise((resolve) => {
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsDataURL(data.avatarUrl);
            });
        }
      
      const updateData = {
        name: data.name,
        whatsappNumber: data.whatsappNumber,
        avatarUrl: avatarUrlToSave,
      };

      await updateBarbershopProfile(user.uid, updateData);
      
      toast({
        title: 'Sucesso!',
        description: 'O perfil do seu negócio foi atualizado.',
      });

      // After successful save, reset form with the new URL if a new file was uploaded
      if(updateData.avatarUrl.startsWith('data:image')) {
        // This is a bit of a trick: we refetch settings to get the new `https://` URL
        // and avoid keeping the large base64 string in state.
         getBarbershopSettings(user.uid).then(settings => {
             if (settings) {
                 const newData = {
                    name: settings.name,
                    avatarUrl: settings.avatarUrl || null,
                    whatsappNumber: settings.whatsappNumber || '',
                 };
                reset(newData);
                setPreview(settings.avatarUrl || null);
             }
         });
      } else {
         reset(data); // Resets the form's dirty state
      }

    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar o perfil.',
      });
    }
  };
  
  const watchedName = watch('name');

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
             <div className='flex items-center gap-4'>
                <Avatar className='h-20 w-20'>
                    <AvatarImage src={preview || undefined} data-ai-hint="logo barbershop" />
                    <AvatarFallback>{watchedName?.charAt(0) || 'B'}</AvatarFallback>
                </Avatar>
                <div className='flex-grow space-y-2'>
                    <FormLabel>Foto/Logo</FormLabel>
                    <FormControl>
                      <>
                        <Input 
                            type="file" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileChange}
                            accept="image/png, image/jpeg, image/webp"
                        />
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                            Selecionar Foto
                        </Button>
                      </>
                    </FormControl>
                    <FormMessage />
                </div>
            </div>
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
