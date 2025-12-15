import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type ComissaoCalculada = Tables<"comissao_calculada">;
type VendaImportada = Tables<"venda_importada">;
type ConfiguracaoComissao = Tables<"configuracao_comissao">;

interface VendedorDetalhesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comissao: ComissaoCalculada | null;
  mesReferencia: string;
  metaBatida: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const getFaixaEmoji = (faixaNome: string | null) => {
  const nome = faixaNome?.toLowerCase() || "";
  if (nome.includes("início")) return "🔴";
  if (nome.includes("em ação")) return "🟠";
  if (nome.includes("starter")) return "🟡";
  if (nome.includes("pro")) return "🔵";
  if (nome.includes("elite i") && !nome.includes("elite ii")) return "🟢";
  if (nome.includes("elite ii")) return "⭐";
  if (nome.includes("lenda")) return "⭐";
  return "⚪";
};

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

export default function VendedorDetalhesModal({
  open,
  onOpenChange,
  comissao,
  mesReferencia,
  metaBatida,
}: VendedorDetalhesModalProps) {
  // Fetch vendas do vendedor
  const { data: vendas = [], isLoading: loadingVendas } = useQuery({
    queryKey: ["vendas_vendedor", comissao?.fechamento_id, comissao?.vendedor],
    queryFn: async () => {
      if (!comissao) return [];
      const { data, error } = await supabase
        .from("venda_importada")
        .select("*")
        .eq("fechamento_id", comissao.fechamento_id)
        .eq("vendedor", comissao.vendedor)
        .order("data_contrato", { ascending: false });
      if (error) throw error;
      return data as VendaImportada[];
    },
    enabled: !!comissao && open,
  });

  // Fetch configurações para número de colaboradores
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

  const numColaboradores = parseInt(configuracoes.find((c) => c.chave === "num_colaboradores")?.valor || "12");

  if (!comissao) return null;

  // Agrupar vendas por tipo
  const vendasPorTipo = vendas.reduce((acc, venda) => {
    const tipo = venda.tipo_venda || "Outros";
    if (!acc[tipo]) {
      acc[tipo] = { vendas: [], totalMrr: 0, contaComissao: true };
    }
    acc[tipo].vendas.push(venda);
    acc[tipo].totalMrr += venda.valor_mrr;
    // Verificar se conta comissão baseado na primeira venda do tipo
    if (!venda.conta_comissao) {
      acc[tipo].contaComissao = false;
    }
    return acc;
  }, {} as Record<string, { vendas: VendaImportada[]; totalMrr: number; contaComissao: boolean }>);

  // Calcular MRR anual (vendas com intervalo Anual que contam comissão)
  const mrrAnual = vendas
    .filter((v) => v.intervalo === "Anual" && v.conta_comissao)
    .reduce((acc, v) => acc + v.valor_mrr, 0);

  // Calcular total adesão
  const totalAdesao = vendas
    .filter((v) => v.conta_comissao)
    .reduce((acc, v) => acc + v.valor_adesao, 0);

  const mesAnoFormatado = format(new Date(mesReferencia), "MMMM/yyyy", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {comissao.vendedor}
          </DialogTitle>
          <p className="text-muted-foreground capitalize">{mesAnoFormatado}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Card Resumo */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">📊 Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Vendas</p>
                  <p className="text-2xl font-bold">{comissao.qtd_vendas}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">MRR para Faixa</p>
                  <p className="text-2xl font-bold">{formatCurrency(comissao.mrr_total)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Faixa Alcançada</p>
                  <Badge variant="outline" className={`text-lg ${getFaixaColor(comissao.faixa_nome)}`}>
                    {getFaixaEmoji(comissao.faixa_nome)} {comissao.faixa_nome || "-"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">MRR para Comissão</p>
                  <p className="text-2xl font-bold">{formatCurrency(comissao.mrr_comissao)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Breakdown da Comissão */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">💰 Breakdown da Comissão</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Cálculo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Comissão Base</TableCell>
                    <TableCell className="text-muted-foreground">
                      {comissao.percentual}% de {formatCurrency(comissao.mrr_comissao)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(comissao.valor_comissao)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Bônus Vendas Anuais</TableCell>
                    <TableCell className="text-muted-foreground">
                      {comissao.percentual}% de {formatCurrency(mrrAnual)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(comissao.bonus_anual)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Bônus Meta Equipe</TableCell>
                    <TableCell className="text-muted-foreground">
                      {metaBatida ? "10% proporcional" : "(meta não batida)"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {metaBatida ? formatCurrency(comissao.bonus_meta_equipe) : (
                        <span className="text-muted-foreground">R$ 0,00</span>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Bônus Empresa</TableCell>
                    <TableCell className="text-muted-foreground">
                      {metaBatida ? `10% / ${numColaboradores} colaboradores` : "(meta não batida)"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {metaBatida ? formatCurrency(comissao.bonus_empresa) : (
                        <span className="text-muted-foreground">R$ 0,00</span>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Comissão Venda Única (Adesão)</TableCell>
                    <TableCell className="text-muted-foreground">
                      10% de {formatCurrency(totalAdesao)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency((comissao as any).comissao_venda_unica || 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell className="font-bold">TOTAL A RECEBER</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {formatCurrency(comissao.total_receber)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Seção Vendas do Período */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">📋 Vendas do Período</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingVendas ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : Object.keys(vendasPorTipo).length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma venda encontrada.
                </p>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {Object.entries(vendasPorTipo).map(([tipo, dados]) => (
                    <AccordionItem key={tipo} value={tipo}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{tipo}</span>
                          <span className="text-muted-foreground">
                            ({dados.vendas.length} vendas) - {formatCurrency(dados.totalMrr)}
                          </span>
                          {!dados.contaComissao && (
                            <span className="text-xs text-muted-foreground italic">
                              (não conta para comissão)
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Plano</TableHead>
                              <TableHead>Intervalo</TableHead>
                              <TableHead className="text-right">MRR</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dados.vendas.map((venda) => (
                              <TableRow
                                key={venda.id}
                                className={!venda.conta_comissao ? "text-muted-foreground" : ""}
                              >
                                <TableCell>
                                  {venda.data_contrato
                                    ? format(new Date(venda.data_contrato), "dd/MM/yyyy")
                                    : "-"}
                                </TableCell>
                                <TableCell>{venda.cliente || "-"}</TableCell>
                                <TableCell>{venda.plano || "-"}</TableCell>
                                <TableCell>{venda.intervalo || "-"}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(venda.valor_mrr)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
