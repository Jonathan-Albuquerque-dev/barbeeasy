'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { addStaff } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

const staffSchema = z.object({
  name: z.string().min(2, { message: 'O nome do funcionário é obrigatório.' }),
  specializations: z.string().min(3, { message: 'Informe ao menos uma especialização.' }),
  serviceCommissionRate: z.coerce.number().min(0, { message: 'A comissão não pode ser negativa.' }).max(100, { message: 'A comissão não pode ser maior que 100.' }),
  productCommissionRate: z.coerce.number().min(0, { message: 'A comissão não pode ser negativa.' }).max(100, { message: 'A comissão não pode ser maior que 100.' }),
  bio: z.string().min(10, { message: 'A biografia deve ter pelo menos 10 caracteres.' }),
  avatarUrl: z.string().url({ message: 'Por favor, insira uma URL de imagem válida.' }).or(z.literal('')).optional(),
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

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: '',
      specializations: '',
      serviceCommissionRate: 25,
      productCommissionRate: 10,
      bio: '',
      avatarUrl: '',
    },
  });

  const onSubmit = async (data: StaffFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado para adicionar um funcionário.' });
      return;
    }

    setLoading(true);
    try {
      const transformedData = {
        name: data.name,
        // Split comma-separated string into an array of strings, trimming whitespace
        specializations: data.specializations.split(',').map(s => s.trim()).filter(s => s),
        // Convert percentage to a decimal (e.g., 25 -> 0.25)
        serviceCommissionRate: data.serviceCommissionRate / 100,
        productCommissionRate: data.productCommissionRate / 100,
        bio: data.bio,
        // Use placeholder if avatarUrl is empty
        avatarUrl: data.avatarUrl || `https://placehold.co/400x400.png`,
      };

      await addStaff(user.uid, transformedData);
      
      toast({
        title: 'Sucesso!',
        description: `${data.name} foi adicionado à equipe.`,
      });
      onStaffAdded();
      setOpen(false);
      form.reset();
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Profissional</DialogTitle>
          <DialogDescription>
            Preencha os detalhes do novo membro da equipe.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                        <Input type="number" min="0" max="100" placeholder="Ex: 25" onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} value={field.value} />
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
                        <Input type="number" min="0" max="100" placeholder="Ex: 10" onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} value={field.value} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Foto de Perfil</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://exemplo.com/foto.png" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
  );
}
