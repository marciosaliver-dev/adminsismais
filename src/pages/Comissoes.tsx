import { useState, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Upload, FileText, Loader2, Eye, Download, Trash2, AlertCircle, FileSpreadsheet, ClipboardList } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type FechamentoComissao = Tables<"fechamento_comissao">;

const MESES = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const currentYear = new Date().getFullYear();
const ANOS = [
  { value: String(currentYear), label: String(currentYear) },
  { value: String(currentYear - 1), label: String(currentYear - 1) },
  { value: String(currentYear - 2), label: String(currentYear - 2) },
];

// Required CSV columns
const REQUIRED_COLUMNS = [
  "Data Contrato",
  "Cliente",
  "Vendedor",
  "Valor MRR",
  "Tipo de Venda",
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

// Parse Brazilian number format (1.234,56 → 1234.56)
const parseBrazilianNumber = (value: string): number => {
  if (!value || value.trim() === "") return 0;
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Parse Brazilian date format (DD/MM/YYYY → Date)
const parseBrazilianDate = (value: string): string | null => {
  if (!value || value.trim() === "") return null;
  try {
    const parsed = parse(value.trim(), "dd/MM/yyyy", new Date());
    return format(parsed, "yyyy-MM-dd");
  } catch {
    return null;
  }
};

// Determine flags based on tipo_venda
const getVendaFlags = (tipoVenda: string | null) => {
  const tipo = tipoVenda?.toLowerCase().trim() || "";
  
  if (tipo === "venda direta" || tipo === "upgrade" || tipo === "indicação de cliente") {
    return { conta_comissao: true, conta_faixa: true, conta_meta: true };
  }
  if (tipo === "recuperação de cliente") {
    return { conta_comissao: false, conta_faixa: true, conta_meta: true };
  }
  if (tipo === "afiliado") {
    return { conta_comissao: false, conta_faixa: false, conta_meta: true };
  }
  return { conta_comissao: false, conta_faixa: false, conta_meta: false };
};

// Parse CSV content - handles comma separator with quoted values containing commas
const parseCSV = (content: string): { headers: string[]; rows: Record<string, string>[] } => {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  // Parse a single CSV line handling quoted values
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ""));
    return result;
  };

  const headers = parseLine(lines[0]);
  
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length >= headers.length - 1) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      rows.push(row);
    }
  }
  return { headers, rows };
};

// Validate CSV has required columns
const validateCSVColumns = (headers: string[]): string[] => {
  const missingColumns: string[] = [];
  for (const required of REQUIRED_COLUMNS) {
    if (!headers.some((h) => h.toLowerCase().includes(required.toLowerCase()))) {
      missingColumns.push(required);
    }
  }
  return missingColumns;
};

