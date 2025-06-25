'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { getAppointmentsForDate, getTodaysAppointments } from '@/lib/data';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '../ui/badge';

type Appointment = Awaited<ReturnType<typeof getTodaysAppointments>>[0];

export function AppointmentCalendar() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      const fetchedAppointments = date ? await getAppointmentsForDate(date) : [];
      // This is a type assertion to match the expected structure
      setAppointments(fetchedAppointments as unknown as Appointment[]);
      setLoading(false);
    };

    fetchAppointments();
  }, [date]);

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <Card>
          <CardContent className="p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="w-full"
              classNames={{
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent/50 text-accent-foreground"
              }}
            />
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{date ? date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Select a date'}</CardTitle>
                <CardDescription>
                  {loading ? 'Loading appointments...' : `${appointments.length} appointments scheduled.`}
                </CardDescription>
              </div>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Schedule
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-4 animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-muted"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-[250px] rounded bg-muted"></div>
                    <div className="h-4 w-[200px] rounded bg-muted"></div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-muted"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-[250px] rounded bg-muted"></div>
                    <div className="h-4 w-[200px] rounded bg-muted"></div>
                  </div>
                </div>
              </div>
            ) : appointments.length > 0 ? (
              <ul className="space-y-4">
                {appointments.map(app => (
                  <li key={app.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-background">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={app.client.avatarUrl} data-ai-hint="person face" />
                      <AvatarFallback>{app.client.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow">
                      <p className="font-semibold">{app.service}</p>
                      <p className="text-sm text-muted-foreground">
                        {app.client.name} with {app.barber.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{app.time}</p>
                      <Badge variant="secondary">{app.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground pt-8">No appointments for this day.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
