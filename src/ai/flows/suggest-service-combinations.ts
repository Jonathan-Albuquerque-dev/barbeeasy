// src/ai/flows/suggest-service-combinations.ts
'use server';

/**
 * @fileOverview Suggests service combinations based on historical client data.
 *
 * - suggestServiceCombinations - A function that suggests service combinations.
 * - SuggestServiceCombinationsInput - The input type for the suggestServiceCombinations function.
 * - SuggestServiceCombinationsOutput - The return type for the suggestServiceCombinations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestServiceCombinationsInputSchema = z.object({
  clientId: z.string().describe('O ID do cliente.'),
  serviceHistory: z
    .string()
    .describe(
      'Um resumo do histórico de serviços do cliente, incluindo serviços anteriores e preferências.'
    ),
});
export type SuggestServiceCombinationsInput = z.infer<
  typeof SuggestServiceCombinationsInputSchema
>;

const SuggestServiceCombinationsOutputSchema = z.object({
  suggestedCombinations: z
    .array(z.string())
    .describe('Um array de combinações de serviços sugeridas.'),
  reasoning: z.string().describe('O raciocínio por trás das sugestões.'),
});

export type SuggestServiceCombinationsOutput = z.infer<
  typeof SuggestServiceCombinationsOutputSchema
>;

export async function suggestServiceCombinations(
  input: SuggestServiceCombinationsInput
): Promise<SuggestServiceCombinationsOutput> {
  return suggestServiceCombinationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestServiceCombinationsPrompt',
  input: {schema: SuggestServiceCombinationsInputSchema},
  output: {schema: SuggestServiceCombinationsOutputSchema},
  prompt: `Você é um especialista em recomendação de serviços para barbearias.

  Com base no histórico de serviços e preferências do cliente, sugira
  combinações de serviços que ele possa gostar. Forneça o raciocínio por trás de cada sugestão.

  ID do Cliente: {{{clientId}}}
  Histórico de Serviços: {{{serviceHistory}}}

  Formate sua resposta como uma lista de combinações sugeridas e uma
  seção de raciocínio.
  `,
});

const suggestServiceCombinationsFlow = ai.defineFlow(
  {
    name: 'suggestServiceCombinationsFlow',
    inputSchema: SuggestServiceCombinationsInputSchema,
    outputSchema: SuggestServiceCombinationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
