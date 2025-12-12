import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Wallet,
  Receipt,
  CreditCard,
  Building2,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Principal",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, href: "/" },
      { title: "Análise de Cohorts", icon: TrendingUp, href: "/cohorts" },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { title: "Lançamentos", icon: Wallet, href: "/financeiro" },
      { title: "Conciliação", icon: Receipt, href: "/conciliacao" },
      { title: "Orçamentos", icon: Building2, href: "/orcamentos" },
    ],
  },
  {
    title: "Comissões",
    items: [
      { title: "Configurações", icon: Calculator, href: "/comissoes/configuracoes" },
    ],
  },
  {
    title: "Despesas",
    items: [
      { title: "Minhas Despesas", icon: Receipt, href: "/despesas" },
      { title: "Aprovar", icon: Users, href: "/despesas/aprovar", badge: "3" },
      { title: "Cartões", icon: CreditCard, href: "/despesas/cartoes" },
    ],
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "Principal",
    "Financeiro",
    "Comissões",
    "Despesas",
  ]);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
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
          {navSections.map((section) => (
            <div key={section.title}>
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider mb-3 hover:text-sidebar-foreground transition-colors"
              >
                <span>{section.title}</span>
                {expandedSections.includes(section.title) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {expandedSections.includes(section.title) && (
                <div className="space-y-1">
                  {section.items.map((item) => (
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
          ))}

          {/* Settings at bottom */}
          <div className="pt-6 border-t border-sidebar-border">
            <NavLink
              to="/configuracoes"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
              onClick={onClose}
            >
              <Settings className="w-5 h-5" />
              <span>Configurações</span>
            </NavLink>
          </div>
        </nav>
      </aside>
    </>
  );
}
