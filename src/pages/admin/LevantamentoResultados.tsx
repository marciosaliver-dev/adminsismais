"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from "recharts";
import { 
  Download, Loader2, Users, Heart, Star, Rocket, LayoutGrid, 
  MessageSquare, TrendingUp, Search, Filter, ExternalLink, Brain
} from "lucide-react";
import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGate } from "@/components/auth/PermissionGate";
import type { Tables } from "@/integrations/supabase/types";

const COLORS = ['#45E5E5', '#10293F', '#FFD700', '#FF8042', '#00C49F', '#FFBB28'];

// Usando a tipagem completa da tabela
type LevantamentoRow = Tables<"levantamento_operacional_2024">;

export default function LevantamentoResultados() {
  const { isAdmin } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: respostas = [], isLoading } = useQuery({
    queryKey: ["levantamento-resultados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("levantamento_operacional_2024")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as LevantamentoRow[];
    },
    enabled: isAdmin,
  });

  const stats = useMemo(() => {
    if (respostas.length === 0) return null;

    const validRespostas = respostas.filter(r => r.satisfacao_trabalho !== null);

    const avgSatisfacao = validRespostas.reduce((acc, r) => acc + (r.satisfacao_trabalho || 0), 0) / validRespostas.length;
    
    const avgScoreAutonomia = validRespostas.reduce((acc, r) => acc + (r.score_autonomia || 0), 0) / validRespostas.length;
    const avgScoreMaestria = validRespostas.reduce((acc, r) => acc + (r.score_maestria || 0), 0) / validRespostas.length;
    const avgScoreProposito = validRespostas.reduce((acc, r) => acc + (r.score_proposito || 0), 0) / validRespostas.length;
    const avgScoreFinanceiro = validRespostas.reduce((acc, r) => acc + (r.score_financeiro || 0), 0) / validRespostas.length;
    const avgScoreAmbiente = validRespostas.reduce((acc, r) => acc + (r.score_ambiente || 0), 0) / validRespostas.length;

    const liderancaInteresse = {
      sim: respostas.filter(r => r.interesse_lideranca === true).length,
      nao: respostas.filter(r => r.interesse_lideranca === false).length,
    };

    const radarData = [
      { subject: 'Autonomia', A: parseFloat(avgScoreAutonomia.toFixed(1)), fullMark: 5 },
      { subject: 'Maestria', A: parseFloat(avgScoreMaestria.toFixed(1)), fullMark: 5 },
      { subject: 'Propósito', A: parseFloat(avgScoreProposito.toFixed(1)), fullMark: 5 },
      { subject: 'Financeiro', A: parseFloat(avgScoreFinanceiro.toFixed(1)), fullMark: 5 },
      { subject: 'Ambiente', A: parseFloat(avgScoreAmbiente.toFixed(1)), fullMark: 5 },
    ];

    const satisfacaoDist = Array.from({ length: 11 }, (_, i) => ({
      nota: i,
      qtd: respostas.filter(r => r.satisfacao_trabalho === i).length
    })).filter(d => d.qtd > 0);

    return {
      total: respostas.length,
      avgSatisfacao,
      radarData,
      liderancaInteresse,
      satisfacaoDist
    };
  }, [respostas]);

  const filteredRespostas = useMemo(() => {
    return respostas.filter(r => 
      r.colaborador_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.funcao_atual?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [respostas, searchTerm]);

  const exportToExcel = () => {
    const exportData = respostas.map(r => ({
      "Nome": r.colaborador_nome,
      "Função": r.funcao_atual,
      "Satisfação (0-10)": r.satisfacao_trabalho,
      "Motivo Satisfação Baixa": r.motivo_satisfacao_baixa,
      "Talento Oculto": r.talento_oculto,
      "Rotina Diária": r.rotina_diaria,
      "Expectativa Empresa": r.expectativa_empresa,
      "Definição Sucesso": r.definicao_sucesso,
      "Sentimento Valorização": r.sentimento_valorizacao,
      "Atividades Top 5": r.atividades_top5,
      "Ladrão de Tempo": r.ladrao_tempo,
      "Ferramentas Uso": r.ferramentas_uso,
      "Interdependências": r.interdependencias,
      "START (Começar)": r.start_action,
      "STOP (Parar)": r.stop_action,
      "CONTINUE (Manter)": r.continue_action,
      "Reclamação Cliente": r.reclamacao_cliente,
      "Prioridades Setor": r.prioridades_setor,
      "Visão Papel 10K": r.visao_papel_10k,
      "Falta Plano 2026": r.falta_plano_2026,
      "Falta Metas 2025": r.falta_metas_2025,
      "Score Autonomia (1-5)": r.score_autonomia,
      "Score Maestria (1-5)": r.score_maestria,
      "Score Propósito (1-5)": r.score_proposito,
      "Score Financeiro (1-5)": r.score_financeiro,
      "Score Ambiente (1-5)": r.score_ambiente,
      "Interesse Liderança": r.interesse_lideranca ? "Sim" : "Não",
      "Motivo Liderança": r.motivo_lideranca,
      "Papel Bom Líder": r.papel_bom_lider,
      "Maior Sonho": r.maior_sonho,
      "Fotos Sonhos (URLs)": r.fotos_sonhos?.join(', '),
      "Data Envio": new Date(r.created_at).toLocaleString('pt-BR'),
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Respostas");
    XLSX.writeFile(wb, `Levantamento_Sismais_10K_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Acesso Negado</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (respostas.length === 0) {
    return (
      <div className="text-center py-16">
        <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">Nenhuma resposta encontrada</h2>
        <p className="text-muted-foreground">Aguardando o preenchimento do formulário pelo time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Resultados do Mapeamento</h1>
          <p className="text-muted-foreground">Análise estratégica das respostas do time Sismais 10K.</p>
        </div>
        <Button onClick={exportToExcel} variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Exportar Dados ({respostas.length})
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl"><Users className="text-primary w-6 h-6" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Respostas</p>
                <p className="text-2xl font-bold">{stats?.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50/50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl"><Star className="text-green-600 w-6 h-6" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Satisfação Média</p>
                <p className="text-2xl font-bold text-green-700">{stats?.avgSatisfacao.toFixed(1)}/10</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-xl"><TrendingUp className="text-amber-600 w-6 h-6" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Interesse Liderança</p>
                <p className="text-2xl font-bold text-amber-700">{stats?.liderancaInteresse.sim}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50/50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl"><Rocket className="text-purple-600 w-6 h-6" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Média Autonomia</p>
                <p className="text-2xl font-bold text-purple-700">{stats?.radarData.find(d => d.subject === 'Autonomia')?.A.toFixed(1)}/5</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="indicadores" className="w-full">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="indicadores" className="gap-2"><LayoutGrid className="w-4 h-4" /> Indicadores</TabsTrigger>
          <TabsTrigger value="detalhes" className="gap-2"><MessageSquare className="w-4 h-4" /> Respostas Detalhadas</TabsTrigger>
          <TabsTrigger value="mural" className="gap-2"><Heart className="w-4 h-4" /> Mural dos Sonhos</TabsTrigger>
        </TabsList>

        <TabsContent value="indicadores" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Perfil de Engajamento</CardTitle><CardDescription>Média das avaliações de cultura e trabalho (escala 1-5)</CardDescription></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats?.radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <Radar name="Time" dataKey="A" stroke="#45E5E5" fill="#45E5E5" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Distribuição de Satisfação</CardTitle><CardDescription>Frequência das notas de felicidade no trabalho (0-10)</CardDescription></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.satisfacaoDist}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nota" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="qtd" fill="#45E5E5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="detalhes" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Participantes</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por nome..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead className="text-center">Satisfação</TableHead>
                    <TableHead className="text-center">Liderança?</TableHead>
                    <TableHead>Principal Gargalo</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRespostas.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.colaborador_nome}</TableCell>
                      <TableCell>{r.funcao_atual}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={r.satisfacao_trabalho && r.satisfacao_trabalho >= 8 ? "default" : "destructive"}>
                          {r.satisfacao_trabalho}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {r.interesse_lideranca ? <Badge className="bg-green-500">Sim</Badge> : <Badge variant="secondary">Não</Badge>}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={r.ladrao_tempo || ""}>{r.ladrao_tempo}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="gap-1">
                          <ExternalLink className="w-3 h-3" /> Ver Tudo
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mural" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                Mural dos Sonhos
              </CardTitle>
              <CardDescription>
                Os maiores sonhos do time e as imagens que os inspiram.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {respostas.filter(r => r.maior_sonho).map((r) => (
                  <Card key={r.id} className="overflow-hidden group">
                    <div className="relative aspect-video bg-muted">
                      {r.fotos_sonhos && r.fotos_sonhos.length > 0 ? (
                        <img 
                          src={r.fotos_sonhos[0]} 
                          alt="Sonho" 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          Sem imagem
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                        <p className="text-white text-sm text-center italic">"{r.maior_sonho?.substring(0, 100)}..."</p>
                      </div>
                    </div>
                    <CardContent className="p-4 bg-primary/5">
                      <p className="font-bold text-primary">{r.colaborador_nome}</p>
                      <p className="text-xs text-muted-foreground">{r.funcao_atual}</p>
                      <p className="text-sm mt-2 line-clamp-3">{r.maior_sonho}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}