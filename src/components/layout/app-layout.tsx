
'use client';

import React from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  Calendar,
  Users,
  Tag,
  User,
  LayoutDashboard,
  LogOut,
  Repeat,
  Settings,
  Gift,
  DollarSign,
  Package,
  ShoppingCart,
  Briefcase,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';

const menuItems = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/appointments', label: 'Agendamentos', icon: Calendar },
  { href: '/clients', label: 'Clientes', icon: Users },
  { href: '/staff', label: 'Equipe', icon: User },
  { href: '/professions', label: 'Cargos', icon: Briefcase },
  { href: '/services', label: 'Serviços', icon: Tag },
  { href: '/products', label: 'Produtos', icon: Package },
  { href: '/sales', label: 'Vendas', icon: ShoppingCart },
  { href: '/subscriptions', label: 'Assinaturas', icon: Repeat },
  { href: '/loyalty', label: 'Fidelidade', icon: Gift },
  { href: '/financial', label: 'Financeiro', icon: DollarSign },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const auth = getAuth(app);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };
  
  const getInitials = (email: string | null | undefined) => {
    if (!email) return 'AD';
    return email.substring(0, 2).toUpperCase();
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center">
            <div className="group-data-[collapsible=icon]:hidden">
              <div>
                <h1 className="text-2xl font-bold leading-none font-body">
                  <span className="text-sidebar-foreground">Estilo</span><span className="text-primary">Gestor</span>
                </h1>
                <p className="text-xs text-sidebar-foreground/80">Gestão de Salão</p>
              </div>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4">
            <div className="flex items-center gap-3">
             <Avatar className="size-9">
              <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'Admin'} data-ai-hint="person face" />
              <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
            </Avatar>
            <div className="group-data-[collapsible=icon]:hidden flex flex-col overflow-hidden">
              <span className="text-sm font-semibold truncate">{user?.displayName || 'Usuário'}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
            </div>
            <Button variant="ghost" size="icon" className="ml-auto group-data-[collapsible=icon]:hidden" onClick={handleSignOut} aria-label="Sair">
                <LogOut className="size-5" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center gap-4 border-b bg-background/50 backdrop-blur-sm px-6 sticky top-0 z-10">
          <SidebarTrigger className="md:hidden" />
          <div className="w-full flex-1">
            {/* Can add breadcrumbs or page title here */}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
