import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Plus, Zap, Target } from "lucide-react";

interface Props {
  krs: Array<{ id: string; titulo: string }>;
  onSelect: (id: string) => void;
}

export function QuickLaunchFAB({ krs, onSelect }: Props) {
  if (krs.length === 0) return null;

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-4 duration-500">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="lg" className="h-14 w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 text-white">
            <Plus className="w-6 h-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 mb-4 rounded-2xl shadow-2xl p-2">
          <DropdownMenuLabel className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            Lançamento Rápido
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="max-h-64 overflow-y-auto">
            {krs.map(kr => (
              <DropdownMenuItem 
                key={kr.id} 
                onClick={() => onSelect(kr.id)}
                className="rounded-lg py-3 cursor-pointer"
              >
                <Target className="w-4 h-4 mr-3 text-muted-foreground" />
                <span className="text-sm font-medium line-clamp-1">{kr.titulo}</span>
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}