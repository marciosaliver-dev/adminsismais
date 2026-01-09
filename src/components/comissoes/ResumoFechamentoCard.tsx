import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

type ComissaoCalculada = Tables<"comissao_calculada">;

interface AjusteComissao {
  id: string;
  vendedor: string;
  tipo: string;
  valor: number;
  descricao: string;
}

interface ResumoFechamentoCardProps {
  comissoes: ComissaoCalculada[];
  ajustes: AjusteComissao[];
  metaBatida: boolean;
  bonusEmpresaTotal: number;
  totalColaboradores: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function ResumoFechamentoCard({
  comissoes,
  ajustes,
  metaBatida,
  bonusEmpresaTotal,
  totalColaboradores,
}: ResumoFechamentoCardProps) {
  // Calcular totais
  const totals = comissoes.reduce(
    (acc, c) => ({
      vendas: acc.vendas + c.qtd_vendas,
      mrrTotal: acc.mrrTotal + c.mrr_total,
      comissaoBase: acc.comissaoBase + c.valor_comissao,
      bonusAnual: acc.bonusAnual + c.bonus_anual,
      bonusMetaEquipe: acc.bonusMetaEquipe + c.bonus_meta_equipe,
      bonusEmpresa: acc.bonusEmpresa + c.bonus_empresa,
      vendaUnica: acc.vendaUnica + c.comissao_venda_unica,
      totalReceber: acc.totalReceber + c.total_receber,
    }),
    {
      vendas: 0,
      mrrTotal: 0,
      comissaoBase: 0,
      bonusAnual: 0,
      bonusMetaEquipe: 0,
      bonusEmpresa: 0,
      vendaUnica: 0,
      totalReceber: 0,
    }
  );

  // Calcular ajustes
  const totalCreditos = ajustes
    .filter((a) => a.tipo === "credito")
    .reduce((acc, a) => acc + a.valor, 0);

  const totalDebitos = ajustes
    .filter((a) => a.tipo === "debito")
    .reduce((acc, a) => acc + a.valor, 0);

  const totalAjustes = totalCreditos - totalDebitos;

  // Calcular bônus empresa rateado
  const bonusEmpresaIndividual = metaBatida && totalColaboradores > 0
    ? bonusEmpresaTotal / totalColaboradores
    : 0;

  // Total geral
  const totalGeral = totals.totalReceber + totalAjustes;

  return (
    <Card className="bg-gradient-to-br from-card to-muted/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📋 Resumo do Fechamento
          {metaBatida ? (
            <Badge className="bg-success/20 text-success border-success">
              Meta Batida
            </Badge>
          ) : (
            <Badge variant="destructive">Meta Não Batida</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Coluna 1: Vendas e MRR */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Vendas
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total de Vendas:</span>
                <span className="font-medium">{totals.vendas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">MRR Total:</span>
                <span className="font-medium">{formatCurrency(totals.mrrTotal)}</span>
              </div>
            </div>
          </div>

          {/* Coluna 2: Comissões */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Comissões
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Comissão Base:</span>
                <span className="font-medium">{formatCurrency(totals.comissaoBase)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Venda Única:</span>
                <span className="font-medium">{formatCurrency(totals.vendaUnica)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bônus Anual:</span>
                <span className="font-medium">{formatCurrency(totals.bonusAnual)}</span>
              </div>
            </div>
          </div>

          {/* Coluna 3: Bônus Meta */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Bônus Meta Empresa
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bônus Total:</span>
                <span className="font-medium">{formatCurrency(bonusEmpresaTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Colaboradores:</span>
                <span className="font-medium">{totalColaboradores}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor por Pessoa:</span>
                <span className="font-semibold text-success">
                  {formatCurrency(bonusEmpresaIndividual)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Ajustes Manuais */}
        {ajustes.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
              Ajustes Manuais
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Créditos:</span>
                <span className="font-medium text-success">
                  +{formatCurrency(totalCreditos)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Débitos:</span>
                <span className="font-medium text-destructive">
                  -{formatCurrency(totalDebitos)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo Ajustes:</span>
                <span
                  className={`font-semibold ${
                    totalAjustes >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {formatCurrency(totalAjustes)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Total Geral */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total Geral a Pagar:</span>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(totalGeral)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
