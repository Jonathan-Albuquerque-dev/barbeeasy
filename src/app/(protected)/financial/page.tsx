'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getFinancialOverview, FinancialOverview, getCommissionsForPeriod, getStaff } from '@/lib/data';
import { Loader2, DollarSign, Users, HandCoins, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DateRange } from 'react-day-picker';

type StaffMember = { id: string; name: string };

export default function FinancialPage() {
  const { user } = useAuth();
  const [data, setData] = useState<FinancialOverview | null>(null);
  const [loading, setLoading] = useState(true);

  // State for commission calculation
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [commissionResult, setCommissionResult] = useState<{ amount: number; barberName: string } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (user?.uid) {
        setLoading(true);
        const [overview, staffList] = await Promise.all([
            getFinancialOverview(user.uid),
            getStaff(user.uid)
        ]);
        setData(overview);
        setStaff(staffList.map(s => ({ id: s.id, name: s.name })));
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const handleCalculateCommission = async () => {
    if (!user?.uid || !selectedBarberId || !dateRange?.from || !dateRange?.to) {
      // Basic validation feedback can be added here
      return;
    }
    setIsCalculating(true);
    setCommissionResult(null);
    try {
      const result = await getCommissionsForPeriod(user.uid, selectedBarberId, dateRange.from, dateRange.to);
      const selectedBarber = staff.find(s => s.id === selectedBarberId);
      setCommissionResult({
          amount: result.totalCommission,
          barberName: selectedBarber?.name || 'Barbeiro'
      });
    } catch (error) {
      console.error("Error calculating commission:", error);
      // Add user-facing error feedback here
    } finally {
      setIsCalculating(false);
    }
  };


  if (loading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visão Financeira</h1>
        <p className="text-muted-foreground">Analise a receita e o desempenho da sua barbearia.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R${data.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">de {data.totalAppointments} serviços concluídos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
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
                <label className="text-sm font-medium">Barbeiro</label>
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
                <label className="text-sm font-medium">Período</label>
                <DateRangePicker date={dateRange} onDateChange={setDateRange} className="w-full" />
            </div>
            <Button onClick={handleCalculateCommission} disabled={isCalculating || !selectedBarberId || !dateRange?.from}>
              {isCalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Calcular'}
            </Button>
          </div>
          {commissionResult && (
            <div className="mt-6 p-4 bg-accent/50 rounded-lg">
              <p className="text-lg font-semibold">
                Comissão a pagar para {commissionResult.barberName}: 
                <span className="text-primary ml-2">R${commissionResult.amount.toFixed(2)}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
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
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentTransactions.map(tx => (
                <TableRow key={tx.id}>
                  <TableCell>{new Date(`${tx.date}T00:00:00`).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
                  <TableCell className="font-medium">{tx.clientName}</TableCell>
                  <TableCell>{tx.service}</TableCell>
                  <TableCell>{tx.barberName}</TableCell>
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
