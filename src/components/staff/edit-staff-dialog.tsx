
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { updateStaff, Staff, getProfessions } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
  avatarUrl: z.string().url({ message: 'Por favor, insira uma URL de imagem válida.' }).or(z.literal('')).optional(),
});

type StaffFormValues = z.infer<typeof staffSchema>;

interface EditStaffDialogProps {
  staffMember: Staff;
  onStaffUpdated: () => void;
  children: React.ReactNode;
}

export function EditStaffDialog({ staffMember, onStaffUpdated, children }: EditStaffDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [professions, setProfessions] = useState<Profession[]>([]);

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: '',
      professionId: '',
      specializations: '',
      serviceCommissionRate: 0,
      productCommissionRate: 0,
      bio: '',
      avatarUrl: '',
    },
  });

  useEffect(() => {
    if (open && user?.uid) {
        getProfessions(user.uid).then(setProfessions);
    }
  }, [open, user]);

  useEffect(() => {
    if (open) {
      form.reset({
        name: staffMember.name,
        professionId: staffMember.professionId,
        specializations: staffMember.specializations.join(', '),
        serviceCommissionRate: staffMember.serviceCommissionRate * 100,
        productCommissionRate: staffMember.productCommissionRate * 100,
        bio: staffMember.bio,
        avatarUrl: staffMember.avatarUrl || '',
      });
    }
  }, [open, staffMember, form]);

  const onSubmit = async (data: StaffFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado para editar um funcionário.' });
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
        avatarUrl: data.avatarUrl || `https://placehold.co/400x400.png`,
      };

      await updateStaff(user.uid, staffMember.id, transformedData);
      
      toast({
        title: 'Sucesso!',
        description: `O perfil de ${data.name} foi atualizado.`,
      });
      onStaffUpdated();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao editar funcionário',
        description: 'Não foi possível salvar as alterações. Tente novamente.',
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
          <DialogTitle>Editar Funcionário</DialogTitle>
          <DialogDescription>
            Atualize os detalhes do membro da equipe.
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
              name="professionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profissão</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value}>
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
                    <Textarea placeholder="Uma breve descrição sobre o barbeiro..." {...field} />
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
                    <Input placeholder="Corte, Barba, Coloração (separado por vírgula)" {...field} />
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
                        <Input type="number" min="0" max="100" {...field} />
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
                        <Input type="number" min="0" max="100" {...field} />
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
                    <Input type="url" placeholder="https://exemplo.com/foto.png" {...field} value={field.value || ''}/>
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
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
