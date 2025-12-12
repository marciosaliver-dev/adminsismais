import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Eye, Download, Trash2, Loader2, Filter } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import type { Tables } from "@/integrations/supabase/types";

type FechamentoComissao = Tables<"fechamento_comissao">;
type ComissaoCalculada = Tables<"comissao_calculada">;
type ConfiguracaoComissao = Tables<"configuracao_comissao">;
type FaixaComissao = Tables<"faixa_comissao">;
type VendaImportada = Tables<"venda_importada">;

const ITEMS_PER_PAGE = 10;

const currentYear = new Date().getFullYear();
const ANOS = [
  { value: "todos", label: "Todos" },
  { value: String(currentYear), label: String(currentYear) },
  { value: String(currentYear - 1), label: String(currentYear - 1) },
  { value: String(currentYear - 2), label: String(currentYear - 2) },
];

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "rascunho", label: "Rascunho" },
  { value: "fechado", label: "Fechado" },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function HistoricoComissoes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filterYear, setFilterYear] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [appliedYear, setAppliedYear] = useState("todos");
  const [appliedStatus, setAppliedStatus] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFechamento, setDeletingFechamento] = useState<FechamentoComissao | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  // Fetch fechamentos
  const { data: fechamentos = [], isLoading } = useQuery({
    queryKey: ["historico_fechamentos", appliedYear, appliedStatus],
    queryFn: async () => {
      let query = supabase
        .from("fechamento_comissao")
        .select("*")
        .order("mes_referencia", { ascending: false });

      if (appliedYear !== "todos") {
        query = query
          .gte("mes_referencia", `${appliedYear}-01-01`)
          .lte("mes_referencia", `${appliedYear}-12-31`);
      }

      if (appliedStatus !== "todos") {
        query = query.eq("status", appliedStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FechamentoComissao[];
    },
  });

  // Fetch configurações e faixas para exportação
  const { data: configuracoes = [] } = useQuery({
    queryKey: ["configuracao_comissao"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracao_comissao").select("*");
      if (error) throw error;
      return data as ConfiguracaoComissao[];
    },
  });

  const { data: faixas = [] } = useQuery({
    queryKey: ["faixas_comissao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faixa_comissao")
        .select("*")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data as FaixaComissao[];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete comissoes first
      await supabase.from("comissao_calculada").delete().eq("fechamento_id", id);
      // Delete vendas
      await supabase.from("venda_importada").delete().eq("fechamento_id", id);
      // Delete fechamento
      const { error } = await supabase.from("fechamento_comissao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["historico_fechamentos"] });
      setDeleteDialogOpen(false);
      setDeletingFechamento(null);
      toast({ title: "Sucesso!", description: "Fechamento excluído." });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o fechamento.",
        variant: "destructive",
      });
    },
  });

  const handleFilter = () => {
    setAppliedYear(filterYear);
    setAppliedStatus(filterStatus);
    setCurrentPage(1);
  };

  const handleExport = async (fechamento: FechamentoComissao) => {
    setExportingId(fechamento.id);

    try {
      // Fetch comissões
      const { data: comissoes = [] } = await supabase
        .from("comissao_calculada")
        .select("*")
        .eq("fechamento_id", fechamento.id)
        .order("total_receber", { ascending: false });

      // Fetch vendas
      const { data: vendas = [] } = await supabase
        .from("venda_importada")
        .select("*")
        .eq("fechamento_id", fechamento.id)
        .order("data_contrato", { ascending: false });

      const mesAnoRef = format(new Date(fechamento.mes_referencia), "MMMM/yyyy", { locale: ptBR });
      const mesAnoFile = format(new Date(fechamento.mes_referencia), "yyyy-MM");

      // ABA 1: RESUMO
      const resumoData: (string | number)[][] = [
        ["Fechamento de Comissões"],
        [mesAnoRef],
        [],
        ["Total de Vendas:", fechamento.total_vendas],
        ["MRR Total:", fechamento.total_mrr],
        ["Meta Batida:", fechamento.meta_batida ? "Sim" : "Não"],
        ["Data Processamento:", format(new Date(fechamento.data_importacao), "dd/MM/yyyy HH:mm")],
        [],
        ["Vendedor", "Qtd Vendas", "MRR Faixa", "Faixa", "%", "Comissão Base", "Bônus Anual", "Bônus Meta", "Bônus Empresa", "TOTAL"],
      ];

      const totalsExport = { vendas: 0, mrrFaixa: 0, comissaoBase: 0, bonusAnual: 0, bonusMeta: 0, bonusEmpresa: 0, total: 0 };

      (comissoes as ComissaoCalculada[]).forEach((c) => {
        resumoData.push([
          c.vendedor,
          c.qtd_vendas,
          c.mrr_total,
          c.faixa_nome || "-",
          c.percentual,
          c.valor_comissao,
          c.bonus_anual,
          c.bonus_meta_equipe,
          c.bonus_empresa,
          c.total_receber,
        ]);
        totalsExport.vendas += c.qtd_vendas;
        totalsExport.mrrFaixa += c.mrr_total;
        totalsExport.comissaoBase += c.valor_comissao;
        totalsExport.bonusAnual += c.bonus_anual;
        totalsExport.bonusMeta += c.bonus_meta_equipe;
        totalsExport.bonusEmpresa += c.bonus_empresa;
        totalsExport.total += c.total_receber;
      });

      resumoData.push([
        "TOTAL",
        totalsExport.vendas,
        totalsExport.mrrFaixa,
        "-",
        "-",
        totalsExport.comissaoBase,
        totalsExport.bonusAnual,
        totalsExport.bonusMeta,
        totalsExport.bonusEmpresa,
        totalsExport.total,
      ]);

      // ABA 2: VENDAS
      const vendasData: (string | number | boolean)[][] = [
        ["Data", "Plataforma", "Contrato", "Cliente", "Email", "Plano", "Tipo Venda", "Intervalo", "Vendedor", "Assinatura", "MRR", "Adesão", "Conta Comissão", "Conta Faixa"],
      ];

      (vendas as VendaImportada[]).forEach((v) => {
        vendasData.push([
          v.data_contrato ? format(new Date(v.data_contrato), "dd/MM/yyyy") : "-",
          v.plataforma || "-",
          v.num_contrato || "-",
          v.cliente || "-",
          v.email || "-",
          v.plano || "-",
          v.tipo_venda || "-",
          v.intervalo || "-",
          v.vendedor || "-",
          v.valor_assinatura,
          v.valor_mrr,
          v.valor_adesao,
          v.conta_comissao ? "Sim" : "Não",
          v.conta_faixa ? "Sim" : "Não",
        ]);
      });

      // ABA 3: CONFIGURAÇÕES
      const configData: (string | number)[][] = [
        ["CONFIGURAÇÕES"],
        [],
        ["Configuração", "Valor"],
      ];

      configuracoes.forEach((c) => {
        configData.push([c.chave, c.valor]);
      });

      configData.push([]);
      configData.push(["FAIXAS DE COMISSÃO"]);
      configData.push([]);
      configData.push(["Faixa", "MRR Mín", "MRR Máx", "Percentual"]);

      faixas.forEach((f) => {
        configData.push([f.nome, f.mrr_min, f.mrr_max || "Ilimitado", f.percentual]);
      });

      // Criar workbook
      const wb = XLSX.utils.book_new();

      const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
      wsResumo["!cols"] = [
        { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 8 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      ];
      XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

      const wsVendas = XLSX.utils.aoa_to_sheet(vendasData);
      wsVendas["!cols"] = [
        { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 25 },
        { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
      ];
      XLSX.utils.book_append_sheet(wb, wsVendas, "Vendas");

      const wsConfig = XLSX.utils.aoa_to_sheet(configData);
      wsConfig["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsConfig, "Configurações");

      XLSX.writeFile(wb, `comissoes_${mesAnoFile}.xlsx`);

      toast({ title: "Exportado!", description: "Arquivo Excel gerado com sucesso." });
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível exportar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setExportingId(null);
    }
  };

  const formatMesAno = (date: string) => {
    const d = new Date(date);
    return format(d, "MMMM/yyyy", { locale: ptBR });
  };

  const formatDataImport = (date: string) => {
    const d = new Date(date);
    return format(d, "dd/MM/yyyy HH:mm");
  };

  // Pagination
  const totalPages = Math.ceil(fechamentos.length / ITEMS_PER_PAGE);
  const paginatedFechamentos = fechamentos.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold">📋 Histórico de Fechamentos</h1>
        <p className="text-muted-foreground mt-1">
          Visualize e gerencie todos os fechamentos de comissões
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Ano</label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border">
                  {ANOS.map((ano) => (
                    <SelectItem key={ano.value} value={ano.value}>
                      {ano.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border">
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleFilter} className="flex-shrink-0">
              <Filter className="w-4 h-4 mr-2" />
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : fechamentos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum fechamento encontrado
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês/Ano</TableHead>
                    <TableHead>Data Import</TableHead>
                    <TableHead className="text-center">Vendas</TableHead>
                    <TableHead className="text-right">MRR Total</TableHead>
                    <TableHead className="text-center">Meta</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedFechamentos.map((fechamento, index) => (
                    <TableRow
                      key={fechamento.id}
                      className={index % 2 === 0 ? "bg-muted/30" : ""}
                    >
                      <TableCell className="font-medium capitalize">
                        {formatMesAno(fechamento.mes_referencia)}
                      </TableCell>
                      <TableCell>{formatDataImport(fechamento.data_importacao)}</TableCell>
                      <TableCell className="text-center">{fechamento.total_vendas}</TableCell>
                      <TableCell className="text-right">{formatCurrency(fechamento.total_mrr)}</TableCell>
                      <TableCell className="text-center">
                        {fechamento.meta_batida ? (
                          <span className="text-lg">✅</span>
                        ) : (
                          <span className="text-lg">❌</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {fechamento.status === "rascunho" ? (
                          <Badge variant="outline" className="bg-warning/20 text-warning border-warning">
                            Rascunho
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-success/20 text-success border-success">
                            Fechado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/comissoes/fechamento/${fechamento.id}`)}
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExport(fechamento)}
                            disabled={exportingId === fechamento.id}
                            title="Exportar Excel"
                          >
                            {exportingId === fechamento.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                          {fechamento.status === "rascunho" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeletingFechamento(fechamento);
                                setDeleteDialogOpen(true);
                              }}
                              title="Excluir"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fechamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá excluir o fechamento de{" "}
              <strong className="capitalize">
                {deletingFechamento && formatMesAno(deletingFechamento.mes_referencia)}
              </strong>
              , incluindo todas as vendas e comissões associadas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingFechamento && deleteMutation.mutate(deletingFechamento.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
