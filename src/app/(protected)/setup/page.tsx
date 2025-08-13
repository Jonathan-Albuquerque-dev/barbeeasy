
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit } from 'lucide-react';
import { app } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { ImageCropper } from '@/components/ui/image-cropper';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const setupSchema = z.object({
  barbershopName: z.string().min(2, { message: 'O nome do salão é obrigatório.' }),
  whatsappNumber: z.string().optional(),
  avatarUrl: z.string().optional(),
});

type SetupFormValues = z.infer<typeof setupSchema>;

export default function SetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading, setupComplete } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [newAvatarDataUrl, setNewAvatarDataUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      barbershopName: '',
      whatsappNumber: '',
      avatarUrl: '',
    }
  });

  useEffect(() => {
    // If setup is already complete, redirect away.
    if (!authLoading && setupComplete) {
      router.replace('/dashboard');
    }
  }, [authLoading, setupComplete, router]);

  const db = getFirestore(app);
  
  const handleCroppedImage = (dataUrl: string) => {
    setNewAvatarDataUrl(dataUrl);
    setValue('avatarUrl', dataUrl, { shouldDirty: true });
    setIsCropperOpen(false);
  };

  const onSubmit = async (data: SetupFormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Você não está logado.' });
        return;
    }
    setLoading(true);
    try {
      // Create the document for the barbershop in Firestore
      await setDoc(doc(db, "barbershops", user.uid), {
        name: data.barbershopName,
        email: user.email,
        ownerId: user.uid,
        createdAt: new Date(),
        avatarUrl: newAvatarDataUrl || `https://placehold.co/400x400.png`,
        whatsappNumber: data.whatsappNumber || '',
        operatingHours: {
            monday: { open: true, start: '09:00', end: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
            tuesday: { open: true, start: '09:00', end: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
            wednesday: { open: true, start: '09:00', end: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
            thursday: { open: true, start: '09:00', end: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
            friday: { open: true, start: '09:00', end: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
            saturday: { open: true, start: '09:00', end: '14:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
            sunday: { open: false, start: '09:00', end: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
        },
        appointmentInterval: 30,
        loyaltyProgram: {
          enabled: false,
          rewards: [],
        },
      });

      toast({
        title: 'Perfil Criado com Sucesso!',
        description: `Bem-vindo, ${data.barbershopName}!`,
      });

      // Force a reload of the window. This will trigger the auth context to re-evaluate
      // and find the newly created Firestore document, then redirect to the dashboard.
      window.location.href = '/dashboard';

    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro na Configuração',
        description: 'Não foi possível salvar seu perfil. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (authLoading || !user || setupComplete) {
      return (
         <div className="flex h-screen items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )
  }
  
  const watchedName = watch('barbershopName');
  const watchedAvatarUrl = watch('avatarUrl');

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-3 mb-4">
              <div>
                <h1 className="text-3xl font-bold leading-none font-body">
                  <span className="text-foreground">Estilo</span><span className="text-primary">Gestor</span>
                </h1>
              </div>
            </div>
            <CardTitle className="text-2xl">Complete seu Cadastro</CardTitle>
            <CardDescription>Para começar, precisamos de mais algumas informações sobre seu estabelecimento.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage
                      src={newAvatarDataUrl || watchedAvatarUrl || undefined}
                      data-ai-hint="logo barbershop"
                    />
                    <AvatarFallback>
                      {watchedName?.charAt(0) || "S"}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                    onClick={() => setIsCropperOpen(true)}
                  >
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Alterar foto</span>
                  </Button>
                </div>
                <div className="w-full space-y-4">
                  <div>
                    <Label htmlFor="barbershopName">
                      Nome do Salão/Barbearia
                    </Label>
                    <Input
                      id="barbershopName"
                      type="text"
                      placeholder="Ex: Salão da Maria"
                      {...register("barbershopName")}
                      className={
                        errors.barbershopName ? "border-destructive" : ""
                      }
                    />
                    {errors.barbershopName && (
                      <p className="text-sm text-destructive">
                        {errors.barbershopName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="whatsappNumber">WhatsApp (Opcional)</Label>
                    <Input
                      id="whatsappNumber"
                      type="tel"
                      placeholder="5511999998888"
                      {...register("whatsappNumber")}
                      className={
                        errors.whatsappNumber ? "border-destructive" : ""
                      }
                    />
                    {errors.whatsappNumber && (
                      <p className="text-sm text-destructive">
                        {errors.whatsappNumber.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Salvar e Continuar"
                )}
              </Button>
            </form>
          </CardContent>
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
