import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query";
import { format } from "date-fns";

interface AjusteFechamentoEquipe {
  id: string;
  colaborador_id: string | null;
  tipo: string;
  valor: number;
  descricao: string;
  created_at: string;
}

interface Colaborador {
  id: string;
  nome: string;
}

interface FechamentoAjustesListProps {
  ajustes: AjusteFechamentoEquipe[];
  todosColaboradores: Colaborador[];
  onAddAjuste: () => void;
  deleteAjusteMutation: UseMutationResult<any, Error, string, unknown>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
};

export function FechamentoAjustesList({
  ajustes,
  todosColaboradores,
  onAddAjuste,
  deleteAjusteMutation,
}: FechamentoAjustesListProps) {
  const totalAjustesCredito = ajustes.filter(a => a.tipo === "credito").reduce((sum, a) => sum + a.valor, 0);
  const totalAjustesDebito = ajustes.filter(a => a.tipo === "debito").reduce((sum, a) => sum + a.valor, 0);
  const totalAjustes = totalAjustesCredito - totalAjustesDebito;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Ajustes Manuais</CardTitle>
        <Button size="sm" onClick={onAddAjuste}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Ajuste
        </Button>
      </CardHeader>
      <CardContent>
        {ajustes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum ajuste manual registrado
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ajustes.map((ajuste) => {
                  const colaborador = todosColaboradores.find(c => c.id === ajuste.colaborador_id);
                  return (
                    <TableRow key={ajuste.id}>
                      <TableCell>{ajuste.descricao}</TableCell>
                      <TableCell>{colaborador?.nome || "Geral"}</TableCell>
                      <TableCell>
                        <Badge variant={ajuste.tipo === "credito" ? "default" : "destructive"}>
                          {ajuste.tipo === "credito" ? "Crédito" : "Débito"}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        ajuste.tipo === "credito" ? "text-green-600" : "text-red-600"
                      }`}>
                        {ajuste.tipo === "credito" ? "+" : "-"}{formatCurrency(ajuste.valor)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteAjusteMutation.mutate(ajuste.id)}
                          disabled={deleteAjusteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="mt-4 p-4 bg-muted rounded-lg flex justify-between items-center">
              <div className="space-x-6">
                <span className="text-green-600">Total Créditos: {formatCurrency(totalAjustesCredito)}</span>
                <span className="text-red-600">Total Débitos: {formatCurrency(totalAjustesDebito)}</span>
              </div>
              <div className="font-bold">
                Saldo: <span className={totalAjustes >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(totalAjustes)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}