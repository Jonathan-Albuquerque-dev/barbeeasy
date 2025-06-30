'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LayoutDashboard, LogOut, User as UserIcon, Calendar, Star, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSubscriptions } from '@/lib/data';
import { useClientSession } from '@/app/portal/layout';
import { useAuth } from '@/contexts/auth-context';

export function PortalNavbar() {
    const { session, logout } = useClientSession();
    const { isBarberOwner } = useAuth(); // For "Go to Dashboard" link
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const barbershopId = searchParams.get('barbershopId');
    
    const [hasSubscriptions, setHasSubscriptions] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (barbershopId) {
            getSubscriptions(barbershopId).then(subs => {
                if (subs && subs.length > 0) {
                    setHasSubscriptions(true);
                } else {
                    setHasSubscriptions(false);
                }
            }).catch(() => setHasSubscriptions(false));
        }
    }, [barbershopId]);
    
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
        { href: `/portal/agendar`, label: "Agendar", icon: Calendar },
        { href: `/portal/meus-agendamentos`, label: "Meus Agendamentos", icon: Calendar },
    ];
    
    if (hasSubscriptions) {
        navLinks.push({ href: '/portal/assinaturas', label: 'Assinaturas', icon: Star });
    }

    const rootLink = barbershopId ? `/?barbershopId=${barbershopId}` : '/';
    const loginLink = barbershopId ? `/portal/login?barbershopId=${barbershopId}` : '/portal/login';

    const createLink = (href: string) => {
        return barbershopId ? `${href}?barbershopId=${barbershopId}` : href;
    }

    const NavContent = () => (
        <>
            {navLinks.map(link => (
                <Link
                    key={link.href}
                    href={createLink(link.href)}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                        "transition-colors hover:text-foreground/80 flex items-center gap-2",
                        "md:text-foreground/60 md:hover:text-foreground/80", 
                        pathname === link.href ? "text-foreground" : "text-foreground/60"
                    )}
                >
                    <link.icon className="h-4 w-4 md:hidden" />
                    {link.label}
                </Link>
            ))}
        </>
    );

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center px-4">
                {/* Left Group: Contains Logo and Nav links */}
                <div className="flex items-center gap-6">
                    {/* Mobile Menu */}
                    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Abrir menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-64">
                             <SheetTitle className="sr-only">Menu Principal</SheetTitle>
                             <Link href={rootLink} className="mr-6 flex items-center space-x-2 mb-6" onClick={() => setMobileMenuOpen(false)}>
                                <div>
                                    <span className="font-bold font-body text-lg leading-none"><span className="text-foreground">Barbe</span><span className="text-primary">Easy</span></span>
                                    <p className="text-xs text-muted-foreground">Gestão de Barbearia</p>
                                </div>
                            </Link>
                            <nav className="flex flex-col space-y-4 text-lg font-medium">
                                <NavContent />
                            </nav>
                        </SheetContent>
                    </Sheet>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-6">
                        <Link href={rootLink} className="flex items-center space-x-2">
                            <div>
                                <span className="font-bold font-body text-lg leading-none"><span className="text-foreground">Barbe</span><span className="text-primary">Easy</span></span>
                                <p className="text-xs text-muted-foreground">Gestão de Barbearia</p>
                            </div>
                        </Link>
                        <nav className="flex items-center space-x-6 text-sm font-medium">
                            <NavContent />
                        </nav>
                    </div>
                </div>
                
                {/* Right Group: Pushed to the right with ml-auto */}
                <div className="flex items-center ml-auto">
                    {session ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={session.avatarUrl || ''} alt={session.name || ''} />
                                        <AvatarFallback>{getInitials(session.name)}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{session.name}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{session.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push(createLink('/portal/perfil'))}>
                                    <UserIcon className="mr-2 h-4 w-4" />
                                    <span>Meu Perfil</span>
                                </DropdownMenuItem>
                                {isBarberOwner && (
                                    <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                                        <LayoutDashboard className="mr-2 h-4 w-4" />
                                        <span>Painel do Gerente</span>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={logout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Sair</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button onClick={() => router.push(loginLink)}>Fazer Login</Button>
                    )}
                </div>
            </div>
        </header>
    );
}
