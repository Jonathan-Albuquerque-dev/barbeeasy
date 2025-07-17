
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { addProfession } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

const professionSchema = z.object({
  name: z.string().min(2, { message: 'O nome da profissão é obrigatório.' }),
});

type ProfessionFormValues = z.infer<typeof professionSchema>;

interface AddProfessionDialogProps {
  onProfessionAdded: () => void;
  children: React.ReactNode;
}

export function AddProfessionDialog({ onProfessionAdded, children }: AddProfessionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<ProfessionFormValues>({
    resolver: zodResolver(professionSchema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = async (data: ProfessionFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado para adicionar uma profissão.' });
      return;
    }

    setLoading(true);
    try {
      await addProfession(user.uid, data);
      toast({
        title: 'Sucesso!',
        description: `A profissão "${data.name}" foi adicionada.`,
      });
      onProfessionAdded();
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar profissão',
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
          <DialogTitle>Adicionar Nova Profissão</DialogTitle>
          <DialogDescription>
            Cadastre um novo cargo ou profissão para sua equipe.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Profissão</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Cabeleireiro(a)" {...field} />
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
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Profissão'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
