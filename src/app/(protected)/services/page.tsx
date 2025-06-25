'use client';

import { getServices } from "@/lib/data";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, DollarSign, Tag, Loader2, PlusCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useCallback } from "react";
import { AddServiceDialog } from "@/components/services/add-service-dialog";

type Service = Awaited<ReturnType<typeof getServices>>[0];

export default function ServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    if (user?.uid) {
      // Don't set loading to true here to avoid full-page loader on re-fetch
      const fetchedServices = await getServices(user.uid);
      setServices(fetchedServices);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.uid) {
        setLoading(true);
        fetchServices();
    }
  }, [user, fetchServices]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Serviços</h1>
          <p className="text-muted-foreground">Navegue por todos os serviços e tratamentos disponíveis.</p>
        </div>
        <AddServiceDialog onServiceAdded={fetchServices}>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Serviço
            </Button>
        </AddServiceDialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(service => (
          <Card key={service.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl">{service.name}</CardTitle>
              <CardDescription>{service.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
              <div className="flex items-center text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4 mr-2"/>
                <span className="font-semibold text-lg text-foreground/90">R${service.price.toFixed(2)}</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-2"/>
                <span>{service.duration} minutos</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                <Tag className="mr-2 h-4 w-4" />
                Agendar Agora
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
