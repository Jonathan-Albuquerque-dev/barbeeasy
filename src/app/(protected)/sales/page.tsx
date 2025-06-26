import { SalesTerminal } from '@/components/sales/sales-terminal';

export default function SalesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Terminal de Vendas</h1>
        <p className="text-muted-foreground">Realize vendas de produtos avulsas para seus clientes.</p>
      </div>
      <SalesTerminal />
    </div>
  );
}
