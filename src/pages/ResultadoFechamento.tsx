import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  TableFooter,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Download, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import type { Tables } from "@/integrations/supabase/types";
import VendedorDetalhesModal from "@/components/comissoes/VendedorDetalhesModal";

type FechamentoComissao = Tables<"fechamento_comissao">;
type ComissaoCalculada = Tables<"comissao_calculada">;
type ConfiguracaoComissao = Tables<"configuracao_comissao">;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value}%`;
};

// Cores das faixas
const getFaixaColor = (faixaNome: string | null) => {
  const nome = faixaNome?.toLowerCase() || "";
  if (nome.includes("início")) return "bg-muted text-muted-foreground";
  if (nome.includes("em ação")) return "bg-orange-100 text-orange-700 border-orange-300";
  if (nome.includes("starter")) return "bg-yellow-100 text-yellow-700 border-yellow-300";
  if (nome.includes("pro")) return "bg-blue-100 text-blue-700 border-blue-300";
  if (nome.includes("elite i") && !nome.includes("elite ii")) return "bg-green-100 text-green-700 border-green-300";
  if (nome.includes("elite ii") || nome.includes("lenda")) return "bg-amber-100 text-amber-700 border-amber-300";
  return "bg-muted text-muted-foreground";
};

export default function ResultadoFechamento() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [selectedComissao, setSelectedComissao] = useState<ComissaoCalculada | null>(null);

  // Fetch fechamento
  const { data: fechamento, isLoading: loadingFechamento } = useQuery({
    queryKey: ["fechamento", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fechamento_comissao")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as FechamentoComissao | null;
    },
    enabled: !!id,
  });

  // Fetch comissões calculadas
  const { data: comissoes = [], isLoading: loadingComissoes } = useQuery({
    queryKey: ["comissoes_calculadas", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comissao_calculada")
        .select("*")
        .eq("fechamento_id", id)
        .order("total_receber", { ascending: false });
      if (error) throw error;
      return data as ComissaoCalculada[];
    },
    enabled: !!id,
  });

  // Fetch configurações
  const { data: configuracoes = [] } = useQuery({
    queryKey: ["configuracao_comissao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracao_comissao")
        .select("*");
      if (error) throw error;
      return data as ConfiguracaoComissao[];
    },
  });

  const metaMrr = parseFloat(configuracoes.find((c) => c.chave === "meta_mrr")?.valor || "0");

  // Close month mutation
  const closeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("fechamento_comissao")
        .update({ status: "fechado" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fechamento", id] });
      queryClient.invalidateQueries({ queryKey: ["fechamentos_comissao"] });
      setCloseDialogOpen(false);
      toast({ title: "Sucesso!", description: "Mês fechado com sucesso." });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível fechar o mês.",
        variant: "destructive",
      });
    },
  });

  // Recalculate commissions
  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke("calcular-comissoes", {
        body: { fechamento_id: id },
      });
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["fechamento", id] });
      queryClient.invalidateQueries({ queryKey: ["comissoes_calculadas", id] });
      toast({ title: "Sucesso!", description: "Comissões recalculadas." });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao recalcular comissões.",
        variant: "destructive",
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  // Export to Excel
  const handleExport = () => {
    if (!fechamento || comissoes.length === 0) return;

    // Create CSV content
    const headers = ["Vendedor", "Vendas", "MRR Faixa", "Faixa", "%", "Comissão", "Bônus Anual", "Bônus Equipe", "Bônus Empresa", "Total"];
    const rows = comissoes.map((c) => [
      c.vendedor,
      c.qtd_vendas,
      c.mrr_total.toFixed(2).replace(".", ","),
      c.faixa_nome || "-",
      c.percentual,
      c.valor_comissao.toFixed(2).replace(".", ","),
      c.bonus_anual.toFixed(2).replace(".", ","),
      c.bonus_meta_equipe.toFixed(2).replace(".", ","),
      c.bonus_empresa.toFixed(2).replace(".", ","),
      c.total_receber.toFixed(2).replace(".", ","),
    ]);

    // Add totals row
    const totals = comissoes.reduce(
      (acc, c) => ({
        vendas: acc.vendas + c.qtd_vendas,
        mrrTotal: acc.mrrTotal + c.mrr_total,
        comissao: acc.comissao + c.valor_comissao,
        bonusAnual: acc.bonusAnual + c.bonus_anual,
        bonusEquipe: acc.bonusEquipe + c.bonus_meta_equipe,
        bonusEmpresa: acc.bonusEmpresa + c.bonus_empresa,
        total: acc.total + c.total_receber,
      }),
      { vendas: 0, mrrTotal: 0, comissao: 0, bonusAnual: 0, bonusEquipe: 0, bonusEmpresa: 0, total: 0 }
    );

    rows.push([
      "TOTAL",
      totals.vendas,
      totals.mrrTotal.toFixed(2).replace(".", ","),
      "-",
      "-",
      totals.comissao.toFixed(2).replace(".", ","),
      totals.bonusAnual.toFixed(2).replace(".", ","),
      totals.bonusEquipe.toFixed(2).replace(".", ","),
      totals.bonusEmpresa.toFixed(2).replace(".", ","),
      totals.total.toFixed(2).replace(".", ","),
    ]);

    const csvContent = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `comissoes_${format(new Date(fechamento.mes_referencia), "yyyy-MM")}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: "Exportado!", description: "Arquivo CSV gerado com sucesso." });
  };

  if (loadingFechamento) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!fechamento) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Fechamento não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/comissoes")}>
          Voltar
        </Button>
      </div>
    );
  }

  const mesAno = format(new Date(fechamento.mes_referencia), "MMMM/yyyy", { locale: ptBR });

  // Calculate totals
  const totals = comissoes.reduce(
    (acc, c) => ({
      vendas: acc.vendas + c.qtd_vendas,
      mrrTotal: acc.mrrTotal + c.mrr_total,
      comissao: acc.comissao + c.valor_comissao,
      bonusTotal: acc.bonusTotal + c.bonus_anual + c.bonus_meta_equipe + c.bonus_empresa,
      total: acc.total + c.total_receber,
    }),
    { vendas: 0, mrrTotal: 0, comissao: 0, bonusTotal: 0, total: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/comissoes")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-heading font-bold capitalize">
              📊 Fechamento {mesAno}
            </h1>
          </div>
        </div>
        {fechamento.status === "rascunho" ? (
          <Badge variant="outline" className="bg-warning/20 text-warning border-warning text-sm px-3 py-1">
            Rascunho
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-success/20 text-success border-success text-sm px-3 py-1">
            Fechado
          </Badge>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{fechamento.total_vendas}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MRR Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(fechamento.total_mrr)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Meta</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(metaMrr)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {fechamento.meta_batida ? (
              <p className="text-2xl font-bold text-success">✅ Meta Batida</p>
            ) : (
              <p className="text-2xl font-bold text-destructive">❌ Meta Não Batida</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commissions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>💰 Comissões por Vendedor</CardTitle>
          <div className="flex gap-2">
            {fechamento.status === "rascunho" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalculate}
                disabled={isRecalculating}
              >
                {isRecalculating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Recalcular
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingComissoes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : comissoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma comissão calculada ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-center">Vendas</TableHead>
                  <TableHead className="text-right">MRR Faixa</TableHead>
                  <TableHead className="text-center">Faixa</TableHead>
                  <TableHead className="text-center">%</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-right">Bônus</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comissoes.map((comissao, index) => (
                  <TableRow
                    key={comissao.id}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${index % 2 === 0 ? "bg-muted/30" : ""}`}
                    onClick={() => setSelectedComissao(comissao)}
                  >
                    <TableCell className="font-medium">{comissao.vendedor}</TableCell>
                    <TableCell className="text-center">{comissao.qtd_vendas}</TableCell>
                    <TableCell className="text-right">{formatCurrency(comissao.mrr_total)}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={getFaixaColor(comissao.faixa_nome)}
                      >
                        {comissao.faixa_nome || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{formatPercent(comissao.percentual)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(comissao.valor_comissao)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(comissao.bonus_anual + comissao.bonus_meta_equipe + comissao.bonus_empresa)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(comissao.total_receber)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-center">{totals.vendas}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.mrrTotal)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.comissao)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.bonusTotal)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.total)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={handleExport} disabled={comissoes.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Exportar Excel
        </Button>
        {fechamento.status === "rascunho" && (
          <Button
            onClick={() => setCloseDialogOpen(true)}
            style={{ backgroundColor: "#45E5E5", color: "#10293f" }}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Fechar Mês
          </Button>
        )}
      </div>

      {/* Close Month Dialog */}
      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Mês</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja fechar o mês de {mesAno}? Após o fechamento, não será
              possível editar ou excluir os dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => closeMutation.mutate()}
              style={{ backgroundColor: "#45E5E5", color: "#10293f" }}
            >
              Confirmar Fechamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vendor Details Modal */}
      <VendedorDetalhesModal
        open={!!selectedComissao}
        onOpenChange={(open) => !open && setSelectedComissao(null)}
        comissao={selectedComissao}
        mesReferencia={fechamento.mes_referencia}
        metaBatida={fechamento.meta_batida}
      />
    </div>
  );
}
