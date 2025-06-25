'use client';

import { getClientById, getServiceHistoryForClient } from '@/lib/data';
import { useParams, notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, MapPin, Award, Loader2, Gift } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState, useMemo } from 'react';

type Client = Awaited<ReturnType<typeof getClientById>>;
type ServiceHistoryItem = { date: string; service: string; barber: string; cost: number };

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [client, setClient] = useState<Client>(null);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClientData() {
      if (user?.uid && params?.id) {
        setLoading(true);
        const clientId = Array.isArray(params.id) ? params.id[0] : params.id;
        
        const [fetchedClient, fetchedHistory] = await Promise.all([
          getClientById(user.uid, clientId),
          getServiceHistoryForClient(user.uid, clientId)
        ]);

        if (!fetchedClient) {
          notFound();
        }
        setClient(fetchedClient);
        setServiceHistory(fetchedHistory);
        setLoading(false);
      }
    }
    fetchClientData();
  }, [user, params]);

  const dynamicPreferences = useMemo(() => {
    if (!serviceHistory || serviceHistory.length === 0) {
      return {
        preferredServices: ['Nenhum serviço registrado'],
        preferredBarber: 'Nenhum',
      };
    }

    const serviceCounts = serviceHistory.reduce((acc, item) => {
      acc[item.service] = (acc[item.service] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const maxServiceCount = Math.max(...Object.values(serviceCounts), 0);
    const preferredServices = maxServiceCount > 0 
      ? Object.entries(serviceCounts)
          .filter(([, count]) => count === maxServiceCount)
          .map(([service]) => service)
      : ['Nenhum serviço preferido'];

    const barberCounts = serviceHistory.reduce((acc, item) => {
      if (item.barber && item.barber !== 'N/A') {
        acc[item.barber] = (acc[item.barber] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const maxBarberCount = Math.max(...Object.values(barberCounts), 0);
    const preferredBarber = maxBarberCount > 0
      ? Object.entries(barberCounts)
          .find(([, count]) => count === maxBarberCount)
          ?.[0] || 'Nenhum'
      : 'Nenhum';
    
    return {
      preferredServices,
      preferredBarber,
    };
  }, [serviceHistory]);

  if (loading || !client) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-muted-foreground">Perfil e Histórico do Cliente</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/clients">Voltar para Todos os Clientes</Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left column: Client info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4 border-2 border-primary/50">
                <AvatarImage src={client.avatarUrl} alt={client.name} data-ai-hint="person face" />
                <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-semibold">{client.name}</h2>
              <p className="text-muted-foreground">{client.email}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Badge variant={client.loyaltyStatus === 'Ouro' ? 'default' : 'secondary'} className={client.loyaltyStatus === 'Ouro' ? 'bg-accent text-accent-foreground' : ''}>
                  <Award className="mr-2 h-4 w-4" />
                  Membro {client.loyaltyStatus}
                </Badge>
                 <Badge variant="outline">
                  <Gift className="mr-2 h-4 w-4" />
                  {serviceHistory.length || 0} Pontos
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Informações de Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{client.email || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{client.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{client.address || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right column: Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="history">Histórico de Serviços</TabsTrigger>
              <TabsTrigger value="preferences">Preferências</TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Serviços Anteriores</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Serviço</TableHead>
                        <TableHead>Barbeiro</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceHistory && serviceHistory.length > 0 ? (
                        serviceHistory.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.date}</TableCell>
                            <TableCell className="font-medium">{item.service}</TableCell>
                            <TableCell>{item.barber}</TableCell>
                            <TableCell className="text-right">R${item.cost.toFixed(2)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Nenhum serviço registrado no histórico.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="preferences" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Preferências do Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-base">Serviços Preferidos</h3>
                    <p className="text-muted-foreground">{dynamicPreferences.preferredServices.join(', ')}</p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-base">Barbeiro Preferido</h3>
                    <p className="text-muted-foreground">{dynamicPreferences.preferredBarber}</p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-base">Observações</h3>
                    <p className="text-muted-foreground">{client.preferences.notes}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
