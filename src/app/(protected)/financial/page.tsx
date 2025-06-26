
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getFinancialOverview, FinancialOverview, getCommissionsForPeriod, getStaff } from '@/lib/data';
import { Loader2, DollarSign, Users, HandCoins, Calculator, X, CreditCard, FileDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DateRange } from 'react-day-picker';
import { Label } from '@/components/ui/label';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';


type StaffMember = { id: string; name: string };

export default function FinancialPage() {
  const { user } = useAuth();
  const [data, setData] = useState<FinancialOverview | null>(null);
  const [loading, setLoading] = useState(true);

  // State for commission calculation
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [commissionDateRange, setCommissionDateRange] = useState<DateRange | undefined>();
  const [commissionResult, setCommissionResult] = useState<{
    totalCommission: number;
    totalServiceCommission: number;
    totalProductCommission: number;
    barberName: string;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // State for page-wide financial filter
  const [financialDateRange, setFinancialDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
    // Fetch staff list only once, as it's not dependent on the date filter
    async function fetchStaffList() {
      if (user?.uid) {
        const staffList = await getStaff(user.uid);
        setStaff(staffList.map(s => ({ id: s.id, name: s.name })));
      }
    }
    fetchStaffList();
  }, [user]);

  useEffect(() => {
    // Fetch financial data whenever the user or the date range changes
    async function fetchFinancialData() {
      if (user?.uid) {
        setLoading(true);
        const validRange = financialDateRange?.from && financialDateRange.to ? financialDateRange : undefined;
        const overview = await getFinancialOverview(user.uid, validRange);
        setData(overview);
        setLoading(false);
      }
    }

    // Only refetch if a complete range is selected, or if the filter is cleared (undefined)
    if ((financialDateRange?.from && financialDateRange.to) || financialDateRange === undefined) {
      fetchFinancialData();
    }
  }, [user, financialDateRange]);


  const handleCalculateCommission = async () => {
    if (!user?.uid || !selectedBarberId || !commissionDateRange?.from || !commissionDateRange?.to) {
      return;
    }
    setIsCalculating(true);
    setCommissionResult(null);
    try {
      const result = await getCommissionsForPeriod(user.uid, selectedBarberId, commissionDateRange.from, commissionDateRange.to);
      const selectedBarber = staff.find(s => s.id === selectedBarberId);
      setCommissionResult({
          totalCommission: result.totalCommission,
          totalServiceCommission: result.totalServiceCommission,
          totalProductCommission: result.totalProductCommission,
          barberName: selectedBarber?.name || 'Barbeiro'
      });
    } catch (error) {
      console.error("Error calculating commission:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleGenerateReport = () => {
    if (!data || !financialDateRange?.from || !financialDateRange?.to) return;

    setIsGeneratingReport(true);

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Relatório Financeiro', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    const dateText = `Período: ${format(financialDateRange.from, 'dd/MM/yyyy')} a ${format(financialDateRange.to, 'dd/MM/yyyy')}`;
    doc.text(dateText, 14, 29);

    // Summary
    let startY = 40;
    doc.setFontSize(12);
    doc.text('Resumo do Período', 14, startY);
    startY += 7;
    doc.setFontSize(10);
    doc.text(`Receita Total: R$ ${data.totalRevenue.toFixed(2)}`, 14, startY);
    startY += 5;
    doc.text(`Ticket Médio (Serviços): R$ ${data.averageTicket.toFixed(2)}`, 14, startY);
    startY += 5;
    doc.text(`Total de Agendamentos Concluídos: ${data.totalAppointments}`, 14, startY);
    startY += 5;
    doc.text(`Total de Comissões: R$ ${data.totalCommissions.toFixed(2)}`, 14, startY);

    // Products table
    const productsSold = data.transactions
      .flatMap(tx => tx.soldProducts || [])
      .reduce((acc, product) => {
        const existing = acc[product.productId];
        if (existing) {
          existing.quantity += product.quantity;
        } else {
          acc[product.productId] = { ...product };
        }
        return acc;
      }, {} as Record<string, { name: string; quantity: number; price: number; productId: string }>);

    const productTableData = Object.values(productsSold).map(p => [
      p.name,
      p.quantity.toString(),
      `R$ ${p.price.toFixed(2)}`,
      `R$ ${(p.price * p.quantity).toFixed(2)}`,
    ]);

    let lastY = startY;

    if (productTableData.length > 0) {
      autoTable(doc, {
        startY: lastY + 10,
        head: [['Produtos Vendidos', 'Quantidade', 'Preço Unitário', 'Subtotal']],
        body: productTableData,
        headStyles: { fillColor: [0, 100, 35] },
      });
      lastY = (doc as any).lastAutoTable.finalY || lastY;
    }
    
    // Services table
    const servicesTableData = data.revenueByService.map(service => {
        const { service: serviceName, revenue } = service;
        const quantity = data.transactions.filter(tx => tx.service === serviceName && !tx.paymentMethod?.startsWith('Cortesia')).length;
        const unitPrice = quantity > 0 ? revenue / quantity : 0;
        
        return [
            serviceName,
            quantity.toString(),
            `R$ ${unitPrice.toFixed(2)}`,
            `R$ ${revenue.toFixed(2)}`,
        ];
    }).filter(row => parseInt(row[1]) > 0);

    if (servicesTableData.length > 0) {
      autoTable(doc, {
        startY: lastY + 10,
        head: [['Serviços / Assinaturas', 'Quantidade', 'Preço Unitário', 'Subtotal']],
        body: servicesTableData,
        headStyles: { fillColor: [0, 100, 35] },
      });
    }
    
    doc.save('relatorio-financeiro.pdf');
    setIsGeneratingReport(false);
  }

  if (loading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const filterIsActive = financialDateRange?.from && financialDateRange?.to;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Visão Financeira</h1>
            <p className="text-muted-foreground">Analise a receita e o desempenho da sua barbearia.</p>
        </div>
        <div className="flex items-center gap-2">
            <DateRangePicker date={financialDateRange} onDateChange={setFinancialDateRange} />
            {filterIsActive && (
                <Button variant="ghost" size="icon" onClick={() => setFinancialDateRange(undefined)} aria-label="Limpar filtro">
                    <X className="h-4 w-4" />
                </Button>
            )}
             <Button onClick={handleGenerateReport} disabled={!filterIsActive || isGeneratingReport}>
                {isGeneratingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                Gerar Relatório
            </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R${data.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">de {data.totalAppointments} serviços e assinaturas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio (Serviços)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R${data.averageTicket.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">por serviço</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões a Pagar</CardTitle>
            <HandCoins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R${data.totalCommissions.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">total para a equipe</p>
          </CardContent>
        </Card>
      </div>
      
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Calcular Comissão por Período
          </CardTitle>
          <CardDescription>Selecione um barbeiro e um período para ver a comissão a pagar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
             <div className="space-y-2">
                <Label className="text-sm font-medium">Barbeiro</Label>
                <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione um barbeiro" />
                    </SelectTrigger>
                    <SelectContent>
                        {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label className="text-sm font-medium">Período</Label>
                <DateRangePicker date={commissionDateRange} onDateChange={setCommissionDateRange} className="w-full" />
            </div>
            <Button onClick={handleCalculateCommission} disabled={isCalculating || !selectedBarberId || !commissionDateRange?.from || !commissionDateRange?.to}>
              {isCalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Calcular'}
            </Button>
          </div>
          {commissionResult && (
            <div className="mt-6 p-4 bg-accent/50 rounded-lg space-y-2">
              <p className="text-lg font-semibold">
                Comissão a pagar para {commissionResult.barberName}: 
                <span className="text-primary ml-2">R${commissionResult.totalCommission.toFixed(2)}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Serviços: R${commissionResult.totalServiceCommission.toFixed(2)} | Produtos: R${commissionResult.totalProductCommission.toFixed(2)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Receita por Serviço</CardTitle>
        </CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={300}>
            <RechartsBarChart data={data.revenueByService} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="service" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} interval={0} />
                <YAxis tickFormatter={(value) => `R$${value}`} />
                <Tooltip formatter={(value: number) => [`R$${value.toFixed(2)}`, 'Receita']} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
            </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Desempenho da Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barbeiro</TableHead>
                  <TableHead className="text-right">Receita Gerada</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.revenueByBarber.map(barber => (
                  <TableRow key={barber.barberName}>
                    <TableCell className="font-medium">{barber.barberName}</TableCell>
                    <TableCell className="text-right">R${barber.revenue.toFixed(2)}</TableCell>
                    <TableCell className="text-right">R${barber.commission.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Receita por Forma de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Forma de Pagamento</TableHead>
                  <TableHead>Transações</TableHead>
                  <TableHead className="text-right">Receita Gerada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.revenueByPaymentMethod.map(item => (
                  <TableRow key={item.method}>
                    <TableCell className="font-medium">{item.method}</TableCell>
                    <TableCell>{item.count}</TableCell>
                    <TableCell className="text-right">R${item.revenue.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Barbeiro</TableHead>
                <TableHead>Forma de Pagto.</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.transactions.slice(0, 10).map(tx => (
                <TableRow key={tx.id}>
                  <TableCell>{new Date(`${tx.date}T00:00:00`).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
                  <TableCell className="font-medium">{tx.clientName}</TableCell>
                  <TableCell>{tx.service}</TableCell>
                  <TableCell>{tx.barberName}</TableCell>
                  <TableCell>{tx.paymentMethod || 'N/A'}</TableCell>
                  <TableCell className="text-right">R${tx.value.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
