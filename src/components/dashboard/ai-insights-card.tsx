import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wand2, Users } from "lucide-react";

export function AIInsightsCard() {
  return (
    <Card className="bg-accent/20 border-accent/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Wand2 className="text-accent h-6 w-6" />
          Potencialize suas Vendas com IA
        </CardTitle>
        <CardDescription>
          Nosso assistente de IA analisa o histórico de cada cliente para sugerir serviços e combinações que eles vão adorar. Aumente a satisfação e o faturamento com recomendações personalizadas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Acesse o perfil de um cliente, vá para a aba "Sugestões da IA" e descubra novas oportunidades de venda em segundos.
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline">
          <Link href="/clients">
            <Users className="mr-2 h-4 w-4" />
            Ver todos os clientes
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
