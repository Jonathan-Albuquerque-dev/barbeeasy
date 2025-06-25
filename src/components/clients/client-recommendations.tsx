'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { suggestServiceCombinations, SuggestServiceCombinationsOutput } from '@/ai/flows/suggest-service-combinations';
import { Loader2, Wand2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

interface ClientRecommendationsProps {
  clientId: string;
  serviceHistory: string;
}

export default function ClientRecommendations({ clientId, serviceHistory }: ClientRecommendationsProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuggestServiceCombinationsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGetSuggestions = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const suggestions = await suggestServiceCombinations({ clientId, serviceHistory });
      setResult(suggestions);
    } catch (e) {
      setError('Falha ao obter sugestões. Por favor, tente novamente.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-background">
      <CardHeader>
        <CardTitle>Recomendações Personalizadas</CardTitle>
        <CardDescription>
          Use IA para sugerir combinações de serviços com base no histórico e nas preferências do cliente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button onClick={handleGetSuggestions} disabled={loading} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          {loading ? 'Analisando...' : 'Obter Sugestões'}
        </Button>

        {error && <p className="text-destructive">{error}</p>}

        {result && (
          <div className="space-y-4 animate-in fade-in-50">
            <h3 className="text-lg font-semibold">Combinações Sugeridas</h3>
            <ul className="list-disc space-y-2 pl-5">
              {result.suggestedCombinations.map((combo, index) => (
                <li key={index} className="font-medium">{combo}</li>
              ))}
            </ul>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="font-semibold">Por que essas sugestões?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {result.reasoning}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