export default function Comissoes() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFechamento, setDeletingFechamento] = useState<FechamentoComissao | null>(null);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [existingFechamento, setExistingFechamento] = useState<FechamentoComissao | null>(null);

  // Fetch últimos fechamentos
  const { data: fechamentos = [], isLoading } = useQuery({
    queryKey: ["fechamentos_comissao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fechamento_comissao")
        .select("*")
        .order("mes_referencia", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as FechamentoComissao[];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("comissao_calculada").delete().eq("fechamento_id", id);
      await supabase.from("venda_importada").delete().eq("fechamento_id", id);
      const { error } = await supabase.from("fechamento_comissao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fechamentos_comissao"] });
      setDeleteDialogOpen(false);
      setDeletingFechamento(null);
      toast({ title: "✅ Sucesso!", description: "Fechamento excluído com sucesso." });
    },
    onError: () => {
      toast({
        title: "❌ Erro",
        description: "Não foi possível excluir o fechamento.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".csv")) {
        toast({
          title: "❌ Arquivo inválido",
          description: "Por favor, selecione um arquivo CSV.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.endsWith(".csv")) {
        toast({
          title: "❌ Arquivo inválido",
          description: "Por favor, selecione um arquivo CSV.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const checkExistingFechamento = async (): Promise<FechamentoComissao | null> => {
    const mesReferencia = `${selectedYear}-${selectedMonth.padStart(2, "0")}-01`;
    const { data } = await supabase
      .from("fechamento_comissao")
      .select("*")
      .eq("mes_referencia", mesReferencia)
      .maybeSingle();
    return data;
  };

  const processFile = async (replaceExisting = false) => {
    if (!selectedFile || !selectedMonth || !selectedYear) {
      toast({
        title: "⚠️ Campos obrigatórios",
        description: "Selecione mês, ano e arquivo.",
        variant: "destructive",
      });
      return;
    }

    // Check for existing fechamento
    if (!replaceExisting) {
      const existing = await checkExistingFechamento();
      if (existing) {
        setExistingFechamento(existing);
        setReplaceDialogOpen(true);
        return;
      }
    }

    setIsProcessing(true);
    setReplaceDialogOpen(false);

    try {
      // Read file content
      const content = await selectedFile.text();
      const { headers, rows } = parseCSV(content);

      if (rows.length === 0) {
        throw new Error("Arquivo CSV vazio ou formato inválido.");
      }

      // Validate required columns
      const missingColumns = validateCSVColumns(headers);
      if (missingColumns.length > 0) {
        throw new Error(`Colunas obrigatórias não encontradas: ${missingColumns.join(", ")}`);
      }

      // Delete existing if replacing
      if (replaceExisting && existingFechamento) {
        await deleteMutation.mutateAsync(existingFechamento.id);
      }

      // Map columns and create vendas
      const vendas: TablesInsert<"venda_importada">[] = [];
      let totalMrr = 0;

      for (const row of rows) {
        const tipoVenda = row["Tipo de Venda"] || null;
        const flags = getVendaFlags(tipoVenda);
        const valorMrr = parseBrazilianNumber(row["Valor MRR"] || "0");

        if (flags.conta_meta) {
          totalMrr += valorMrr;
        }

        vendas.push({
          fechamento_id: "",
          data_contrato: parseBrazilianDate(row["Data Contrato"]),
          plataforma: row["Plataforma"] || null,
          num_contrato: row["Nº Contrato"] || null,
          cliente: row["Cliente"] || null,
          email: row["Email"] || null,
          plano: row["Plano / Produto"] || null,
          tipo_venda: tipoVenda,
          intervalo: row["Tipo de intervalo"] || null,
          vendedor: row["Vendedor"] || null,
          valor_assinatura: parseBrazilianNumber(row["Valor Assinatura"] || "0"),
          valor_mrr: valorMrr,
          valor_adesao: parseBrazilianNumber(row["Valor Adesão"] || "0"),
          conta_comissao: flags.conta_comissao,
          conta_faixa: flags.conta_faixa,
          conta_meta: flags.conta_meta,
        });
      }

      // Create fechamento
      const mesReferencia = `${selectedYear}-${selectedMonth.padStart(2, "0")}-01`;
      
      const { data: fechamento, error: fechamentoError } = await supabase
        .from("fechamento_comissao")
        .insert([{
          mes_referencia: mesReferencia,
          total_vendas: vendas.length,
          total_mrr: totalMrr,
          status: "rascunho",
          arquivo_nome: selectedFile.name,
        }])
        .select()
        .single();

      if (fechamentoError) throw fechamentoError;

      // Insert vendas with fechamento_id
      const vendasWithId = vendas.map((v) => ({
        ...v,
        fechamento_id: fechamento.id,
      }));

      // Insert in batches of 100
      for (let i = 0; i < vendasWithId.length; i += 100) {
        const batch = vendasWithId.slice(i, i + 100);
        const { error: vendasError } = await supabase
          .from("venda_importada")
          .insert(batch);
        if (vendasError) throw vendasError;
      }

      // Chamar edge function para calcular comissões
      const { error: calcError } = await supabase.functions.invoke(
        "calcular-comissoes",
        {
          body: { fechamento_id: fechamento.id },
        }
      );

      if (calcError) {
        toast({
          title: "⚠️ Aviso",
          description: "Vendas importadas, mas houve erro ao calcular comissões. Você pode recalcular na página de detalhes.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "✅ Sucesso!",
          description: `${vendas.length} vendas importadas e comissões calculadas.`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["fechamentos_comissao"] });
      setSelectedFile(null);
      setSelectedMonth("");
      setExistingFechamento(null);
      
      // Navigate to fechamento detail
      navigate(`/comissoes/fechamento/${fechamento.id}`);
      
    } catch (error: any) {
      toast({
        title: "❌ Erro ao processar",
        description: error.message || "Ocorreu um erro ao processar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openDeleteDialog = (fechamento: FechamentoComissao) => {
    setDeletingFechamento(fechamento);
    setDeleteDialogOpen(true);
  };

  const formatMesAno = (date: string) => {
    const d = new Date(date);
    return format(d, "MMMM/yyyy", { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold">💰 Comissões</h1>
        <p className="text-muted-foreground mt-1">
          Fechamento mensal de comissões da equipe
        </p>
      </div>

      {/* Card: Novo Fechamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Novo Fechamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seletores */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Mês</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border">
                  {MESES.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Ano</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
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
          </div>

          {/* Upload Area */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2 text-primary">
                <FileText className="w-6 h-6" />
                <span className="font-medium">{selectedFile.name}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  Arraste o arquivo CSV ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground">
                  Colunas obrigatórias: {REQUIRED_COLUMNS.join(", ")}
                </p>
              </div>
            )}
          </div>

          {/* Process Button */}
          <Button
            onClick={() => processFile(false)}
            disabled={!selectedFile || !selectedMonth || isProcessing}
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Processando...
              </>
            ) : (
              "PROCESSAR ARQUIVO"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Card: Últimos Fechamentos */}
      <Card>
        <CardHeader>
          <CardTitle>📅 Últimos Fechamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton columns={6} rows={5} />
          ) : fechamentos.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium">
                Nenhum fechamento realizado ainda
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Importe seu primeiro arquivo CSV para começar
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês/Ano</TableHead>
                    <TableHead className="text-right">MRR Total</TableHead>
                    <TableHead className="text-center">Vendas</TableHead>
                    <TableHead className="text-center">Meta</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fechamentos.map((fechamento, index) => (
                    <TableRow key={fechamento.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                      <TableCell className="font-medium capitalize">
                        {formatMesAno(fechamento.mes_referencia)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(fechamento.total_mrr)}</TableCell>
                      <TableCell className="text-center">{fechamento.total_vendas}</TableCell>
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
                            variant="outline"
                            size="icon"
                            onClick={() => navigate(`/comissoes/relatorio-vendas?fechamento=${fechamento.id}`)}
                            title="Ver Vendas"
                          >
                            <ClipboardList className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigate(`/comissoes/fechamento/${fechamento.id}`)}
                            title="Ver Detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {fechamento.status === "rascunho" && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog(fechamento)}
                              title="Excluir"
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o fechamento de{" "}
              <strong className="capitalize">
                {deletingFechamento && formatMesAno(deletingFechamento.mes_referencia)}
              </strong>?
              Esta ação excluirá todas as vendas e comissões associadas e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingFechamento && deleteMutation.mutate(deletingFechamento.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Replace Dialog */}
      <AlertDialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-warning" />
              Fechamento já existe
            </AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um fechamento para{" "}
              <strong className="capitalize">
                {existingFechamento && formatMesAno(existingFechamento.mes_referencia)}
              </strong>.
              Deseja substituí-lo? Isso excluirá o fechamento anterior e todas as suas vendas e comissões.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-warning text-warning-foreground hover:bg-warning/90"
              onClick={() => processFile(true)}
            >
              Substituir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
