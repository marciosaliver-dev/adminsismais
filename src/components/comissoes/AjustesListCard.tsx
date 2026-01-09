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
import { Trash2, Plus, Minus } from "lucide-react";
import { format } from "date-fns";

interface AjusteComissao {
  id: string;
  vendedor: string;
  tipo: string;
  valor: number;
  descricao: string;
  created_at: string;
}

interface AjustesListCardProps {
  ajustes: AjusteComissao[];
  onDelete: (id: string) => void;
  onAdd: () => void;
  isReadOnly?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function AjustesListCard({
  ajustes,
  onDelete,
  onAdd,
  isReadOnly = false,
}: AjustesListCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Ajustes Manuais de Comissão
        </CardTitle>
        {!isReadOnly && (
          <Button size="sm" onClick={onAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Ajuste
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {ajustes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum ajuste manual registrado.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-center">Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-center">Data</TableHead>
                {!isReadOnly && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ajustes.map((ajuste) => (
                <TableRow key={ajuste.id}>
                  <TableCell className="font-medium">{ajuste.vendedor}</TableCell>
                  <TableCell className="text-center">
                    {ajuste.tipo === "credito" ? (
                      <Badge className="bg-success/20 text-success border-success">
                        <Plus className="w-3 h-3 mr-1" />
                        Crédito
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <Minus className="w-3 h-3 mr-1" />
                        Débito
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold ${
                      ajuste.tipo === "credito" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {ajuste.tipo === "credito" ? "+" : "-"}
                    {formatCurrency(ajuste.valor)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={ajuste.descricao}>
                    {ajuste.descricao}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground text-sm">
                    {format(new Date(ajuste.created_at), "dd/MM/yy HH:mm")}
                  </TableCell>
                  {!isReadOnly && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(ajuste.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
