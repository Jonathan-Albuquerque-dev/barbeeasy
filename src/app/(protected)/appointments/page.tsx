import { AppointmentSchedule } from "@/components/appointments/appointment-schedule";

export default function AppointmentsPage() {
  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight">Agenda do Dia</h1>
        <p className="text-muted-foreground">Visualize e gerencie os horários por profissional.</p>
      </div>
      <AppointmentSchedule />
    </div>
  );
}
