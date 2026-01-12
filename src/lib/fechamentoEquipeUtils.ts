const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function gerarDemonstrativoHTML(dados: {
  nome: string;
  cargo: string | null;
  salarioBase: number;
  mesReferencia: string;
  churnRate: number;
  taxaCancelamentos: number;
  percentualMeta: number;
  bonusChurnLiberado: boolean;
  bonusRetencaoLiberado: boolean;
  bonusMetaLiberado: boolean;
  bonusChurn: number;
  bonusRetencao: number;
  bonusMetaEquipe: number;
  subtotalBonusEquipe: number;
  vendasServicos: any[];
  percentualComissao: number;
  comissaoServicos: number;
  metasAtingidas: any[];
  totalBonusMetas: number;
  totalAReceber: number;
  mrrBaseComissao: number;
  percentualBonusMeta: number;
  percentualBonusChurn: number;
  percentualBonusRetencao: number;
}) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="margin: 0;">DEMONSTRATIVO DE FECHAMENTO</h2>
        <p style="margin: 5px 0; text-transform: capitalize;">${dados.mesReferencia}</p>
      </div>

      <div style="margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 8px;">
        <p style="margin: 5px 0;"><strong>Colaborador:</strong> ${dados.nome}</p>
        <p style="margin: 5px 0;"><strong>Cargo:</strong> ${dados.cargo || '-'}</p>
        <p style="margin: 5px 0;"><strong>Salário Base:</strong> ${formatCurrency(dados.salarioBase)}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 2px solid #333; padding-bottom: 5px;">📊 INDICADORES DO MÊS</h3>
        <p>Churn Rate: ${dados.churnRate.toFixed(1)}% ${dados.bonusChurnLiberado ? '✅' : '❌'}</p>
        <p>Taxa Retenção (Cancel/Vendas): ${dados.taxaCancelamentos.toFixed(1)}% ${dados.bonusRetencaoLiberado ? '✅' : '❌'}</p>
        <p>Meta de Vendas: ${dados.percentualMeta.toFixed(0)}% ${dados.bonusMetaLiberado ? '✅' : '❌'}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 2px solid #333; padding-bottom: 5px;">💰 BÔNUS DE EQUIPE</h3>
        <div style="margin-bottom: 10px; padding: 8px; background: #e3f2fd; border-radius: 4px;">
          <p style="margin: 0; font-size: 12px; color: #1565c0;"><strong>MRR Base Comissão:</strong> ${formatCurrency(dados.mrrBaseComissao)}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0;">Bônus Churn (${dados.percentualBonusChurn}% do salário)</td>
            <td style="text-align: right;">${formatCurrency(dados.bonusChurn)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">Bônus Retenção (${dados.percentualBonusRetencao}% do salário)</td>
            <td style="text-align: right;">${formatCurrency(dados.bonusRetencao)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">Bônus Meta (${dados.percentualBonusMeta}% MRR Base - rateado)</td>
            <td style="text-align: right;">${formatCurrency(dados.bonusMetaEquipe)}</td>
          </tr>
          <tr style="font-weight: bold; border-top: 1px solid #ccc;">
            <td style="padding: 5px 0;">Subtotal Bônus Equipe:</td>
            <td style="text-align: right;">${formatCurrency(dados.subtotalBonusEquipe)}</td>
          </tr>
        </table>
      </div>

      ${dados.vendasServicos.length > 0 ? `
      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 2px solid #333; padding-bottom: 5px;">🛠️ COMISSÃO SOBRE SERVIÇOS (${dados.percentualComissao}%)</h3>
        <p style="margin-bottom: 10px; font-size: 13px; color: #666;">
          Valor Total de Serviços Vendidos: <strong>${formatCurrency(dados.vendasServicos.reduce((sum: number, v: any) => sum + v.valor_servico, 0))}</strong>
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Cliente</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Serviço</th>
              <th style="padding: 8px; text-align: right; border-bottom: 1px solid #ddd;">Valor</th>
              <th style="padding: 8px; text-align: right; border-bottom: 1px solid #ddd;">Comissão</th>
            </tr>
          </thead>
          <tbody>
          ${dados.vendasServicos.map((v: any) => `
            <tr>
              <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${v.cliente || '-'}</td>
              <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${v.descricao_servico || '-'}</td>
              <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #eee;">${formatCurrency(v.valor_servico)}</td>
              <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #eee;">${formatCurrency(v.valor_servico * (dados.percentualComissao / 100))}</td>
            </tr>
          `).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background: #e8f5e9;">
              <td colspan="3" style="padding: 8px;">Subtotal Comissão Serviços:</td>
              <td style="text-align: right; padding: 8px;">${formatCurrency(dados.comissaoServicos)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      ` : ''}

      ${dados.metasAtingidas.length > 0 ? `
      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 2px solid #333; padding-bottom: 5px;">🎯 METAS INDIVIDUAIS</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${dados.metasAtingidas.map(m => `
            <tr>
              <td style="padding: 5px 0;">✅ Meta atingida</td>
              <td style="text-align: right;">${formatCurrency(m.valor_bonus)}</td>
            </tr>
          `).join('')}
          <tr style="font-weight: bold; border-top: 1px solid #ccc;">
            <td style="padding: 5px 0;">Subtotal Metas:</td>
            <td style="text-align: right;">${formatCurrency(dados.totalBonusMetas)}</td>
          </tr>
        </table>
      </div>
      ` : ''}

      <div style="margin-top: 30px; padding: 15px; background: #e8f5e9; border-radius: 8px; text-align: center;">
        <h2 style="margin: 0; color: #2e7d32;">TOTAL A RECEBER: ${formatCurrency(dados.totalAReceber)}</h2>
      </div>

      <p style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
        Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
      </p>
    </div>
  `;
}