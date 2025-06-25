'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { assignSubscriptionToClient, getClients, getSubscriptions, Subscription } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const subscriberSchema = z.object({
  clientId: z.string().min(1, 'Selecione um cliente.'),
  subscriptionId: z.string().min(1, 'Selecione um plano de assinatura.'),
  paymentMethod: z.string().min(1, 'Selecione uma forma de pagamento.'),
});

type SubscriberFormValues = z.infer<typeof subscriberSchema>;

type ClientForSelect = {
    id: string;
    name: string;
}

interface AddSubscriberDialogProps {
  onSubscriberAdded: () => void;
  children: React.ReactNode;
}

export function AddSubscriberDialog({ onSubscriberAdded, children }: AddSubscriberDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ClientForSelect[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const form = useForm<SubscriberFormValues>({
    resolver: zodResolver(subscriberSchema),
    defaultValues: {
      clientId: '',
      subscriptionId: '',
      paymentMethod: '',
    },
  });

  useEffect(() => {
    async function fetchData() {
        if (open && user?.uid) {
            setLoading(true);
            try {
                const [fetchedClients, fetchedSubscriptions] = await Promise.all([
                    getClients(user.uid),
                    getSubscriptions(user.uid)
                ]);
                setClients(fetchedClients.map(c => ({ id: c.id, name: c.name })));
                setSubscriptions(fetchedSubscriptions);
            } catch (e) {
                console.error(e);
                toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os dados.' });
            } finally {
                setLoading(false);
            }
        }
    }
    fetchData();
  }, [open, user, toast]);


  const onSubmit = async (data: SubscriberFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado.' });
      return;
    }

    setLoading(true);
    try {
        const selectedSubscription = subscriptions.find(s => s.id === data.subscriptionId);
        if (!selectedSubscription) {
            throw new Error("Assinatura selecionada não encontrada.");
        }
        
        await assignSubscriptionToClient(user.uid, data.clientId, data.subscriptionId, selectedSubscription.name, data.paymentMethod);
      
        toast({
            title: 'Sucesso!',
            description: `O cliente agora é um assinante.`,
        });
        onSubscriberAdded();
        setOpen(false);
        form.reset();
    } catch (error: any) {
        console.error(error);
        toast({
            variant: 'destructive',
            title: 'Erro ao adicionar assinante',
            description: error.message || 'Não foi possível salvar os dados. Tente novamente.',
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
          <DialogTitle>Adicionar Novo Assinante</DialogTitle>
          <DialogDescription>
            Vincule um cliente a um plano de assinatura.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subscriptionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plano de Assinatura</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um plano" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subscriptions.map(s => <SelectItem key={s.id} value={s.id}>{s.name} - R${s.price.toFixed(2)}/mês</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de Pagamento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="Cartão de Crédito/Débito">Cartão de Crédito/Débito</SelectItem>
                        <SelectItem value="Pix">Pix</SelectItem>
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
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Assinatura'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
