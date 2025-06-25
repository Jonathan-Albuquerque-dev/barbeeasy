import { AppointmentCalendar } from "@/components/appointments/appointment-calendar";

export default function AppointmentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>
        <p className="text-muted-foreground">Gerencie sua agenda, marque novos horários e veja os próximos eventos.</p>
      </div>
      <AppointmentCalendar />
    </div>
  );
}
