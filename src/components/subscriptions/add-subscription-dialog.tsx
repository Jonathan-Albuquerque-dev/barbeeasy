'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { addSubscription, getServices, Service } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2 } from 'lucide-react';
import { Separator } from '../ui/separator';

const includedServiceSchema = z.object({
  serviceId: z.string().min(1, 'Selecione um serviço.'),
  discount: z.coerce.number().min(0, 'O desconto não pode ser negativo.').max(100, 'O desconto não pode ser maior que 100.'),
});

const subscriptionSchema = z.object({
  name: z.string().min(2, 'O nome da assinatura é obrigatório.'),
  price: z.coerce.number().positive({ message: 'O preço de venda deve ser um número positivo.' }),
  includedServices: z.array(includedServiceSchema).min(1, 'Você deve incluir pelo menos um serviço.'),
});

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;

interface AddSubscriptionDialogProps {
  onSubscriptionAdded: () => void;
  children: React.ReactNode;
}

export function AddSubscriptionDialog({ onSubscriptionAdded, children }: AddSubscriptionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      name: '',
      price: undefined,
      includedServices: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "includedServices",
  });

  useEffect(() => {
    if (open && user?.uid) {
        getServices(user.uid).then(setAvailableServices);
    }
  }, [open, user]);

  const onSubmit = async (data: SubscriptionFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado.' });
      return;
    }

    setLoading(true);
    try {
      const serviceMap = new Map(availableServices.map(s => [s.id, s.name]));
      const subscriptionData = {
        name: data.name,
        price: data.price,
        includedServices: data.includedServices.map(is => ({
            ...is,
            serviceName: serviceMap.get(is.serviceId) || 'Serviço Desconhecido'
        }))
      };

      await addSubscription(user.uid, subscriptionData);
      
      toast({
        title: 'Sucesso!',
        description: `O plano de assinatura "${data.name}" foi criado.`,
      });
      onSubscriptionAdded();
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar assinatura',
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Assinatura</DialogTitle>
          <DialogDescription>
            Preencha os detalhes do novo plano.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Assinatura</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Plano VIP Mensal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço Mensal (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="Ex: 99.90" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />
            
            <div>
                <h3 className="text-sm font-medium mb-2">Serviços Inclusos e Descontos</h3>
                 {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2 p-2 border-b">
                        <FormField
                            control={form.control}
                            name={`includedServices.${index}.serviceId`}
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                <FormLabel className="sr-only">Serviço</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um serviço" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {availableServices.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`includedServices.${index}.discount`}
                            render={({ field }) => (
                                <FormItem className="w-32">
                                <FormLabel className="sr-only">Desconto (%)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="1" placeholder="Desconto (%)" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                         />
                         <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                    </div>
                 ))}
                 <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => append({ serviceId: '', discount: 0 })}
                >
                    Adicionar Serviço ao Plano
                </Button>
                 {form.formState.errors.includedServices && (
                    <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.includedServices?.message}</p>
                 )}
            </div>


            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Assinatura'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
