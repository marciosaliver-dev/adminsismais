import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Settings,
  ChevronDown,
  ChevronRight,
  X,
  Calculator,
  History,
  Receipt,
  FileSpreadsheet,
  Shield,
  Users,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";

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
      { title: "⚙️ Configurações", icon: Settings, href: "/comissoes/configuracoes", permission: "comissoes.configurar" },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { title: "📄 Extrato Asaas", icon: FileSpreadsheet, href: "/extrato-asaas", permission: "extrato.visualizar" },
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

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { hasPermission, isAdmin, loading } = usePermissions();
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "💰 Comissões",
    "Financeiro",
    "🔒 Administração",
  ]);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
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
    // Mostrar seção se pelo menos um item for visível
    return section.items.some(canViewItem);
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
          "fixed left-0 top-0 z-50 h-full bg-sidebar border-r border-sidebar-border transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "w-64 lg:w-64"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-heading font-bold text-sidebar-foreground">
              SISMAIS
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-6 overflow-y-auto h-[calc(100vh-5rem)]">
          {navSections.map((section) => {
            if (!canViewSection(section)) return null;

            const visibleItems = section.items.filter(canViewItem);
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title}>
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

                {expandedSections.includes(section.title) && (
                  <div className="space-y-1">
                    {visibleItems.map((item) => (
                      <NavLink
                        key={item.href}
                        to={item.href}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        onClick={onClose}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="flex-1">{item.title}</span>
                        {item.badge && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    ))}
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
