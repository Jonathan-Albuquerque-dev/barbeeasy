import { AppointmentCalendar } from "@/components/clients/appointment-calendar";

export default function AppointmentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
        <p className="text-muted-foreground">Manage your schedule, book new appointments, and view upcoming events.</p>
      </div>
      <AppointmentCalendar />
    </div>
  );
}
