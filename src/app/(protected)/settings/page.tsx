import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileSettings } from "@/components/settings/profile-settings";
import { HoursSettings } from "@/components/settings/hours-settings";
import { SecuritySettings } from "@/components/settings/security-settings";
import { Settings as SettingsIcon } from "lucide-react";
import { ThemeToggle } from "@/components/settings/theme-toggle";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Configurações
        </h1>
        <p className="text-muted-foreground">
          Gerencie as informações, horários e segurança da sua barbearia.
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Perfil da Barbearia</TabsTrigger>
          <TabsTrigger value="hours">Horários</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6">
          <ProfileSettings />
        </TabsContent>
        <TabsContent value="hours" className="mt-6">
          <HoursSettings />
        </TabsContent>
        <TabsContent value="appearance" className="mt-6">
            <ThemeToggle />
        </TabsContent>
        <TabsContent value="security" className="mt-6">
            <SecuritySettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
