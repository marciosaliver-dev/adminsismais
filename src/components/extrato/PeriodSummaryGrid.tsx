import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { CalendarDays } from "lucide-react";
import { formatCurrency } from "@/lib/extratoUtils";

interface TransacaoResumo {
  data: string;
  valor: number;
  tipo_lancamento: string;
}

interface PeriodSummaryGridProps {
  transacoes: TransacaoResumo[];
}

interface PeriodData {
  periodo: string;
  label: string;
  qtdCreditos: number;
  qtdDebitos: number;
  totalCreditos: number;
  totalDebitos: number;
  resultado: number;
}

function getPeriodo(data: string): "1-10" | "11-20" | "21-31" {
  const day = parseInt(data.split("-")[2], 10);
  if (day <= 10) return "1-10";
  if (day <= 20) return "11-20";
  return "21-31";
}

export function PeriodSummaryGrid({ transacoes }: PeriodSummaryGridProps) {
  const periodData = useMemo(() => {
    const periodos: Record<string, PeriodData> = {
      "1-10": { 
        periodo: "1-10", 
        label: "Dias 1 a 10", 
        qtdCreditos: 0, 
        qtdDebitos: 0, 
        totalCreditos: 0, 
        totalDebitos: 0, 
        resultado: 0 
      },
      "11-20": { 
        periodo: "11-20", 
        label: "Dias 11 a 20", 
        qtdCreditos: 0, 
        qtdDebitos: 0, 
        totalCreditos: 0, 
        totalDebitos: 0, 
        resultado: 0 
      },
      "21-31": { 
        periodo: "21-31", 
        label: "Dias 21 a 30/31", 
        qtdCreditos: 0, 
        qtdDebitos: 0, 
        totalCreditos: 0, 
        totalDebitos: 0, 
        resultado: 0 
      },
    };

    transacoes.forEach((t) => {
      const p = getPeriodo(t.data);
      if (t.tipo_lancamento === "Crédito") {
        periodos[p].qtdCreditos += 1;
        periodos[p].totalCreditos += Math.abs(t.valor);
      } else {
        periodos[p].qtdDebitos += 1;
        periodos[p].totalDebitos += Math.abs(t.valor);
      }
    });

    // Calcular resultado
    Object.values(periodos).forEach((p) => {
      p.resultado = p.totalCreditos - p.totalDebitos;
    });

    return Object.values(periodos);
  }, [transacoes]);

  const totais = useMemo(() => {
    return periodData.reduce(
      (acc, p) => ({
        qtdCreditos: acc.qtdCreditos + p.qtdCreditos,
        qtdDebitos: acc.qtdDebitos + p.qtdDebitos,
        totalCreditos: acc.totalCreditos + p.totalCreditos,
        totalDebitos: acc.totalDebitos + p.totalDebitos,
        resultado: acc.resultado + p.resultado,
      }),
      { qtdCreditos: 0, qtdDebitos: 0, totalCreditos: 0, totalDebitos: 0, resultado: 0 }
    );
  }, [periodData]);

  return (
    <Card className="bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          Resumo por Período do Mês
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Período</TableHead>
                <TableHead className="text-center font-semibold">Qtd Créditos</TableHead>
                <TableHead className="text-right font-semibold">Total Créditos</TableHead>
                <TableHead className="text-center font-semibold">Qtd Débitos</TableHead>
                <TableHead className="text-right font-semibold">Total Débitos</TableHead>
                <TableHead className="text-right font-semibold">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodData.map((p) => (
                <TableRow key={p.periodo} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{p.label}</TableCell>
                  <TableCell className="text-center">{p.qtdCreditos}</TableCell>
                  <TableCell className="text-right text-emerald-600 font-medium">
                    {formatCurrency(p.totalCreditos)}
                  </TableCell>
                  <TableCell className="text-center">{p.qtdDebitos}</TableCell>
                  <TableCell className="text-right text-red-600 font-medium">
                    {formatCurrency(p.totalDebitos)}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${p.resultado >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {formatCurrency(p.resultado)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/70 font-bold">
                <TableCell>Total Geral</TableCell>
                <TableCell className="text-center">{totais.qtdCreditos}</TableCell>
                <TableCell className="text-right text-emerald-600">
                  {formatCurrency(totais.totalCreditos)}
                </TableCell>
                <TableCell className="text-center">{totais.qtdDebitos}</TableCell>
                <TableCell className="text-right text-red-600">
                  {formatCurrency(totais.totalDebitos)}
                </TableCell>
                <TableCell className={`text-right ${totais.resultado >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrency(totais.resultado)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
