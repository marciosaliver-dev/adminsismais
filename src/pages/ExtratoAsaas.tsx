import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

interface ImportacaoExtrato {
  id: string;
  created_at: string;
  arquivo_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  total_registros: number;
  registros_novos: number;
  registros_duplicados: number;
  total_creditos: number;
  total_debitos: number;
  saldo_final: number;
  status: string;
  observacao: string | null;
}

interface ExtratoRow {
  transacao_id: string;
  data: string;
  tipo_transacao: string;
  descricao: string;
  valor: number;
  saldo: number;
  fatura_parcelamento: string | null;
  fatura_cobranca: string | null;
  nota_fiscal: string | null;
  tipo_lancamento: string;
}

const ITEMS_PER_PAGE = 10;

export default function ExtratoAsaas() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch histórico de importações
  const { data: importacoes = [], isLoading: isLoadingImportacoes } = useQuery({
    queryKey: ["importacoes-extrato"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("importacoes_extrato")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ImportacaoExtrato[];
    },
  });

  // Paginação
  const totalPages = Math.ceil(importacoes.length / ITEMS_PER_PAGE);
  const paginatedImportacoes = importacoes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith(".csv") || droppedFile.name.endsWith(".xlsx"))) {
      setFile(droppedFile);
    } else {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo CSV ou XLSX.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    try {
      // Formato DD/MM/YYYY
      const parsed = parse(dateStr.trim(), "dd/MM/yyyy", new Date());
      return format(parsed, "yyyy-MM-dd");
    } catch {
      return null;
    }
  };

  const parseValue = (valueStr: string): number => {
    if (!valueStr) return 0;
    // Remove espaços, troca vírgula por ponto
    const cleaned = valueStr.toString().trim().replace(/\s/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const extractPeriodo = (firstRow: string): { inicio: string | null; fim: string | null } => {
    // Tenta extrair datas do formato "Período: DD/MM/YYYY a DD/MM/YYYY" ou similar
    const dateRegex = /(\d{2}\/\d{2}\/\d{4})/g;
    const matches = firstRow.match(dateRegex);
    if (matches && matches.length >= 2) {
      return {
        inicio: parseDate(matches[0]),
        fim: parseDate(matches[1]),
      };
    }
    return { inicio: null, fim: null };
  };

  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as string[][];

      if (rawData.length < 4) {
        throw new Error("Arquivo vazio ou formato inválido");
      }

      // Linha 1: Metadados com período
      const periodoInfo = extractPeriodo(rawData[0]?.join(" ") || "");

      // Linha 3: Cabeçalhos (índice 2)
      // Linha 4+: Dados (índice 3+)
      const dataRows = rawData.slice(3);

      const registrosParaInserir: ExtratoRow[] = [];
      const transacoesIds: string[] = [];
      let totalCreditos = 0;
      let totalDebitos = 0;
      let saldoFinal = 0;

      // Processar cada linha
      for (const row of dataRows) {
        const transacaoId = row[1]?.toString().trim();
        
        // Ignorar linhas sem transação ID ou "Saldo Inicial"
        if (!transacaoId || row[2]?.toString().includes("Saldo Inicial")) {
          continue;
        }

        transacoesIds.push(transacaoId);

        const valor = parseValue(row[5]?.toString());
        const saldo = parseValue(row[6]?.toString());
        const tipoLancamento = row[11]?.toString().trim() || (valor >= 0 ? "Crédito" : "Débito");

        if (tipoLancamento === "Crédito" || valor > 0) {
          totalCreditos += Math.abs(valor);
        } else {
          totalDebitos += Math.abs(valor);
        }

        saldoFinal = saldo;

        registrosParaInserir.push({
          transacao_id: transacaoId,
          data: parseDate(row[0]?.toString()) || format(new Date(), "yyyy-MM-dd"),
          tipo_transacao: row[2]?.toString().trim() || "",
          descricao: row[4]?.toString().trim() || "",
          valor: valor,
          saldo: saldo,
          fatura_parcelamento: row[7]?.toString().trim() || null,
          fatura_cobranca: row[8]?.toString().trim() || null,
          nota_fiscal: row[9]?.toString().trim() || null,
          tipo_lancamento: tipoLancamento,
        });
      }

      // Verificar duplicidades no banco
      const { data: existentes } = await supabase
        .from("extrato_asaas")
        .select("transacao_id")
        .in("transacao_id", transacoesIds);

      const existentesSet = new Set(existentes?.map((e) => e.transacao_id) || []);
      const novosRegistros = registrosParaInserir.filter((r) => !existentesSet.has(r.transacao_id));
      const duplicados = registrosParaInserir.length - novosRegistros.length;

      // Criar registro de importação
      const { data: importacao, error: importError } = await supabase
        .from("importacoes_extrato")
        .insert({
          arquivo_nome: file.name,
          periodo_inicio: periodoInfo.inicio,
          periodo_fim: periodoInfo.fim,
          total_registros: registrosParaInserir.length,
          registros_novos: novosRegistros.length,
          registros_duplicados: duplicados,
          total_creditos: totalCreditos,
          total_debitos: totalDebitos,
          saldo_final: saldoFinal,
          status: "processando",
        })
        .select()
        .single();

      if (importError) throw importError;

      // Inserir registros novos em lote
      if (novosRegistros.length > 0) {
        const { error: insertError } = await supabase.from("extrato_asaas").insert(
          novosRegistros.map((r) => ({
            ...r,
            importacao_id: importacao.id,
          }))
        );

        if (insertError) {
          // Atualizar status para erro
          await supabase
            .from("importacoes_extrato")
            .update({ status: "erro", observacao: insertError.message })
            .eq("id", importacao.id);
          throw insertError;
        }
      }

      // Atualizar status para concluído
      await supabase
        .from("importacoes_extrato")
        .update({ status: "concluido" })
        .eq("id", importacao.id);

      toast({
        title: "Importação concluída!",
        description: `${novosRegistros.length} registros importados, ${duplicados} duplicados ignorados.`,
      });

      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["importacoes-extrato"] });
    } catch (error: any) {
      console.error("Erro ao processar arquivo:", error);
      toast({
        title: "Erro na importação",
        description: error.message || "Ocorreu um erro ao processar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "concluido":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Concluído</Badge>;
      case "erro":
        return <Badge variant="destructive">Erro</Badge>;
      case "processando":
        return <Badge variant="secondary">Processando...</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Extrato Asaas</h1>
          <p className="text-muted-foreground mt-1">
            Importe e analise seus extratos financeiros
          </p>
        </div>

        {/* Upload Section */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Upload de Arquivo</CardTitle>
            <CardDescription>
              Importe extratos no formato CSV ou XLSX exportados do Asaas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
                ${isDragging 
                  ? "border-[#45E5E5] bg-[#45E5E5]/10" 
                  : "border-muted-foreground/30 hover:border-[#45E5E5] hover:bg-muted/50"
                }
              `}
            >
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-foreground font-medium">
                Arraste seu arquivo CSV ou XLSX aqui
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                ou clique para selecionar
              </p>
            </div>

            {/* Selected File Info */}
            {file && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-[#45E5E5]" />
                  <div>
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={processFile}
                  disabled={isProcessing}
                  className="bg-[#45E5E5] hover:bg-[#3cd4d4] text-white"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Processar Importação"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico de Importações */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Importações</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingImportacoes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : importacoes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma importação realizada ainda.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data Import</TableHead>
                        <TableHead>Arquivo</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead className="text-right">Novos</TableHead>
                        <TableHead className="text-right">Duplicados</TableHead>
                        <TableHead className="text-right">Créditos</TableHead>
                        <TableHead className="text-right">Débitos</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedImportacoes.map((imp) => (
                        <TableRow
                          key={imp.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/extrato-asaas/${imp.id}`)}
                        >
                          <TableCell>
                            {format(new Date(imp.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {imp.arquivo_nome}
                          </TableCell>
                          <TableCell>
                            {imp.periodo_inicio && imp.periodo_fim
                              ? `${format(new Date(imp.periodo_inicio + "T12:00:00"), "dd/MM")} - ${format(new Date(imp.periodo_fim + "T12:00:00"), "dd/MM/yy")}`
                              : "-"
                            }
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 font-medium">
                            {imp.registros_novos}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {imp.registros_duplicados}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600">
                            {formatCurrency(imp.total_creditos)}
                          </TableCell>
                          <TableCell className="text-right text-red-500">
                            {formatCurrency(imp.total_debitos)}
                          </TableCell>
                          <TableCell>{getStatusBadge(imp.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a{" "}
                      {Math.min(currentPage * ITEMS_PER_PAGE, importacoes.length)} de{" "}
                      {importacoes.length} importações
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Próximo
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
