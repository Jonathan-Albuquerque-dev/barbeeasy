'use client';

import * as React from 'react';
import { Moon, Sun, Laptop } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <Card>
        <CardHeader>
        <CardTitle>Aparência</CardTitle>
        <CardDescription>
            Personalize a aparência do aplicativo. Alterne entre o modo claro e escuro.
        </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    onClick={() => setTheme('light')}
                    className="justify-start"
                >
                    <Sun className="mr-2 h-4 w-4" />
                    Claro
                </Button>
                <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    onClick={() => setTheme('dark')}
                    className="justify-start"
                >
                    <Moon className="mr-2 h-4 w-4" />
                    Escuro
                </Button>
                <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    onClick={() => setTheme('system')}
                    className="justify-start"
                >
                    <Laptop className="mr-2 h-4 w-4" />
                    Sistema
                </Button>
            </div>
        </CardContent>
    </Card>
  );
}
