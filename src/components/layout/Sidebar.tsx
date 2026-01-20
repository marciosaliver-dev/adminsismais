"use client";

import { useState, useEffect } from "react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import {
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calculator,
  History,
  Receipt,
  FileSpreadsheet,
  Shield,
  Users,
  Lock,
  Target,
  ClipboardList,
  Star,
  Search,
  BarChart3,
  Rocket,
  TrendingUp,
  XCircle,
  Heart,
  DollarSign,
  Briefcase,
  Home,
  Zap, // Novo ícone para Lançar Dados
  LayoutGrid, // Novo ícone para Por Área
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/hooks/usePermissions";
import { usePermissoesRadar } from "@/hooks/usePermissoesRadar"; // Novo hook
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
  permission?: string;
  requireAdmin?: boolean;
  requireRadarPermission?: "podeGerenciarOKRs" | "podeGerenciarEquipe"; // Novo campo
}

interface NavSection {
  title: string;
  icon: React.ElementType;
  items: NavItem[];
  permission?: string;
  requireAdmin?: boolean;
}

const navSections: NavSection[] = [
  {
    title: "Radar OKR",
    icon: Rocket,
    items: [
      { title: "Dashboard", icon: BarChart3, href: "/dashboard-okr", permission: "levantamento.visualizar" },
      { title: "Meu Radar", icon: Target, href: "/meu-radar" },
      { title: "Por Área", icon: LayoutGrid, href: "/area" },
      { title: "Lançar Dados", icon: Zap, href: "/lancamentos" },
      { title: "Gestão de OKRs", icon: Settings, href: "/gestao", requireRadarPermission: "podeGerenciarOKRs" },
      { title: "Equipe", icon: Users, href: "/equipe", requireRadarPermission: "podeGerenciarEquipe" },
      { title: "Apresentação", icon: Briefcase, href: "/apresentacao" },
    ],
  },
  {
    title: "Métricas & Financeiro",
    icon: DollarSign,
    items: [
      { title: "Assinaturas & MRR", icon: TrendingUp, href: "/assinaturas", permission: "extrato.visualizar" },
      { title: "Cancelamentos", icon: XCircle, href: "/cancelamentos", permission: "extrato.visualizar" },
      { title: "Extrato Asaas", icon: FileSpreadsheet, href: "/extrato-asaas", permission: "extrato.visualizar" },
      { title: "Extrato Eduzz", icon: FileSpreadsheet, href: "/extrato-eduzz", permission: "extrato.visualizar" },
      { title: "Simulador Meta", icon: Target, href: "/comissoes/simulador", permission: "comissoes.visualizar" },
    ],
  },
  {
    title: "Comissões",
    icon: Calculator,
    items: [
      { title: "Novo Fechamento", icon: Calculator, href: "/comissoes", permission: "comissoes.criar" },
      { title: "Histórico", icon: History, href: "/comissoes/historico", permission: "comissoes.visualizar" },
      { title: "Relatório Vendas", icon: Receipt, href: "/comissoes/relatorio-vendas", permission: "comissoes.visualizar" },
      { title: "Configurações", icon: Settings, href: "/comissoes/configuracoes", permission: "comissoes.configurar" },
    ],
  },
  {
    title: "Gestão de Pessoas",
    icon: Users,
    items: [
      { title: "Colaboradores", icon: Users, href: "/equipe/colaboradores", permission: "equipe.gerenciar" },
      { title: "Vendas Serviços", icon: Receipt, href: "/equipe/vendas-servicos", permission: "equipe.vendas" },
      { title: "Metas Individuais", icon: Target, href: "/equipe/metas", permission: "equipe.metas" },
      { title: "Fechamento Equipe", icon: ClipboardList, href: "/equipe/fechamento", permission: "equipe.fechamento" },
      { title: "Levantamento 10K", icon: Heart, href: "/levantamento-10k", permission: "levantamento.visualizar" },
      { title: "Resultados 10K", icon: BarChart3, href: "/admin/levantamento-resultados", requireAdmin: true },
    ],
  },
  {
    title: "Administração",
    icon: Shield,
    requireAdmin: true,
    items: [
      { title: "Gerenciar Usuários", icon: Users, href: "/admin/usuarios", requireAdmin: true },
      { title: "Permissões", icon: Lock, href: "/admin/permissoes", requireAdmin: true },
    ],
  },
];

