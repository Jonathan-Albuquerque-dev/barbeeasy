'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getBarbershopSettings, getServices, updateLoyaltySettings } from '@/lib/data';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2, Gift } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const loyaltyRewardSchema = z.object({
  serviceId: z.string(),
  serviceName: z.string(),
  pointsGenerated: z.coerce.number().min(0, "Os pontos devem ser 0 ou mais."),
  pointsCost: z.coerce.number().min(0, "O custo deve ser 0 ou mais."),
});

const loyaltySchema = z.object({
  enabled: z.boolean(),
  rewards: z.array(loyaltyRewardSchema),
});

type LoyaltyFormValues = z.infer<typeof loyaltySchema>;

export default function LoyaltyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [initialLoading, setInitialLoading] = useState(true);

  const form = useForm<LoyaltyFormValues>({
    resolver: zodResolver(loyaltySchema),
    defaultValues: {
      enabled: false,
      rewards: [],
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'rewards',
  });

  const { formState: { isSubmitting, isDirty }, reset } = form;

  useEffect(() => {
    if (user) {
      setInitialLoading(true);
      Promise.all([
        getBarbershopSettings(user.uid),
        getServices(user.uid)
      ]).then(([settings, services]) => {
        const loyaltyConfig = settings?.loyaltyProgram;
        const rewardsMap = new Map(loyaltyConfig?.rewards?.map(r => [r.serviceId, r]));
        
        const allServicesAsRewards = services.map(service => {
          const existingConfig = rewardsMap.get(service.id);
          return {
              serviceId: service.id,
              serviceName: service.name,
              pointsGenerated: existingConfig?.pointsGenerated ?? loyaltyConfig?.pointsPerService ?? 1,
              pointsCost: existingConfig?.pointsCost || 0,
          };
        });
        
        const initialFormData = {
          enabled: loyaltyConfig?.enabled || false,
          rewards: allServicesAsRewards,
        };
        
        reset(initialFormData);
        setInitialLoading(false);
      }).catch(error => {
        console.error("Failed to load loyalty settings or services", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar as configurações.' });
        setInitialLoading(false);
      });
    }
  }, [user, reset, toast]);

  const onSubmit = async (data: LoyaltyFormValues) => {
    if (!user) return;
    
    // The rewards array now holds the full config for each service
    const settingsToSave = {
      enabled: data.enabled,
      rewards: data.rewards.map(r => ({
          serviceId: r.serviceId,
          serviceName: r.serviceName,
          pointsCost: r.pointsCost,
          pointsGenerated: r.pointsGenerated,
      })),
    };

    try {
      await updateLoyaltySettings(user.uid, settingsToSave);
      toast({
        title: 'Sucesso!',
        description: 'Seu programa de fidelidade foi atualizado.',
      });
      // Reset form state to make isDirty false again
      reset(data);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
      });
    }
  };

  if (initialLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Gift className="h-8 w-8" />
            Programa de Fidelidade
        </h1>
        <p className="text-muted-foreground">
          Configure quantos pontos cada serviço gera e o custo para resgatar recompensas.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>
                Ative o programa e defina as regras de pontos para cada serviço.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Ativar Programa de Fidelidade</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        {field.value ? 'Seu programa está ativo.' : 'Seu programa está desativado.'}
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className={cn(!form.watch('enabled') && "opacity-50")}>
                <h3 className="text-lg font-semibold mb-4">Regras de Pontuação e Recompensa</h3>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serviço</TableHead>
                        <TableHead className="w-[180px] text-right">Pontos Gerados</TableHead>
                        <TableHead className="w-[180px] text-right">Custo em Pontos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                         <TableRow key={field.id}>
                            <TableCell className="font-medium">{field.serviceName}</TableCell>
                            <TableCell className="text-right">
                               <FormField
                                  control={form.control}
                                  name={`rewards.${index}.pointsGenerated`}
                                  render={({ field: inputField }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          type="number" 
                                          className="w-24 text-right ml-auto" 
                                          placeholder='1'
                                          disabled={!form.watch('enabled')}
                                          {...inputField}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                            </TableCell>
                            <TableCell className="text-right">
                               <FormField
                                  control={form.control}
                                  name={`rewards.${index}.pointsCost`}
                                  render={({ field: inputField }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          type="number" 
                                          className="w-24 text-right ml-auto" 
                                          placeholder='0'
                                          disabled={!form.watch('enabled')}
                                          {...inputField}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                            </TableCell>
                         </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                 <p className="text-xs text-muted-foreground mt-2">
                    Defina quantos pontos um serviço gera ao ser concluído. Para o custo, deixe em 0 para não incluir como recompensa.
                </p>
              </div>

            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
