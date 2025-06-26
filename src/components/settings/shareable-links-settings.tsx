'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Link as LinkIcon, Copy, Check } from 'lucide-react';

export function ShareableLinksSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [baseUrl, setBaseUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    // This ensures we get the origin URL only on the client side
    setBaseUrl(window.location.origin);
  }, []);
  
  if (!user) {
    return null; // or a loading state
  }

  const bookingLink = `${baseUrl}/portal/agendar?barbershopId=${user.uid}`;
  const signupLink = `${baseUrl}/portal/signup?barbershopId=${user.uid}`;

  const handleCopy = (link: string, type: string) => {
    navigator.clipboard.writeText(link).then(() => {
      toast({
        title: 'Copiado!',
        description: `O link de ${type} foi copiado para a área de transferência.`,
      });
      setCopiedLink(type);
      setTimeout(() => setCopiedLink(null), 2000); // Reset icon after 2 seconds
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível copiar o link.',
      });
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-6 w-6" />
            Links do Portal do Cliente
        </CardTitle>
        <CardDescription>
          Use estes links para compartilhar com seus clientes. Você pode fixá-los em seu perfil do WhatsApp ou redes sociais.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <Label htmlFor="booking-link">Link de Agendamento</Label>
            <div className="flex gap-2">
                <Input id="booking-link" value={bookingLink} readOnly />
                <Button type="button" variant="outline" size="icon" onClick={() => handleCopy(bookingLink, 'agendamento')}>
                    {copiedLink === 'agendamento' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    <span className="sr-only">Copiar link de agendamento</span>
                </Button>
            </div>
             <p className="text-xs text-muted-foreground">Clientes existentes podem usar este link para agendar um horário.</p>
        </div>
        <div className="space-y-2">
            <Label htmlFor="signup-link">Link de Cadastro</Label>
            <div className="flex gap-2">
                <Input id="signup-link" value={signupLink} readOnly />
                <Button type="button" variant="outline" size="icon" onClick={() => handleCopy(signupLink, 'cadastro')}>
                     {copiedLink === 'cadastro' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    <span className="sr-only">Copiar link de cadastro</span>
                </Button>
            </div>
             <p className="text-xs text-muted-foreground">Novos clientes devem usar este link para criar uma conta na sua barbearia.</p>
        </div>
      </CardContent>
    </Card>
  );
}
