import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Save, Loader2 } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query";

interface ConfiguracaoBase {
  assinaturasInicioMes: number;
  cancelamentosMes: number;
  limiteChurn: number;
  limiteCancelamentos: number;
  percentualBonusChurn: number;
  percentualBonusRetencao: number;
  percentualBonusMeta: number;
  metaVendas: number;
}

interface FechamentoEquipe {
  id: string;
  assinaturas_inicio_mes: number | null;
  cancelamentos_mes: number | null;
  limite_churn: number | null;
  limite_cancelamentos: number | null;
  percentual_bonus_churn: number | null;
  percentual_bonus_retencao: number | null;
  percentual_bonus_meta: number | null;
  meta_vendas: number | null;
}

interface MetaMensal {
  assinaturas_inicio_mes: number | null;
  limite_churn: number | null;
  limite_cancelamentos: number | null;
  percentual_bonus_churn: number | null;
  percentual_bonus_retencao: number | null;
  bonus_meta_equipe: number | null;
  meta_quantidade: number | null;
}

interface DadosCalculo {
  meta: MetaMensal | null;
  fechamentoComissao: {
    total_mrr: number | null;
    total_vendas: number | null;
  } | null;
  mrrBaseComissao: number;
  totalComissoesVendedores: number;
  qtdVendasRecorrentes: number;
}

interface FechamentoConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configBase: ConfiguracaoBase;
  setConfigBase: React.Dispatch<React.SetStateAction<ConfiguracaoBase>>;
  dadosCalculo: DadosCalculo | undefined;
  fechamento: FechamentoEquipe | null | undefined;
  salvarConfigMutation: UseMutationResult<any, Error, void, unknown>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
};

export function FechamentoConfigModal({
  open,
  onOpenChange,
  configBase,
  setConfigBase,
  dadosCalculo,
  fechamento,
  salvarConfigMutation,
}: FechamentoConfigModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Parâmetros do Fechamento</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {dadosCalculo?.meta && (
            <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg">
              <p className="text-sm">
                <strong>💡 Parâmetros carregados da Meta Mensal</strong>
                <br />
                <span className="text-muted-foreground">
                  Estes valores foram definidos em Configurações &gt; Metas Mensais. 
                  Você pode sobrescrevê-los aqui para este fechamento específico.
                </span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Clientes no Início do Mês</Label>
              <Input
                type="number"
                value={configBase.assinaturasInicioMes}
                onChange={(e) => setConfigBase({ ...configBase, assinaturasInicioMes: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Quantidade de Cancelamentos</Label>
              <Input
                type="number"
                value={configBase.cancelamentosMes}
                onChange={(e) => setConfigBase({ ...configBase, cancelamentosMes: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Metas de Churn e Retenção</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Limite Churn (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={configBase.limiteChurn}
                  onChange={(e) => setConfigBase({ ...configBase, limiteChurn: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Bônus liberado se churn &lt; este limite</p>
              </div>
              <div className="space-y-2">
                <Label>Limite Cancelamentos (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={configBase.limiteCancelamentos}
                  onChange={(e) => setConfigBase({ ...configBase, limiteCancelamentos: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Cancelamentos &lt; % das vendas</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Meta de Vendas</h4>
            <div className="space-y-2">
              <Label>Meta de Vendas (quantidade)</Label>
              <Input
                type="number"
                value={configBase.metaVendas}
                onChange={(e) => setConfigBase({ ...configBase, metaVendas: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Percentuais de Bônus</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>% Bônus Churn</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={configBase.percentualBonusChurn}
                  onChange={(e) => setConfigBase({ ...configBase, percentualBonusChurn: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>% Bônus Retenção</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={configBase.percentualBonusRetencao}
                  onChange={(e) => setConfigBase({ ...configBase, percentualBonusRetencao: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>% Bônus Meta</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={configBase.percentualBonusMeta}
                  onChange={(e) => setConfigBase({ ...configBase, percentualBonusMeta: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {dadosCalculo && (
            <div className="border-t pt-4 bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-3">📊 Dados Importados do Fechamento de Comissões</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Vendas Recorrentes: <strong>{dadosCalculo.qtdVendasRecorrentes}</strong></div>
                <div>MRR Base Comissão: <strong>{formatCurrency(dadosCalculo.mrrBaseComissao)}</strong></div>
                <div>Total Comissões: <strong>{formatCurrency(dadosCalculo.totalComissoesVendedores)}</strong></div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => salvarConfigMutation.mutate()} disabled={salvarConfigMutation.isPending}>
            {salvarConfigMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Salvar Configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}