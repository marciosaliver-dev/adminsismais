"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar
} from "recharts";
import { 
  Download, Loader2, Users, Heart, Star, Rocket, LayoutGrid, 
  MessageSquare, TrendingUp, Search, ExternalLink, RefreshCw,
  Target, Sparkles, AlertCircle, Image as ImageIcon, X,
  Maximize2, Minimize2, Move, ZoomIn, RotateCcw
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/hooks/usePermissions";
import { LevantamentoDetalhesDialog } from "@/components/levantamento/LevantamentoDetalhesDialog";
import { MuralPrintCard } from "@/components/levantamento/MuralPrintCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type LevantamentoRow = Tables<"levantamento_operacional_2024">;

export default function LevantamentoResultados() {
  const { isAdmin, loading: loadingPermissions } = usePermissions();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedResposta, setSelectedResposta] = useState<LevantamentoRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  
  // Image Adjustment State
  const [fitMode, setFitMode] = useState<"cover" | "contain">("contain");
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const [imageZoom, setImageZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialImgPos = useRef({ x: 50, y: 50 });

  const { 
    data: respostas = [], 
    isLoading, 
    error,
    refetch, 
    isFetching 
  } = useQuery({
    queryKey: ["levantamento-resultados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("levantamento_operacional_2024")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as LevantamentoRow[];
    },
    enabled: !loadingPermissions, 
  });

  const stats = useMemo(() => {
    if (respostas.length === 0) return null;
    const validRespostas = respostas.filter(r => r.satisfacao_trabalho !== null);
    
    const radarData = [
      { subject: 'Autonomia', A: (validRespostas.reduce((acc, r) => acc + (r.score_autonomia || 0), 0) / (validRespostas.length || 1)) },
      { subject: 'Maestria', A: (validRespostas.reduce((acc, r) => acc + (r.score_maestria || 0), 0) / (validRespostas.length || 1)) },
      { subject: 'Propósito', A: (validRespostas.reduce((acc, r) => acc + (r.score_proposito || 0), 0) / (validRespostas.length || 1)) },
      { subject: 'Financeiro', A: (validRespostas.reduce((acc, r) => acc + (r.score_financeiro || 0), 0) / (validRespostas.length || 1)) },
      { subject: 'Ambiente', A: (validRespostas.reduce((acc, r) => acc + (r.score_ambiente || 0), 0) / (validRespostas.length || 1)) },
    ];

    return {
      total: respostas.length,
      avgSatisfacao: validRespostas.reduce((acc, r) => acc + (r.satisfacao_trabalho || 0), 0) / validRespostas.length,
      radarData,
      satisfacaoDist: Array.from({ length: 11 }, (_, i) => ({
        nota: i,
        qtd: respostas.filter(r => r.satisfacao_trabalho === i).length
      })).filter(d => d.qtd > 0)
    };
  }, [respostas]);

  const filteredRespostas = useMemo(() => {
    return respostas.filter(r => 
      r.colaborador_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.funcao_atual?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [respostas, searchTerm]);

  const handleOpenPrintCard = (resposta: LevantamentoRow) => {
    setSelectedResposta(null);
    setImagePosition({ x: 50, y: 50 });
    setImageZoom(1);
    setFitMode("contain");
    
    setTimeout(() => {
      setSelectedResposta(resposta);
      setIsPrintModalOpen(true);
    }, 10);
  };

  const handleOpenDetails = (resposta: LevantamentoRow) => {
    setSelectedResposta(resposta);
    setIsDetailsOpen(true);
  };

  const exportToExcel = () => {
    if (respostas.length === 0) return;
    const exportData = respostas.map(r => ({
      "Data": new Date(r.created_at).toLocaleDateString('pt-BR'),
      "Nome": r.colaborador_nome,
      "Função": r.funcao_atual,
      "Satisfação": r.satisfacao_trabalho,
      "Talento Oculto": r.talento_oculto,
      "Maior Sonho": r.maior_sonho,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Respostas Mapeamento");
    XLSX.writeFile(wb, `Mapeamento_Sismais_10K_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Drag logic for image position
  const onMouseDown = (e: React.MouseEvent) => {
    if (fitMode !== "cover") return;
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    initialImgPos.current = { ...imagePosition };
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    
    // Sensibilidade baseada na escala (quanto mais zoom, mais devagar move)
    const sensitivity = 0.1 / imageZoom;
    
    setImagePosition({
      x: Math.max(0, Math.min(100, initialImgPos.current.x - (dx * sensitivity))),
      y: Math.max(0, Math.min(100, initialImgPos.current.y - (dy * sensitivity)))
    });
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    } else {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging]);

  if (loadingPermissions || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Carregando respostas do time...</p>
      </div>
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
          <Button onClick={() => refetch()} variant="outline" size="icon" disabled={isFetching}>
            <RefreshCw className={isFetching ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          </Button>
          <Button onClick={exportToExcel} variant="outline" className="gap-2" disabled={respostas.length === 0}>
            <Download className="w-4 h-4" /> Exportar Planilha ({respostas.length})
          </Button>
        </div>
      </div>

      {respostas.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <p className="text-muted-foreground">Nenhuma resposta encontrada.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl"><Users className="text-primary w-6 h-6" /></div>
                  <div><p className="text-sm text-muted-foreground">Colaboradores</p><p className="text-2xl font-bold">{stats?.total}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50/50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-xl"><Heart className="text-green-600 w-6 h-6" /></div>
                  <div><p className="text-sm text-muted-foreground">Clima Médio</p><p className="text-2xl font-bold text-green-700">{stats?.avgSatisfacao.toFixed(1)}/10</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50/50 border-purple-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-xl"><Sparkles className="text-purple-600 w-6 h-6" /></div>
                  <div><p className="text-sm text-muted-foreground">Talento Oculto</p><p className="text-2xl font-bold text-purple-700">{respostas.filter(r => r.talento_oculto).length}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50/50 border-amber-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 rounded-xl"><Target className="text-amber-600 w-6 h-6" /></div>
                  <div><p className="text-sm text-muted-foreground">Mural Sonhos</p><p className="text-2xl font-bold text-amber-700">{respostas.filter(r => r.maior_sonho).length}</p></div>
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
                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                  <CardTitle>Acompanhamento Individual</CardTitle>
                  <div className="relative w-80">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow className="bg-muted/30"><TableHead>Colaborador</TableHead><TableHead>Função</TableHead><TableHead className="text-center">Clima</TableHead><TableHead>Ação</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredRespostas.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-bold">{r.colaborador_nome}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.funcao_atual}</TableCell>
                          <TableCell className="text-center"><Badge variant={r.satisfacao_trabalho && r.satisfacao_trabalho >= 8 ? "default" : "secondary"}>{r.satisfacao_trabalho}</Badge></TableCell>
                          <TableCell><Button variant="ghost" size="sm" className="gap-2" onClick={() => handleOpenDetails(r)}><ExternalLink className="w-3.5 h-3.5" /> Detalhes</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="indicadores" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="h-96"><CardHeader><CardTitle>Perfil de Engajamento</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats?.radarData}><PolarGrid /><PolarAngleAxis dataKey="subject" /><Radar name="Time" dataKey="A" stroke="#45E5E5" fill="#45E5E5" fillOpacity={0.6} /><RechartsTooltip /></RadarChart></ResponsiveContainer></CardContent></Card>
                <Card className="h-96"><CardHeader><CardTitle>Distribuição de Satisfação</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats?.satisfacaoDist}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="nota" /><YAxis /><RechartsTooltip /><Bar dataKey="qtd" fill="#45E5E5" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
              </div>
            </TabsContent>

            <TabsContent value="mural" className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {respostas.filter(r => r.maior_sonho).map((r) => (
                  <Card key={r.id} className="overflow-hidden group border-none shadow-md hover:shadow-xl transition-all">
                    <div className="relative aspect-square bg-muted overflow-hidden flex items-center justify-center p-2">
                      {r.fotos_sonhos && r.fotos_sonhos.length > 0 ? (
                        <img src={r.fotos_sonhos[0]} alt="Sonho" className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-primary/5 rounded-lg"><Rocket className="w-8 h-8 opacity-10" /></div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <Button variant="secondary" size="sm" className="gap-2" onClick={() => handleOpenPrintCard(r)}>
                          <ImageIcon className="w-4 h-4" /> Gerar Card Print
                        </Button>
                        <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-white/20" onClick={() => handleOpenDetails(r)}>
                          Ver Depoimento
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <div><p className="font-bold text-primary leading-tight">{r.colaborador_nome}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">{r.funcao_atual}</p></div>
                        <Badge variant="outline" className="text-[10px]">{r.satisfacao_trabalho}/10</Badge>
                      </div>
                      <p className="text-sm mt-3 line-clamp-3 italic text-muted-foreground leading-relaxed">"{r.maior_sonho}"</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      <LevantamentoDetalhesDialog 
        open={isDetailsOpen} 
        onOpenChange={setIsDetailsOpen} 
        resposta={selectedResposta} 
      />

      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="max-w-[1000px] p-0 bg-transparent border-none overflow-hidden h-[98vh] flex flex-col items-center justify-center">
          {/* Header de Ação Estendido na Modal */}
          <div className="absolute top-2 left-4 right-4 flex justify-between items-center z-50 pointer-events-auto">
            <div className="bg-black/90 backdrop-blur-2xl p-4 rounded-3xl border border-white/20 flex flex-col gap-4 shadow-2xl min-w-[500px]">
              
              {/* Controles Principais */}
              <div className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-4">
                  <div className="flex bg-white/10 p-1 rounded-xl border border-white/10">
                    <Button 
                      variant={fitMode === "contain" ? "secondary" : "ghost"} 
                      size="sm" 
                      className="h-8 gap-2 text-xs rounded-lg" 
                      onClick={() => {
                        setFitMode("contain");
                        setImageZoom(1);
                        setImagePosition({ x: 50, y: 50 });
                      }}
                    >
                      <Minimize2 className="w-3.5 h-3.5" /> Inteira
                    </Button>
                    <Button 
                      variant={fitMode === "cover" ? "secondary" : "ghost"} 
                      size="sm" 
                      className="h-8 gap-2 text-xs rounded-lg" 
                      onClick={() => setFitMode("cover")}
                    >
                      <Maximize2 className="w-3.5 h-3.5" /> Preencher
                    </Button>
                  </div>

                  {fitMode === "cover" && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-primary/20 rounded-lg border border-primary/30">
                      <Move className="w-3 h-3 text-primary" />
                      <p className="text-[10px] text-primary font-black uppercase tracking-tighter">Arraste a foto</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white" onClick={() => {
                    setImagePosition({ x: 50, y: 50 });
                    setImageZoom(1);
                  }}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-6 bg-white/20" />
                  <p className="text-white text-xs font-bold whitespace-nowrap"><b>Ctrl + P</b></p>
                </div>
              </div>

              {/* Slider de Zoom - Só aparece no modo cover */}
              {fitMode === "cover" && (
                <div className="flex items-center gap-4 px-2">
                  <ZoomIn className="w-4 h-4 text-white/60" />
                  <Slider 
                    value={[imageZoom]} 
                    min={0.5} 
                    max={3} 
                    step={0.1} 
                    onValueChange={([v]) => setImageZoom(v)}
                    className="flex-1"
                  />
                  <span className="text-[10px] font-mono text-white/60 w-8">{imageZoom.toFixed(1)}x</span>
                </div>
              )}
            </div>
            
            <Button variant="outline" size="icon" className="rounded-full h-12 w-12 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md shadow-xl" onClick={() => setIsPrintModalOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Container com Escala Reduzida e Eventos de Drag */}
          <div className="flex-1 w-full flex items-center justify-center p-4 overflow-hidden mt-12">
            <div 
              className={cn(
                "scale-[0.5] sm:scale-[0.6] md:scale-[0.65] lg:scale-[0.7] xl:scale-[0.75] origin-center transition-all duration-300 ease-in-out",
                fitMode === "cover" && "cursor-move active:cursor-grabbing"
              )}
              onMouseDown={onMouseDown}
            >
               {selectedResposta && (
                 <MuralPrintCard 
                  resposta={selectedResposta} 
                  fitMode={fitMode} 
                  imagePosition={imagePosition}
                  imageZoom={imageZoom}
                 />
               )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}