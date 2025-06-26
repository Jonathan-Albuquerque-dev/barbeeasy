'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getAuth, signOut } from 'firebase/auth';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Scissors, LayoutDashboard, LogOut } from 'lucide-react';
import { app } from '@/lib/firebase';
import { cn } from '@/lib/utils';

export function PortalNavbar() {
    const { user, isBarberOwner } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const auth = getAuth(app);

    const handleSignOut = async () => {
        await signOut(auth);
        router.push('/portal/login');
    };
    
    const getInitials = (name: string | null | undefined) => {
        if (!name) return '..';
        const parts = name.split(' ');
        if (parts.length > 1 && parts[0] && parts[parts.length - 1]) {
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        }
        if (name.length > 1) {
            return name.substring(0, 2).toUpperCase();
        }
        return name.toUpperCase();
    }

    const navLinks = [
        { href: "/portal/agendar", label: "Agendar" },
        { href: "/portal/meus-agendamentos", label: "Meus Agendamentos" }
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
                <div className="mr-4 flex items-center">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        <Scissors className="h-6 w-6 text-primary" />
                        <span className="font-bold">BarberEasy</span>
                    </Link>
                    <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                        {navLinks.map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn("transition-colors hover:text-foreground/80", 
                                pathname === link.href ? "text-foreground" : "text-foreground/60"
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </div>
                <div className="flex flex-1 items-center justify-end space-x-4">
                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                                        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user.displayName}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {isBarberOwner && (
                                    <>
                                      <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                                          <LayoutDashboard className="mr-2 h-4 w-4" />
                                          <span>Painel do Gerente</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                )}
                                <DropdownMenuItem onClick={handleSignOut}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Sair</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button onClick={() => router.push('/portal/login')}>Fazer Login</Button>
                    )}
                </div>
            </div>
        </header>
    );
}
