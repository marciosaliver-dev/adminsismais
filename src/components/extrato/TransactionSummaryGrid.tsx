import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import { formatarTipoTransacao, formatCurrency, formatNumber } from "@/lib/extratoUtils";

interface TransactionSummary {
  tipoOriginal: string;
  tipoFormatado: string;
  quantidade: number;
  valor: number;
}

interface TransactionSummaryGridProps {
  transacoes: Array<{
    tipo_transacao: string;
    valor: number;
    tipo_lancamento: string;
  }>;
  selectedTipos: string[];
  onSelectionChange: (tipos: string[]) => void;
}

type SortField = "quantidade" | "valor";
type SortOrder = "asc" | "desc";

const ITEMS_PER_PAGE = 10;

export function TransactionSummaryGrid({ 
  transacoes, 
  selectedTipos, 
  onSelectionChange 
}: TransactionSummaryGridProps) {
  const [sortField, setSortField] = useState<SortField>("valor");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Agregar transações por tipo
  const summaryData = useMemo(() => {
    const grouped = transacoes.reduce((acc, t) => {
      const key = t.tipo_transacao;
      if (!acc[key]) {
        acc[key] = {
          tipoOriginal: key,
          tipoFormatado: formatarTipoTransacao(key),
          quantidade: 0,
          valor: 0,
        };
      }
      acc[key].quantidade += 1;
      // Manter sinal para débitos
      acc[key].valor += t.valor;
      return acc;
    }, {} as Record<string, TransactionSummary>);

    return Object.values(grouped);
  }, [transacoes]);

  // Ordenar
  const sortedData = useMemo(() => {
    const sorted = [...summaryData];
    sorted.sort((a, b) => {
      const aVal = sortField === "quantidade" ? a.quantidade : Math.abs(a.valor);
      const bVal = sortField === "quantidade" ? b.quantidade : Math.abs(b.valor);
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [summaryData, sortField, sortOrder]);

  // Paginação
  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Totais
  const totals = useMemo(() => {
    const filtered = selectedTipos.length > 0 
      ? summaryData.filter(s => selectedTipos.includes(s.tipoOriginal))
      : summaryData;
    
    return {
      quantidade: filtered.reduce((sum, s) => sum + s.quantidade, 0),
      valor: filtered.reduce((sum, s) => sum + s.valor, 0),
    };
  }, [summaryData, selectedTipos]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const handleRowClick = (tipo: string, index: number, event: React.MouseEvent) => {
    const isSelected = selectedTipos.includes(tipo);
    
    // Shift+Click para seleção em range
    if (event.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeTypes = paginatedData.slice(start, end + 1).map(s => s.tipoOriginal);
      
      const newSelection = new Set(selectedTipos);
      rangeTypes.forEach(t => newSelection.add(t));
      onSelectionChange(Array.from(newSelection));
    } else {
      // Toggle normal
      if (isSelected) {
        onSelectionChange(selectedTipos.filter(t => t !== tipo));
      } else {
        onSelectionChange([...selectedTipos, tipo]);
      }
      setLastSelectedIndex(index);
    }
  };

  const handleSelectAll = () => {
    if (selectedTipos.length === summaryData.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(summaryData.map(s => s.tipoOriginal));
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? 
      <ChevronUp className="w-4 h-4 inline ml-1" /> : 
      <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  return (
    <Card className="bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Resumo por Tipo de Transação</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSelectAll}
              className="text-xs"
            >
              {selectedTipos.length === summaryData.length ? "Limpar seleção" : "Selecionar todos"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead className="w-[40px]">
                  <Checkbox 
                    checked={selectedTipos.length === summaryData.length && summaryData.length > 0}
                    onCheckedChange={handleSelectAll}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </TableHead>
                <TableHead>Tipo de transação</TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("quantidade")}
                >
                  Qtd <SortIcon field="quantidade" />
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("valor")}
                >
                  Valor <SortIcon field="valor" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((summary, idx) => {
                const isSelected = selectedTipos.includes(summary.tipoOriginal);
                const absoluteIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx;
                
                return (
                  <TableRow 
                    key={summary.tipoOriginal}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? "bg-primary/10 hover:bg-primary/15" 
                        : "hover:bg-muted/50"
                    }`}
                    onClick={(e) => handleRowClick(summary.tipoOriginal, idx, e)}
                  >
                    <TableCell className="text-muted-foreground text-sm">
                      {absoluteIndex + 1}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => handleRowClick(summary.tipoOriginal, idx, { shiftKey: false } as React.MouseEvent)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {summary.tipoFormatado}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(summary.quantidade)}
                    </TableCell>
                    <TableCell className={`text-right font-medium tabular-nums ${
                      summary.valor >= 0 ? "text-emerald-600" : "text-red-500"
                    }`}>
                      {summary.valor < 0 ? "-" : ""}{formatCurrency(Math.abs(summary.valor))}
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Linha de total */}
              <TableRow className="bg-muted/50 font-bold border-t-2">
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="font-bold">
                  {selectedTipos.length > 0 ? `Total (${selectedTipos.length} selecionados)` : "Total geral"}
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums">
                  {formatNumber(totals.quantidade)}
                </TableCell>
                <TableCell className={`text-right font-bold tabular-nums ${
                  totals.valor >= 0 ? "text-emerald-600" : "text-red-500"
                }`}>
                  {totals.valor < 0 ? "-" : ""}{formatCurrency(Math.abs(totals.valor))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)} de{" "}
              {sortedData.length} tipos
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
