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
  MessageSquare, TrendingUp, Search, Filter, ExternalLink
} from "lucide-react";
import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";

const COLORS = ['#45E5E5', '#10293F', '#FFD700', '#FF8042', '#00C49F', '#FFBB28'];

export default function LevantamentoResultados() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: respostas = [], isLoading } = useQuery({
    queryKey: ["levantamento-resultados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('crm')
        .from("levantamento_operacional_2024")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    if (respostas.length === 0) return null;

    const avgSatisfacao = respostas.reduce((acc, r) => acc + (r.satisfacao_trabalho || 0), 0) / respostas.length;
    const avgScoreFinanceiro = respostas.reduce((acc, r) => acc + (r.score_financeiro || 0), 0) / respostas.length;
    const avgScoreAutonomia = respostas.reduce((acc, r) => acc + (r.score_autonomia || 0), 0) / respostas.length;
    const avgScoreMaestria = respostas.reduce((acc, r) => acc + (r.score_maestria || 0), 0) / respostas.length;
    const avgScoreProposito = respostas.reduce((acc, r) => acc + (r.score_proposito || 0), 0) / respostas.length;
    const avgScoreAmbiente = respostas.reduce((acc, r) => acc + (r.score_ambiente || 0), 0) / respostas.length;

    const liderancaInteresse = {
      sim: respostas.filter(r => r.interesse_lideranca).length,
      nao: respostas.filter(r => !r.interesse_lideranca).length,
    };

    const radarData = [
      { subject: 'Autonomia', A: avgScoreAutonomia, fullMark: 5 },
      { subject: 'Maestria', A: avgScoreMaestria, fullMark: 5 },
      { subject: 'Propósito', A: avgScoreProposito, fullMark: 5 },
      { subject: 'Financeiro', A: avgScoreFinanceiro, fullMark: 5 },
      { subject: 'Ambiente', A: avgScoreAmbiente, fullMark: 5 },
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
    const ws = XLSX.utils.json_to_sheet(respostas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Respostas");
    XLSX.writeFile(wb, `Levantamento_Sismais_10K_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (isLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Resultados do Mapeamento</h1>
          <p className="text-muted-foreground">Análise estratégica das respostas do time Sismais 10K.</p>
        </div>
        <Button onClick={exportToExcel} variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Exportar Dados
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
                <p className="text-sm text-muted-foreground">Sonhos Mapeados</p>
                <p className="text-2xl font-bold text-purple-700">{respostas.length}</p>
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
              <CardHeader><CardTitle>Distribuição de Satisfação</CardTitle><CardDescription>Frequência das notas de felicidade no trabalho</CardDescription></CardHeader>
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
                        <Badge variant={r.satisfacao_trabalho >= 8 ? "default" : "destructive"}>
                          {r.satisfacao_trabalho}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {r.interesse_lideranca ? <Badge className="bg-green-500">Sim</Badge> : <Badge variant="secondary">Não</Badge>}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{r.ladrao_tempo}</TableCell>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {respostas.filter(r => r.fotos_sonhos && r.fotos_sonhos.length > 0).map((r) => (
              <Card key={r.id} className="overflow-hidden group">
                <div className="relative aspect-video bg-muted">
                  <img src={r.fotos_sonhos![0]} alt="Sonho" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                    <p className="text-white text-sm text-center italic">"{r.maior_sonho.substring(0, 100)}..."</p>
                  </div>
                </div>
                <CardContent className="p-4 bg-primary/5">
                  <p className="font-bold text-primary">{r.colaborador_nome}</p>
                  <p className="text-xs text-muted-foreground">{r.funcao_atual}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}