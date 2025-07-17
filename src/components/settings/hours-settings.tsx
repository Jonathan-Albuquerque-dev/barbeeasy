
'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getBarbershopSettings, updateOperatingHours, DayHours } from '@/lib/data';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { Separator } from '../ui/separator';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { cn } from '@/lib/utils';

const daySchema = z.object({
  open: z.boolean(),
  start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
});

const operatingHoursSchema = z.object({
  hours: z.array(daySchema),
  appointmentInterval: z.union([z.literal('30'), z.literal('60')]).transform(Number),
});

type OperatingHoursFormValues = z.infer<typeof operatingHoursSchema>;

const dayLabels = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const dayKeys: (keyof DayHours)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];


export function HoursSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<OperatingHoursFormValues>({
    resolver: zodResolver(operatingHoursSchema),
    defaultValues: {
      hours: dayKeys.map(() => ({ 
        open: false, 
        start: '09:00', 
        end: '18:00',
      })),
      appointmentInterval: 30,
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "hours",
  });
  
  const { formState: { isSubmitting, isDirty }, reset } = form;

  useEffect(() => {
    if (user) {
      getBarbershopSettings(user.uid).then(settings => {
        if (settings?.operatingHours) {
          const hoursArray = dayKeys.map(key => settings.operatingHours[key] || { 
            open: false, 
            start: '09:00', 
            end: '18:00',
          });
          reset({ 
            hours: hoursArray,
            appointmentInterval: settings.appointmentInterval || 30,
          });
        }
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: OperatingHoursFormValues) => {
    if (!user) return;

    const hoursObject = data.hours.reduce((acc, day, index) => {
        acc[dayKeys[index]] = day;
        return acc;
    }, {} as DayHours);
    
    try {
      await updateOperatingHours(user.uid, { 
        hours: hoursObject,
        appointmentInterval: data.appointmentInterval,
      });
      toast({
        title: 'Sucesso!',
        description: 'Seus horários de funcionamento foram atualizados.',
      });
      reset(data); // Resets the form's dirty state
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar os horários.',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horários e Agendamentos</CardTitle>
        <CardDescription>
          Defina os horários de funcionamento e o intervalo entre os agendamentos.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8">
            <div className="space-y-4 rounded-lg border p-4">
                 <h3 className="font-semibold">Intervalo de Agendamento</h3>
                 <p className="text-sm text-muted-foreground">
                    Defina o intervalo de tempo entre os horários disponíveis para agendamento.
                 </p>
                <FormField
                    control={form.control}
                    name="appointmentInterval"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormControl>
                            <RadioGroup
                            onValueChange={(value) => field.onChange(Number(value))}
                            value={String(field.value)}
                            className="flex pt-2 gap-6"
                            >
                            <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                <RadioGroupItem value="30" id="r1" />
                                </FormControl>
                                <FormLabel htmlFor="r1" className="font-normal !mt-0">30 minutos</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                <RadioGroupItem value="60" id="r2" />
                                </FormControl>
                                <FormLabel htmlFor="r2" className="font-normal !mt-0">1 hora</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <div className='space-y-4'>
                <h3 className="font-semibold">Horários de Funcionamento</h3>
                {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="w-full sm:w-1/3">
                            <h4 className="font-medium">{dayLabels[index]}</h4>
                        </div>
                        <div className="flex items-center gap-4">
                            <FormField
                            control={form.control}
                            name={`hours.${index}.open`}
                            render={({ field }) => (
                                <FormItem className="flex items-center gap-2">
                                    <FormControl>
                                        <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormLabel className="!m-0">{field.value ? 'Aberto' : 'Fechado'}</FormLabel>
                                </FormItem>
                            )}
                            />
                        </div>
                        <div className={cn("flex items-center gap-4 flex-grow", !form.watch(`hours.${index}.open`) && 'opacity-50')}>
                            <FormField
                            control={form.control}
                            name={`hours.${index}.start`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                <FormLabel className="sr-only">Início</FormLabel>
                                <FormControl>
                                    <Input type="time" {...field} disabled={!form.watch(`hours.${index}.open`)} />
                                </FormControl>
                                </FormItem>
                            )}
                            />
                            <span>até</span>
                            <FormField
                            control={form.control}
                            name={`hours.${index}.end`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                <FormLabel className="sr-only">Fim</FormLabel>
                                <FormControl>
                                    <Input type="time" {...field} disabled={!form.watch(`hours.${index}.open`)} />
                                </FormControl>
                                </FormItem>
                            )}
                            />
                        </div>
                    </div>
                </div>
                ))}
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
