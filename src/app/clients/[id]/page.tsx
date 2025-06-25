import { getClientById } from '@/lib/data';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, MapPin, Award } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ClientRecommendations from '@/components/clients/client-recommendations';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await getClientById(params.id);

  if (!client) {
    notFound();
  }

  const serviceHistorySummary = client.serviceHistory.map(h => `${h.service} on ${h.date}`).join('; ');

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-muted-foreground">Client Profile & History</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/clients">Back to All Clients</Link>
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
              <div className="mt-4">
                <Badge variant={client.loyaltyStatus === 'Gold' ? 'default' : 'secondary'} className={client.loyaltyStatus === 'Gold' ? 'bg-accent text-accent-foreground' : ''}>
                  <Award className="mr-2 h-4 w-4" />
                  {client.loyaltyStatus} Member
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{client.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{client.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{client.address}</span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right column: Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="history">Service History</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="recommendations">AI Suggestions</TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Past Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Barber</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {client.serviceHistory.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.date}</TableCell>
                          <TableCell className="font-medium">{item.service}</TableCell>
                          <TableCell>{item.barber}</TableCell>
                          <TableCell className="text-right">${item.cost.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="preferences" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Client Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-base">Preferred Services</h3>
                    <p className="text-muted-foreground">{client.preferences.preferredServices.join(', ')}</p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-base">Preferred Barber</h3>
                    <p className="text-muted-foreground">{client.preferences.preferredBarber}</p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-base">Notes</h3>
                    <p className="text-muted-foreground">{client.preferences.notes}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="recommendations" className="mt-4">
              <ClientRecommendations clientId={client.id} serviceHistory={serviceHistorySummary} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
