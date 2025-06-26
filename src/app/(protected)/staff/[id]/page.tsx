
'use client';

import { getStaffById, getStaffPerformanceHistory } from '@/lib/data';
import { useParams, notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Star, Scissors, Loader2, FileDown, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';
import type { Staff } from '@/lib/data';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PerformanceHistory = Awaited<ReturnType<typeof getStaffPerformanceHistory>>;

export default function StaffDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [member, setMember] = useState<Staff | null>(null);
  const [history, setHistory] = useState<PerformanceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyDateRange, setHistoryDateRange] = useState<DateRange | undefined>();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    async function fetchStaffData() {
      if (user?.uid && params?.id) {
        setLoading(true);
        const staffId = Array.isArray(params.id) ? params.id[0] : params.id;
        
        const validRange = historyDateRange?.from && historyDateRange.to ? historyDateRange : undefined;

        const [fetchedMember, fetchedHistory] = await Promise.all([
            getStaffById(user.uid, staffId),
            getStaffPerformanceHistory(user.uid, staffId, validRange)
        ]);

        if (!fetchedMember) {
          notFound();
        }
        setMember(fetchedMember);
        setHistory(fetchedHistory);
        setLoading(false);
      }
    }
    
    if ((historyDateRange?.from && historyDateRange.to) || historyDateRange === undefined) {
      fetchStaffData();
    }
  }, [user, params, historyDateRange]);

  const renderValue = (value: string | number) => {
    if (typeof value === 'number') {
      return `R$${value.toFixed(2)}`;
    }
    return <Badge variant="secondary">{value}</Badge>;
  };

  const handleGenerateReport = () => {
    if (!member || !history || !historyDateRange?.from || !historyDateRange?.to) return;
    setIsGeneratingReport(true);

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`Relatório de Desempenho - ${member.name}`, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Período: ${format(historyDateRange.from, 'dd/MM/yyyy')} a ${format(historyDateRange.to, 'dd/MM/yyyy')}`, 14, 29);

    let lastY = 35;

    if (history.services.length > 0) {
        const servicesData = history.services.map(s => [
            new Date(`${s.date}T12:00:00Z`).toLocaleDateString('pt-BR'),
            s.clientName,
            s.service,
            typeof s.value === 'number' ? `R$${s.value.toFixed(2)}` : s.value,
        ]);
        autoTable(doc, {
            startY: lastY + 10,
            head: [['Data', 'Cliente', 'Serviço', 'Valor']],
            body: servicesData,
            headStyles: { fillColor: [0, 100, 35] },
        });
        lastY = (doc as any).lastAutoTable.finalY || lastY;
    }

    if (history.products.length > 0) {
        const productsData = history.products.map(p => [
            new Date(`${p.date}T12:00:00Z`).toLocaleDateString('pt-BR'),
            p.clientName,
            p.product,
            p.quantity.toString(),
            `R$${p.value.toFixed(2)}`,
        ]);
        autoTable(doc, {
            startY: lastY + 10,
            head: [['Data', 'Cliente', 'Produto', 'Qtd.', 'Valor']],
            body: productsData,
            headStyles: { fillColor: [0, 100, 35] },
        });
    }

    doc.save(`relatorio-desempenho-${member.name.replace(/\s+/g, '-')}.pdf`);
    setIsGeneratingReport(false);
  }

  const filterIsActive = historyDateRange?.from && historyDateRange?.to;

  if (loading || !member) {
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
          <h1 className="text-3xl font-bold tracking-tight">{member.name}</h1>
          <p className="text-muted-foreground">Perfil e Desempenho do Funcionário</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/staff">Voltar para a Equipe</Link>
        </Button>
      </div>
      
      <Card className="overflow-hidden">
        <div className="bg-primary/10 h-32" />
        <CardContent className="pt-6 flex flex-col items-center text-center -mt-20">
          <Avatar className="h-32 w-32 mb-4 border-4 border-background shadow-lg">
            <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="person portrait" />
            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <h2 className="text-3xl font-semibold">{member.name}</h2>
          <CardDescription className="max-w-prose mx-auto mt-4 mb-6">
            {member.bio}
          </CardDescription>

          <div className="w-full max-w-md mx-auto">
             <Card className="bg-background/80">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2">
                        <Scissors className="h-5 w-5" />
                        Detalhes Profissionais
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="text-center font-semibold text-base mb-2">Especializações</h3>
                        <div className="flex flex-wrap justify-center gap-2">
                            {member.specializations.map(spec => (
                            <Badge key={spec} variant="secondary" className="text-sm py-1 px-3">
                                <Star className="mr-2 h-4 w-4 text-accent"/>
                                {spec}
                            </Badge>
                            ))}
                        </div>
                    </div>
                    <Separator />
                    <div>
                        <h3 className="text-center font-semibold text-base">Comissões</h3>
                        <div className="text-center text-muted-foreground">
                            <p>Serviços: {(member.serviceCommissionRate * 100).toFixed(0)}%</p>
                            <p>Produtos: {(member.productCommissionRate * 100).toFixed(0)}%</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <CardTitle>Histórico de Desempenho</CardTitle>
                    <CardDescription>
                        Veja todos os serviços e produtos vendidos por {member.name}.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangePicker date={historyDateRange} onDateChange={setHistoryDateRange} />
                    {filterIsActive && (
                        <Button variant="ghost" size="icon" onClick={() => setHistoryDateRange(undefined)} aria-label="Limpar filtro">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                    <Button onClick={handleGenerateReport} disabled={!filterIsActive || isGeneratingReport}>
                        {isGeneratingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        Gerar Relatório
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="services" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="services">Serviços Realizados</TabsTrigger>
                    <TabsTrigger value="products">Produtos Vendidos</TabsTrigger>
                </TabsList>
                <TabsContent value="services" className="mt-4">
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Serviço</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history?.services && history.services.length > 0 ? (
                                    history.services.map((item, index) => (
                                        <TableRow key={`service-${index}`}>
                                            <TableCell>{new Date(`${item.date}T12:00:00Z`).toLocaleDateString('pt-BR')}</TableCell>
                                            <TableCell>{item.clientName}</TableCell>
                                            <TableCell className="font-medium">{item.service}</TableCell>
                                            <TableCell className="text-right">{renderValue(item.value)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">Nenhum serviço registrado neste período.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
                <TabsContent value="products" className="mt-4">
                     <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Produto</TableHead>
                                    <TableHead className="text-center">Qtd.</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history?.products && history.products.length > 0 ? (
                                    history.products.map((item, index) => (
                                        <TableRow key={`product-${index}`}>
                                            <TableCell>{new Date(`${item.date}T12:00:00Z`).toLocaleDateString('pt-BR')}</TableCell>
                                            <TableCell>{item.clientName}</TableCell>
                                            <TableCell className="font-medium">{item.product}</TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-right">R${item.value.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">Nenhum produto vendido neste período.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