const FAVORITES_KEY = "sidebar-favorites";
const COLLAPSED_KEY = "sidebar-collapsed";

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { hasPermission, isAdmin, loading: loadingGlobalPermissions } = usePermissions();
  const { podeGerenciarOKRs, podeGerenciarEquipe, loading: loadingRadarPermissions } = usePermissoesRadar();
  
  const loading = loadingGlobalPermissions || loadingRadarPermissions;

  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    const initialExpanded = new Set(["Radar OKR", "Favoritos"]);
    const currentPath = window.location.pathname;
    const activeSection = navSections.find(section => 
      section.items.some(item => item.href === currentPath)
    );
    if (activeSection) {
      initialExpanded.add(activeSection.title);
    }
    return Array.from(initialExpanded);
  });
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(COLLAPSED_KEY);
    return saved ? JSON.parse(saved) : false;
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem(FAVORITES_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleFavorite = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(href) ? prev.filter((f) => f !== href) : [...prev, href]
    );
  };

  const canViewItem = (item: NavItem): boolean => {
    if (loading) return false;
    if (isAdmin) return true;
    if (item.requireAdmin && !isAdmin) return false;
    
    // Check global permissions
    if (item.permission && !hasPermission(item.permission)) return false;
    
    // Check Radar permissions
    if (item.requireRadarPermission) {
      if (item.requireRadarPermission === "podeGerenciarOKRs" && !podeGerenciarOKRs) return false;
      if (item.requireRadarPermission === "podeGerenciarEquipe" && !podeGerenciarEquipe) return false;
    }
    
    return true;
  };

  const canViewSection = (section: NavSection): boolean => {
    if (loading) return false;
    if (isAdmin) return true;
    if (section.requireAdmin && !isAdmin) return false;
    return section.items.some(canViewItem);
  };

  const allVisibleItems = navSections.flatMap((section) =>
    section.items.filter(canViewItem)
  );

  const favoriteItems = allVisibleItems.filter((item) =>
    favorites.includes(item.href)
  );

  const filteredSections = searchQuery
    ? navSections.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            canViewItem(item) &&
            item.title.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
    : navSections;

  const renderNavItem = (item: NavItem, showFavoriteStar = true) => {
    const isFavorite = favorites.includes(item.href);

    if (isCollapsed) {
      return (
        <TooltipProvider key={item.href}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <NavLink
                to={item.href}
                className="flex items-center justify-center p-2 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                onClick={onClose}
              >
                <item.icon className="w-5 h-5" />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-popover text-popover-foreground">
              {item.title}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <NavLink
        key={item.href}
        to={item.href}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors group"
        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
        onClick={onClose}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1 truncate">{item.title}</span>
        {showFavoriteStar && (
          <button
            onClick={(e) => toggleFavorite(item.href, e)}
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-sidebar-accent rounded",
              isFavorite && "opacity-100"
            )}
          >
            <Star
              className={cn(
                "w-4 h-4",
                isFavorite
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-sidebar-foreground/50"
              )}
            />
          </button>
        )}
        {item.badge && (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };
  
  const renderSectionItem = (section: NavSection) => {
    const isExpanded = expandedSections.includes(section.title);
    const isActive = section.items.some(item => window.location.pathname === item.href);
    const IconComponent = section.icon;

    if (isCollapsed) {
      return (
        <TooltipProvider key={section.title}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center justify-center p-2 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors cursor-pointer",
                  isActive && "bg-sidebar-accent text-sidebar-primary font-medium"
                )}
                onClick={() => toggleSection(section.title)}
              >
                <IconComponent className="w-5 h-5" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-popover text-popover-foreground">
              {section.title}
              <div className="mt-2 space-y-1">
                {section.items.filter(canViewItem).map(item => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className="block text-xs text-muted-foreground hover:text-foreground"
                    onClick={onClose}
                  >
                    {item.title}
                  </NavLink>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <div key={section.title} className="space-y-1">
        <button
          onClick={() => toggleSection(section.title)}
          className={cn(
            "flex items-center justify-between w-full px-3 py-2 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors",
            isActive && "bg-sidebar-accent text-sidebar-primary font-medium"
          )}
        >
          <div className="flex items-center gap-3">
            <IconComponent className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{section.title}</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        
        {isExpanded && (
          <div className="pl-4 space-y-1 border-l border-sidebar-border ml-3">
            {section.items.filter(canViewItem).map(item => (
              <NavLink
                key={item.href}
                to={item.href}
                className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors group text-sm"
                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                onClick={onClose}
              >
                <span className="w-1 h-1 rounded-full bg-current flex-shrink-0" />
                <span className="flex-1 truncate">{item.title}</span>
                {favorites.includes(item.href) && (
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                )}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 lg:translate-x-0",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex flex-col items-center p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between w-full mb-2">
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <img src="/icone_logo_op2_lateral_quadrada.png" alt="Sismais" className="h-10 w-10 object-contain" />
                <span className="font-heading font-bold text-lg text-sidebar-foreground tracking-tight">RADAR OKR</span>
              </div>
            )}
            {isCollapsed && (
              <img src="/icone_logo_op2_lateral_quadrada.png" alt="S" className="h-8 w-8 object-contain mx-auto" />
            )}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "hidden lg:flex text-sidebar-foreground hover:bg-sidebar-accent ml-2",
                isCollapsed && "hidden"
              )}
              onClick={toggleCollapse}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>
          {isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={toggleCollapse}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}
        </div>

        {!isCollapsed && (
          <div className="p-3 border-b border-sidebar-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/50" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50"
              />
            </div>
          </div>
        )}

        <nav
          className={cn(
            "overflow-y-auto",
            isCollapsed ? "p-2" : "p-4",
            "space-y-4 h-[calc(100vh-8rem)]"
          )}
        >
          {/* Seção de Favoritos (mantida como lista simples) */}
          {favoriteItems.length > 0 && !searchQuery && (
            <div>
              {!isCollapsed && (
                <button
                  onClick={() => toggleSection("Favoritos")}
                  className="flex items-center justify-between w-full text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider mb-3 hover:text-sidebar-foreground transition-colors"
                >
                  <span className="flex items-center gap-2">⭐ Favoritos</span>
                  {expandedSections.includes("Favoritos") ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}

              {(expandedSections.includes("Favoritos") || isCollapsed) && (
                <div className="space-y-1">
                  {favoriteItems.map((item) => renderNavItem(item, false))}
                </div>
              )}

              {!isCollapsed && <div className="my-4 border-t border-sidebar-border" />}
            </div>
          )}

          {/* Seções de Módulos */}
          {filteredSections.map((section) => {
            if (!canViewSection(section)) return null;

            const visibleItems = section.items.filter(canViewItem);
            if (visibleItems.length === 0) return null;

            // Se estiver pesquisando, renderiza como lista simples
            if (searchQuery) {
              return (
                <div key={section.title}>
                  <p className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider mb-2">
                    {section.title}
                  </p>
                  <div className="space-y-1">
                    {visibleItems.map((item) => renderNavItem(item))}
                  </div>
                </div>
              );
            }

            // Se não estiver pesquisando, renderiza como item de módulo expansível
            return renderSectionItem(section);
          })}
        </nav>
      </aside>
    </>
  );
}