
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookingForm } from "@/components/portal/booking-form";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function AgendarPageContent() {
  const searchParams = useSearchParams();
  const barbershopId = searchParams.get('barbershopId');

  if (!barbershopId) {
    return (
        <div className="container mx-auto py-12">
            <Card className="mx-auto max-w-4xl text-center">
                <CardHeader>
                    <CardTitle className="text-2xl text-destructive">Erro: Barbearia não encontrada</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">O link que você acessou é inválido. Por favor, use o link fornecido pela barbearia.</p>
                </CardContent>
            </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight text-center">Faça seu Agendamento</h1>
        <p className="mt-2 text-lg text-muted-foreground text-center">
            Escolha o serviço, seu barbeiro preferido e o melhor horário para você.
        </p>
        <BookingForm barbershopId={barbershopId} />
      </div>
    </div>
  );
}


export default function AgendarPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Carregando...</div>}>
      <AgendarPageContent />
    </Suspense>
  );
}
