
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { addClient } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Edit } from 'lucide-react';
import { ImageCropper } from '../ui/image-cropper';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const clientSchema = z.object({
  name: z.string().min(2, { message: 'O nome do cliente é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }).or(z.literal('')).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  loyaltyStatus: z.enum(['Bronze', 'Prata', 'Ouro'], { required_error: 'O status de fidelidade é obrigatório.' }),
  avatarUrl: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface AddClientDialogProps {
  onClientAdded: () => void;
  children: React.ReactNode;
}

export function AddClientDialog({ onClientAdded, children }: AddClientDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [newAvatarDataUrl, setNewAvatarDataUrl] = useState<string | null>(null);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      loyaltyStatus: 'Bronze',
      avatarUrl: '',
    },
  });
  
  const { setValue, watch, reset } = form;

  const handleCroppedImage = (dataUrl: string) => {
    setNewAvatarDataUrl(dataUrl);
    setValue('avatarUrl', dataUrl, { shouldDirty: true });
    setIsCropperOpen(false);
  };

  const onSubmit = async (data: ClientFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado para adicionar um cliente.' });
      return;
    }

    setLoading(true);
    try {
      const clientData = {
        ...data,
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        avatarUrl: newAvatarDataUrl || `https://placehold.co/400x400.png`,
        preferences: {
            preferredServices: [],
            preferredBarber: 'Nenhum',
            notes: 'Nenhuma observação.'
        },
        loyaltyPoints: 0,
        createdAt: new Date(),
      };

      await addClient(user.uid, clientData);
      
      toast({
        title: 'Sucesso!',
        description: `${data.name} foi adicionado à sua lista de clientes.`,
      });
      onClientAdded();
      setOpen(false);
      reset();
      setNewAvatarDataUrl(null);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar cliente',
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
            <DialogTitle>Adicionar Novo Cliente</DialogTitle>
            <DialogDescription>
              Preencha os detalhes do novo cliente.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
               <div className='flex items-center gap-4'>
                    <div className="relative">
                        <Avatar className='h-20 w-20'>
                            <AvatarImage src={newAvatarDataUrl || watchedAvatarUrl || undefined} data-ai-hint="person face" />
                            <AvatarFallback>{watchedName?.charAt(0) || 'C'}</AvatarFallback>
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
                                <Input placeholder="Ex: João da Silva" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                </div>

              <div className="grid grid-cols-2 gap-4">
                  <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Email (Opcional)</FormLabel>
                          <FormControl>
                              <Input type="email" placeholder="joao.silva@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Telefone (Opcional)</FormLabel>
                          <FormControl>
                              <Input placeholder="(11) 99999-8888" {...field} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua das Flores, 123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="loyaltyStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status de Fidelidade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status inicial" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Bronze">Bronze</SelectItem>
                        <SelectItem value="Prata">Prata</SelectItem>
                        <SelectItem value="Ouro">Ouro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Cliente'}
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
