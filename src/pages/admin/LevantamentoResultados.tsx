"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar
} from "recharts";
import { 
  Download, Loader2, Users, Heart, Star, Rocket, LayoutGrid, 
  MessageSquare, TrendingUp, Search, ExternalLink, RefreshCw,
  Target, Sparkles, AlertCircle
} from "lucide-react";
import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/hooks/usePermissions";
import { LevantamentoDetalhesDialog } from "@/components/levantamento/LevantamentoDetalhesDialog";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type LevantamentoRow = Tables<"levantamento_operacional_2024">;

export default function LevantamentoResultados() {
  const { isAdmin, loading: loadingPermissions } = usePermissions();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedResposta, setSelectedResposta] = useState<LevantamentoRow | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { 
    data: respostas = [], 
    isLoading, 
    error,
    refetch, 
    isFetching 
  } = useQuery({
    queryKey: ["levantamento-resultados"],
    queryFn: async () => {
      console.log("Iniciando busca de dados no banco...");
      const { data, error } = await supabase
        .from("levantamento_operacional_2024")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro Supabase:", error);
        throw error;
      }
      
      console.log("Dados carregados com sucesso:", data?.length, "registros.");
      return data as LevantamentoRow[];
    },
    // Aguarda permissões serem carregadas, mas permite rodar se for admin ou se estivermos em debug
    enabled: !loadingPermissions, 
  });

  const stats = useMemo(() => {
    if (respostas.length === 0) return null;

    const validRespostas = respostas.filter(r => r.satisfacao_trabalho !== null);

    const avgSatisfacao = validRespostas.length > 0 
      ? validRespostas.reduce((acc, r) => acc + (r.satisfacao_trabalho || 0), 0) / validRespostas.length
      : 0;
    
    const radarData = [
      { subject: 'Autonomia', A: (validRespostas.reduce((acc, r) => acc + (r.score_autonomia || 0), 0) / (validRespostas.length || 1)) },
      { subject: 'Maestria', A: (validRespostas.reduce((acc, r) => acc + (r.score_maestria || 0), 0) / (validRespostas.length || 1)) },
      { subject: 'Propósito', A: (validRespostas.reduce((acc, r) => acc + (r.score_proposito || 0), 0) / (validRespostas.length || 1)) },
      { subject: 'Financeiro', A: (validRespostas.reduce((acc, r) => acc + (r.score_financeiro || 0), 0) / (validRespostas.length || 1)) },
      { subject: 'Ambiente', A: (validRespostas.reduce((acc, r) => acc + (r.score_ambiente || 0), 0) / (validRespostas.length || 1)) },
    ];

    const satisfacaoDist = Array.from({ length: 11 }, (_, i) => ({
      nota: i,
      qtd: respostas.filter(r => r.satisfacao_trabalho === i).length
    })).filter(d => d.qtd > 0);

    return {
      total: respostas.length,
      avgSatisfacao,
      radarData,
      satisfacaoDist
    };
  }, [respostas]);

  const filteredRespostas = useMemo(() => {
    return respostas.filter(r => 
      r.colaborador_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.funcao_atual?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.talento_oculto?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [respostas, searchTerm]);

  const handleOpenDetails = (resposta: LevantamentoRow) => {
    setSelectedResposta(resposta);
    setIsDialogOpen(true);
  };

  const exportToExcel = () => {
    if (respostas.length === 0) return;
    const exportData = respostas.map(r => ({
      "Data": new Date(r.created_at).toLocaleDateString('pt-BR'),
      "Nome": r.colaborador_nome,
      "Função": r.funcao_atual,
      "Satisfação": r.satisfacao_trabalho,
      "Autonomia": r.score_autonomia,
      "Maestria": r.score_maestria,
      "Propósito": r.score_proposito,
      "Financeiro": r.score_financeiro,
      "Ambiente": r.score_ambiente,
      "Ladrão de Tempo": r.ladrao_tempo,
      "Talento Oculto": r.talento_oculto,
      "Maior Sonho": r.maior_sonho,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Respostas Mapeamento");
    XLSX.writeFile(wb, `Mapeamento_Sismais_10K_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loadingPermissions || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Carregando respostas do time...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive bg-destructive/5 m-6">
        <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <div>
            <h3 className="text-lg font-bold text-destructive">Erro ao carregar dados</h3>
            <p className="text-muted-foreground">Ocorreu um erro ao acessar a tabela no banco de dados.</p>
            <code className="block mt-2 p-2 bg-background rounded text-xs border">{(error as any).message}</code>
          </div>
          <Button onClick={() => refetch()} variant="outline">Tentar novamente</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Resultados do Mapeamento</h1>
          <p className="text-muted-foreground">Acompanhe as respostas e o clima organizacional do time.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" size="icon" disabled={isFetching} title="Atualizar dados">
            <RefreshCw className={respostas.length > 0 && isFetching ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          </Button>
          <Button onClick={exportToExcel} variant="outline" className="gap-2" disabled={respostas.length === 0}>
            <Download className="w-4 h-4" /> Exportar Planilha ({respostas.length})
          </Button>
        </div>
      </div>

      {respostas.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="flex flex-col items-center gap-3">
            <Users className="w-12 h-12 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground">Nenhuma resposta encontrada no banco de dados.</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">Verifique se o formulário foi publicado e se as políticas de RLS permitem a leitura para o seu usuário.</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" /> Tentar carregar novamente
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl"><Users className="text-primary w-6 h-6" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Colaboradores</p>
                    <p className="text-2xl font-bold">{stats?.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50/50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-xl"><Heart className="text-green-600 w-6 h-6" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clima Médio</p>
                    <p className="text-2xl font-bold text-green-700">{stats?.avgSatisfacao.toFixed(1)}/10</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50/50 border-purple-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-xl"><Sparkles className="text-purple-600 w-6 h-6" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Talento Oculto</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {respostas.filter(r => r.talento_oculto).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50/50 border-amber-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 rounded-xl"><Target className="text-amber-600 w-6 h-6" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mural Sonhos</p>
                    <p className="text-2xl font-bold text-amber-700">
                      {respostas.filter(r => r.maior_sonho).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="detalhes" className="w-full">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="detalhes" className="gap-2"><MessageSquare className="w-4 h-4" /> Respostas</TabsTrigger>
              <TabsTrigger value="indicadores" className="gap-2"><LayoutGrid className="w-4 h-4" /> Dashboard</TabsTrigger>
              <TabsTrigger value="mural" className="gap-2"><Heart className="w-4 h-4" /> Mural 10K</TabsTrigger>
            </TabsList>

            <TabsContent value="detalhes" className="mt-6">
              <Card>
                <CardHeader className="pb-3 border-b">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle>Acompanhamento Individual</CardTitle>
                      <CardDescription>Resumo das respostas enviadas pelo time.</CardDescription>
                    </div>
                    <div className="relative w-full sm:w-80">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Buscar por nome ou talento..." 
                        className="pl-8" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead className="text-center">Clima</TableHead>
                        <TableHead>Talento Oculto</TableHead>
                        <TableHead>Maior Sonho</TableHead>
                        <TableHead className="text-right px-6">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRespostas.map((r) => (
                        <TableRow key={r.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="font-bold py-4">{r.colaborador_nome}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.funcao_atual}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={r.satisfacao_trabalho && r.satisfacao_trabalho >= 8 ? "default" : r.satisfacao_trabalho && r.satisfacao_trabalho >= 6 ? "secondary" : "destructive"}>
                              {r.satisfacao_trabalho}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate text-xs italic" title={r.talento_oculto || ""}>
                            {r.talento_oculto || "-"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs" title={r.maior_sonho || ""}>
                            {r.maior_sonho}
                          </TableCell>
                          <TableCell className="text-right px-6">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="gap-2 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => handleOpenDetails(r)}
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="indicadores" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>Perfil de Engajamento</CardTitle></CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats?.radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <Radar name="Time" dataKey="A" stroke="#45E5E5" fill="#45E5E5" fillOpacity={0.6} />
                        <RechartsTooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Distribuição de Satisfação</CardTitle></CardHeader>
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

            <TabsContent value="mural" className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {respostas.filter(r => r.maior_sonho).map((r) => (
                  <Card key={r.id} className="overflow-hidden group cursor-pointer border-none shadow-md hover:shadow-xl transition-all" onClick={() => handleOpenDetails(r)}>
                    <div className="relative aspect-video bg-muted overflow-hidden">
                      {r.fotos_sonhos && r.fotos_sonhos.length > 0 ? (
                        <img src={r.fotos_sonhos[0]} alt="Sonho" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-primary/5">
                          <Rocket className="w-8 h-8 opacity-10" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <p className="text-white text-xs">Clique para ler o depoimento completo</p>
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-primary leading-tight">{r.colaborador_nome}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{r.funcao_atual}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{r.satisfacao_trabalho}/10</Badge>
                      </div>
                      <p className="text-sm mt-3 line-clamp-3 italic text-muted-foreground leading-relaxed">
                        "{r.maior_sonho}"
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      <LevantamentoDetalhesDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        resposta={selectedResposta} 
      />
    </div>
  );
}