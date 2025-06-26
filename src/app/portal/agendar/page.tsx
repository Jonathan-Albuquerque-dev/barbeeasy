import { BookingForm } from "@/components/portal/booking-form";

export default function AgendarPage() {
  return (
    <div className="container mx-auto py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight text-center">Faça seu Agendamento</h1>
        <p className="mt-2 text-lg text-muted-foreground text-center">
            Escolha o serviço, seu barbeiro preferido e o melhor horário para você.
        </p>
        <BookingForm />
      </div>
    </div>
  );
}
