import { Button } from "@/components/ui/button";
import { Menu, Bell, User, LogOut, Building2, Calendar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useRadar } from "@/contexts/RadarContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { profile, signOut } = useAuth();
  const { ciclos, cicloAtivo, selecionarCiclo, loading: loadingRadar } = useRadar();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const formatCicloLabel = (ciclo: { nome: string, data_inicio: string, data_fim: string }) => {
    const start = format(new Date(ciclo.data_inicio + "T12:00:00"), "dd/MM", { locale: ptBR });
    const end = format(new Date(ciclo.data_fim + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });
    return `${ciclo.nome} (${start} - ${end})`;
  };

  return (
    <header className="sticky top-0 z-30 bg-card border-b border-border h-16 flex items-center justify-between px-4 lg:px-6">
      {/* Left: Menu button (mobile) and Logo (mobile) */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="lg:hidden">
          <img src="/icone_logo_op2_lateral_quadrada.png" alt="Sismais" className="h-8 w-8 object-contain" />
        </div>
      </div>

      {/* Center: Cycle Selector */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Ciclo Ativo:</span>
        </div>
        <Select
          value={cicloAtivo?.id || ""}
          onValueChange={selecionarCiclo}
          disabled={loadingRadar || ciclos.length === 0}
        >
          <SelectTrigger className="w-[200px] sm:w-[250px] h-10">
            <SelectValue placeholder="Selecione o Ciclo" />
          </SelectTrigger>
          <SelectContent>
            {ciclos.map((ciclo) => (
              <SelectItem key={ciclo.id} value={ciclo.id}>
                {formatCicloLabel(ciclo)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {profile?.nome || "Usuário"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {profile?.email}
                </p>
                {profile?.departamento && (
                  <div className="flex items-center gap-1 mt-1">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {profile.departamento}
                    </span>
                  </div>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/configuracoes")}>
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}