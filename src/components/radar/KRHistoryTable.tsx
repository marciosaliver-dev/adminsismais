import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare } from "lucide-react";

interface Lancamento {
  id: string;
  data: string;
  valor: number;
  observacao: string | null;
  ciclo_nome: string;
}

interface KRHistoryTableProps {
  historico: Lancamento[];
  tipoMeta: string;
  baseline: number;
  meta: number;
  unidade: string;
  mostrarCiclo?: boolean;
}

export function KRHistoryTable({ historico, tipoMeta, baseline, meta, unidade, mostrarCiclo }: KRHistoryTableProps) {
  // Calcular acumulado
  let soma = baseline;
  const dataComAcumulado = [...historico].sort((a, b) => a.data.localeCompare(b.data)).map(item => {
    soma = tipoMeta === 'Manter' ? item.valor : soma + item.valor;
    
    let progresso = 0;
    if (tipoMeta === 'Crescer') {
      progresso = ((soma - baseline) / (meta - baseline)) * 100;
    } else if (tipoMeta === 'Reduzir') {
      progresso = ((baseline - soma) / (baseline - meta)) * 100;
    } else {
      progresso = (soma / meta) * 100;
    }

    return { 
      ...item, 
      acumulado: soma, 
      progresso: Math.max(0, progresso) 
    };
  }).reverse(); // Mostrar mais recentes primeiro na tabela

  const getIndicador = (prog: number) => {
    if (prog >= 100) return "✅";
    if (prog >= 70) return "🔵";
    if (prog >= 40) return "⚠️";
    return "🔴";
  };

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-24">Data</TableHead>
            {mostrarCiclo && <TableHead>Ciclo</TableHead>}
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Acumulado</TableHead>
            <TableHead className="text-right">% Meta</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataComAcumulado.length === 0 ? (
            <TableRow>
              <TableCell colSpan={mostrarCiclo ? 6 : 5} className="text-center py-8 text-muted-foreground">
                Nenhum lançamento encontrado.
              </TableCell>
            </TableRow>
          ) : (
            dataComAcumulado.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">
                  {format(parseISO(item.data), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                {mostrarCiclo && <TableCell className="text-xs text-muted-foreground">{item.ciclo_nome}</TableCell>}
                <TableCell className="text-right">{item.valor.toLocaleString('pt-BR')} {unidade}</TableCell>
                <TableCell className="text-right font-bold">{item.acumulado.toLocaleString('pt-BR')} {unidade}</TableCell>
                <TableCell className="text-right font-medium">{item.progresso.toFixed(0)}%</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{getIndicador(item.progresso)}</span>
                    {item.observacao && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">{item.observacao}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}