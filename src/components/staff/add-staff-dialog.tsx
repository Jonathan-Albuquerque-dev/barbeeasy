
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { addStaff, getProfessions } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Edit } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ImageCropper } from '../ui/image-cropper';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

type Profession = {
  id: string;
  name: string;
}

const staffSchema = z.object({
  name: z.string().min(2, { message: 'O nome do funcionário é obrigatório.' }),
  professionId: z.string().min(1, 'A profissão é obrigatória.'),
  specializations: z.string().min(3, { message: 'Informe ao menos uma especialização.' }),
  serviceCommissionRate: z.coerce.number().min(0, { message: 'A comissão não pode ser negativa.' }).max(100, { message: 'A comissão não pode ser maior que 100.' }),
  productCommissionRate: z.coerce.number().min(0, { message: 'A comissão não pode ser negativa.' }).max(100, { message: 'A comissão não pode ser maior que 100.' }),
  bio: z.string().min(10, { message: 'A biografia deve ter pelo menos 10 caracteres.' }),
  avatarUrl: z.string().optional(),
});

type StaffFormValues = z.infer<typeof staffSchema>;

interface AddStaffDialogProps {
  onStaffAdded: () => void;
  children: React.ReactNode;
}

export function AddStaffDialog({ onStaffAdded, children }: AddStaffDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [newAvatarDataUrl, setNewAvatarDataUrl] = useState<string | null>(null);

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: '',
      professionId: '',
      specializations: '',
      serviceCommissionRate: 25,
      productCommissionRate: 10,
      bio: '',
      avatarUrl: '',
    },
  });
  
  const { setValue, watch, reset } = form;

  useEffect(() => {
    if (open && user?.uid) {
        getProfessions(user.uid).then(setProfessions);
    }
  }, [open, user]);
  
  const handleCroppedImage = (dataUrl: string) => {
    setNewAvatarDataUrl(dataUrl);
    setValue('avatarUrl', dataUrl, { shouldDirty: true });
    setIsCropperOpen(false);
  };

  const onSubmit = async (data: StaffFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado para adicionar um funcionário.' });
      return;
    }

    setLoading(true);
    try {
      const selectedProfession = professions.find(p => p.id === data.professionId);
      
      const transformedData = {
        name: data.name,
        professionId: data.professionId,
        professionName: selectedProfession?.name || 'Não definida',
        specializations: data.specializations.split(',').map(s => s.trim()).filter(s => s),
        serviceCommissionRate: data.serviceCommissionRate / 100,
        productCommissionRate: data.productCommissionRate / 100,
        bio: data.bio,
        avatarUrl: newAvatarDataUrl || `https://placehold.co/400x400.png`,
      };

      await addStaff(user.uid, transformedData);
      
      toast({
        title: 'Sucesso!',
        description: `${data.name} foi adicionado à equipe.`,
      });
      onStaffAdded();
      setOpen(false);
      reset();
      setNewAvatarDataUrl(null);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar funcionário',
        description: 'Não foi possível salvar os dados. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const watchedName = watch('name');
  const watchedAvatarUrl = watch('avatarUrl');

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
            reset();
            setNewAvatarDataUrl(null);
        }
      }}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Profissional</DialogTitle>
            <DialogDescription>
              Preencha os detalhes do novo membro da equipe.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className='flex items-center gap-4'>
                    <div className="relative">
                        <Avatar className='h-20 w-20'>
                            <AvatarImage src={newAvatarDataUrl || watchedAvatarUrl || undefined} data-ai-hint="person face" />
                            <AvatarFallback>{watchedName?.charAt(0) || 'P'}</AvatarFallback>
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
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Carlos Silva" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                </div>

              <FormField
                control={form.control}
                name="professionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profissão</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma profissão" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {professions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biografia</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Uma breve descrição sobre o profissional..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="specializations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especializações</FormLabel>
                    <FormControl>
                      <Input placeholder="Corte, Coloração (separado por vírgula)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                  <FormField
                  control={form.control}
                  name="serviceCommissionRate"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Comissão Serviço (%)</FormLabel>
                      <FormControl>
                          <Input type="number" min="0" max="100" placeholder="Ex: 25" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                  control={form.control}
                  name="productCommissionRate"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Comissão Produto (%)</FormLabel>
                      <FormControl>
                          <Input type="number" min="0" max="100" placeholder="Ex: 10" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Profissional'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <ImageCropper 
        isOpen={isCropperOpen} 
        onClose={() => setIsCropperOpen(false)}
        onImageCropped={handleCroppedImage}
      />
    </>
  );
}
