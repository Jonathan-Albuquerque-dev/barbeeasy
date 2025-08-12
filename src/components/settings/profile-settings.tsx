
'use client';

import { useEffect, useState } from 'react';
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
import { Loader2, Edit } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getAuth, updateProfile } from 'firebase/auth';
import { ImageCropper } from '../ui/image-cropper';

const profileSchema = z.object({
  name: z.string().min(2, 'O nome do estabelecimento é obrigatório.'),
  avatarUrl: z.string().optional(),
  whatsappNumber: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileSettings() {
  const { user, forceUserRefresh } = useAuth();
  const { toast } = useToast();
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [newAvatarDataUrl, setNewAvatarDataUrl] = useState<string | null>(null);
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      avatarUrl: '',
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
            avatarUrl: settings.avatarUrl || '',
            whatsappNumber: settings.whatsappNumber || '',
          });
        }
      });
    }
  }, [user, reset]);
  
  const onProfileSubmit = async (data: ProfileFormValues) => {
    if (!user) return;

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      // Use the new Base64 string if it exists, otherwise use the existing URL
      const finalAvatarUrl = newAvatarDataUrl || data.avatarUrl;

      const settingsToUpdate = {
          name: data.name,
          whatsappNumber: data.whatsappNumber || '',
          avatarUrl: finalAvatarUrl || `https://placehold.co/400x400.png`,
      };
      
      await updateBarbershopProfile(user.uid, settingsToUpdate);

      // Only update Auth profile if there's a new image.
      // Firebase Auth photoURL requires a live URL, not a Data URI.
      // For this implementation, we will skip updating the auth profile photo
      // and rely on fetching the Data URI from Firestore.
      if (currentUser && newAvatarDataUrl) {
         // In a Storage-based approach, you would update the auth profile here:
         // await updateProfile(currentUser, { photoURL: uploadedImageUrl });
         forceUserRefresh(); // Force refresh to get potentially updated user data.
      }
      
      toast({
        title: 'Sucesso!',
        description: 'O perfil do seu negócio foi atualizado.',
      });
      
      setNewAvatarDataUrl(null); // Clear the temp new avatar state
      reset(settingsToUpdate); // Update form with new values and reset dirty state

    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar o perfil.',
      });
    }
  };
  
  const handleCroppedImage = (dataUrl: string) => {
    setNewAvatarDataUrl(dataUrl);
    setValue('avatarUrl', dataUrl, { shouldDirty: true });
    setIsCropperOpen(false);
  };

  const watchedName = watch('name');
  const watchedAvatarUrl = watch('avatarUrl');

  const isFormDirty = isDirty || newAvatarDataUrl !== null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Perfil do Estabelecimento</CardTitle>
          <CardDescription>
            Atualize o nome e as informações de contato do seu negócio.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onProfileSubmit)}>
            <CardContent className="space-y-6">
              <div className='flex items-center gap-4'>
                  <div className="relative">
                      <Avatar className='h-20 w-20'>
                          <AvatarImage src={newAvatarDataUrl || watchedAvatarUrl || undefined} data-ai-hint="logo barbershop" />
                          <AvatarFallback>{watchedName?.charAt(0) || 'B'}</AvatarFallback>
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
                  </div>
              </div>
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
              <Button type="submit" disabled={isSubmitting || !isFormDirty}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <ImageCropper 
        isOpen={isCropperOpen} 
        onClose={() => setIsCropperOpen(false)}
        onImageCropped={handleCroppedImage}
      />
    </>
  );
}
