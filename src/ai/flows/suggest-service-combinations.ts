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
  clientId: z.string().describe('The ID of the client.'),
  serviceHistory: z
    .string()
    .describe(
      'A summary of the client service history, including past services and preferences.'
    ),
});
export type SuggestServiceCombinationsInput = z.infer<
  typeof SuggestServiceCombinationsInputSchema
>;

const SuggestServiceCombinationsOutputSchema = z.object({
  suggestedCombinations: z
    .array(z.string())
    .describe('An array of suggested service combinations.'),
  reasoning: z.string().describe('The reasoning behind the suggestions.'),
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
  prompt: `You are a service recommendation expert for barber shops.

  Based on the client's service history and preferences, suggest service
  combinations that they might like. Provide the reasoning behind each suggestion.

  Client ID: {{{clientId}}}
  Service History: {{{serviceHistory}}}

  Format your response as a list of suggested combinations and a
  reasoning section.
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
