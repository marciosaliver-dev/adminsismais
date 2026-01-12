import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FechamentoColaborador {
  nome_colaborador: string;
  relatorio_html: string | null;
}

interface FechamentoDemonstrativoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador: FechamentoColaborador | null;
}

export function FechamentoDemonstrativoModal({
  open,
  onOpenChange,
  colaborador,
}: FechamentoDemonstrativoModalProps) {
  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Demonstrativo - {colaborador?.nome_colaborador}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1">
          {colaborador?.relatorio_html ? (
            <div 
              className="prose prose-sm max-w-none p-4"
              dangerouslySetInnerHTML={{ __html: colaborador.relatorio_html }}
            />
          ) : (
            <div className="p-4 text-muted-foreground">
              Relatório não disponível. Calcule o fechamento primeiro.
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}