import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { formatarTipoTransacao } from "@/lib/extratoUtils";

interface ActiveFiltersBarProps {
  selectedTipos: string[];
  onRemoveTipo: (tipo: string) => void;
  onClearAll: () => void;
}

export function ActiveFiltersBar({ 
  selectedTipos, 
  onRemoveTipo, 
  onClearAll 
}: ActiveFiltersBarProps) {
  if (selectedTipos.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
        <span className="text-sm text-muted-foreground">
          Filtros ativos:
        </span>
        <Badge variant="secondary" className="bg-muted">
          Todos os tipos de transação
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg">
      <span className="text-sm text-muted-foreground">
        Filtros ativos:
      </span>
      {selectedTipos.map(tipo => (
        <Badge 
          key={tipo}
          variant="secondary"
          className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 cursor-pointer flex items-center gap-1 pr-1"
        >
          {formatarTipoTransacao(tipo)}
          <button
            onClick={() => onRemoveTipo(tipo)}
            className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs h-7"
      >
        Limpar todos
      </Button>
    </div>
  );
}
