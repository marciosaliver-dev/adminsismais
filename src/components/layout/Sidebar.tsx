import { useState, useEffect } from "react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/hooks/usePermissions";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

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
}

interface NavSection {
  title: string;
  items: NavItem[];
  permission?: string;
  requireAdmin?: boolean;
}

const navSections: NavSection[] = [
  {
    title: "💰 Comissões",
    items: [
      { title: "Novo Fechamento", icon: Calculator, href: "/comissoes", permission: "comissoes.criar" },
      { title: "📋 Histórico", icon: History, href: "/comissoes/historico", permission: "comissoes.visualizar" },
      { title: "📊 Relatório Vendas", icon: Receipt, href: "/comissoes/relatorio-vendas", permission: "comissoes.visualizar" },
      { title: "🎯 Simulador Meta", icon: Target, href: "/comissoes/simulador", permission: "comissoes.visualizar" },
      { title: "⚙️ Configurações", icon: Settings, href: "/comissoes/configuracoes", permission: "comissoes.configurar" },
    ],
  },
  {
    title: "👥 Equipe",
    items: [
      { title: "Colaboradores", icon: Users, href: "/equipe/colaboradores", permission: "equipe.gerenciar" },
      { title: "Vendas Serviços", icon: Receipt, href: "/equipe/vendas-servicos", permission: "equipe.vendas" },
      { title: "Metas Individuais", icon: Target, href: "/equipe/metas", permission: "equipe.metas" },
      { title: "Fechamento", icon: ClipboardList, href: "/equipe/fechamento", permission: "equipe.fechamento" },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { title: "📄 Extrato Asaas", icon: FileSpreadsheet, href: "/extrato-asaas", permission: "extrato.visualizar" },
      { title: "📄 Extrato Eduzz", icon: FileSpreadsheet, href: "/extrato-eduzz", permission: "extrato.visualizar" },
      { title: "📈 Assinaturas & MRR", icon: TrendingUp, href: "/assinaturas", permission: "extrato.visualizar" },
    ],
  },
  {
    title: "🔒 Administração",
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
  const { hasPermission, isAdmin, loading } = usePermissions();
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "💰 Comissões",
    "👥 Equipe",
    "Financeiro",
    "🔒 Administração",
    "⭐ Favoritos",
  ]);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(COLLAPSED_KEY);
    return saved ? JSON.parse(saved) : false;
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem(FAVORITES_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Persist favorites
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
    if (item.requireAdmin) return isAdmin;
    if (item.permission) return hasPermission(item.permission);
    return true;
  };

  const canViewSection = (section: NavSection): boolean => {
    if (loading) return false;
    if (section.requireAdmin) return isAdmin;
    return section.items.some(canViewItem);
  };

  // Get all visible items for favorites and search
  const allVisibleItems = navSections.flatMap((section) =>
    section.items.filter(canViewItem)
  );

  // Get favorite items
  const favoriteItems = allVisibleItems.filter((item) =>
    favorites.includes(item.href)
  );

  // Filter items by search
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

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-heading font-bold text-sidebar-foreground">
                  SISMAIS
                </h1>
                <p className="text-xs text-primary">Financial Dashboard</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "hidden lg:flex text-sidebar-foreground hover:bg-sidebar-accent",
              isCollapsed && "mx-auto mt-2"
            )}
            onClick={toggleCollapse}
          >
            <ChevronLeft
              className={cn(
                "w-5 h-5 transition-transform",
                isCollapsed && "rotate-180"
              )}
            />
          </Button>
        </div>

        {/* Search */}
        {!isCollapsed && (
          <div className="p-3 border-b border-sidebar-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/50" />
              <Input
                placeholder="Buscar... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav
          className={cn(
            "overflow-y-auto",
            isCollapsed ? "p-2" : "p-4",
            "space-y-4 h-[calc(100vh-8rem)]"
          )}
        >
          {/* Favorites Section */}
          {favoriteItems.length > 0 && !searchQuery && (
            <div>
              {!isCollapsed && (
                <button
                  onClick={() => toggleSection("⭐ Favoritos")}
                  className="flex items-center justify-between w-full text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider mb-3 hover:text-sidebar-foreground transition-colors"
                >
                  <span className="flex items-center gap-2">⭐ Favoritos</span>
                  {expandedSections.includes("⭐ Favoritos") ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}

              {(expandedSections.includes("⭐ Favoritos") || isCollapsed) && (
                <div className="space-y-1">
                  {favoriteItems.map((item) => renderNavItem(item, false))}
                </div>
              )}

              {!isCollapsed && <div className="my-4 border-t border-sidebar-border" />}
            </div>
          )}

          {/* Regular Sections */}
          {filteredSections.map((section) => {
            if (!canViewSection(section)) return null;

            const visibleItems = section.items.filter(canViewItem);
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title}>
                {!isCollapsed && (
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="flex items-center justify-between w-full text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider mb-3 hover:text-sidebar-foreground transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      {section.requireAdmin && <Shield className="w-3 h-3" />}
                      {section.title}
                    </span>
                    {expandedSections.includes(section.title) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                )}

                {(expandedSections.includes(section.title) || isCollapsed) && (
                  <div className="space-y-1">
                    {visibleItems.map((item) => renderNavItem(item))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
