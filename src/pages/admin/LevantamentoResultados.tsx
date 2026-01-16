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
  Target, Sparkles, AlertCircle, ImageIcon, X,
  Maximize2, Minimize2, Move, ZoomIn, RotateCcw, Brain, FileText,
  PieChart as PieIcon,
  Image as ImageDown
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/hooks/usePermissions";
import { LevantamentoDetalhesDialog } from "@/components/levantamento/LevantamentoDetalhesDialog";
import { MuralPrintCard } from "@/components/levantamento/MuralPrintCard";
import { MuralCard } from "@/components/levantamento/MuralCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";
import { toPng } from "html-to-image";

type LevantamentoRow = Tables<"levantamento_operacional_2024">;

export default function LevantamentoResultados() {
  const { isAdmin, loading: loadingPermissions } = usePermissions();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedResposta, setSelectedResposta] = useState<LevantamentoRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // General Report State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Image Adjustment State
  const [fitMode, setFitMode] = useState<"cover" | "contain">("cover");
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const [imageZoom, setImageZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialImgPos = useRef({ x: 50, y: 50 });

  const { 
    data: respostas = [], 
    isLoading, 
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

  const handleDownloadCard = async () => {
    if (!selectedResposta) return;
    setIsDownloading(true);
    
    try {
      const element = document.getElementById(`card-sonho-${selectedResposta.id}`);
      if (!element) throw new Error("Elemento não encontrado");

      const dataUrl = await toPng(element, { 
        quality: 1.0,
        pixelRatio: 2, // 2x para garantir alta resolução (retina)
        cacheBust: true,
      });
      
      const link = document.createElement("a");
      link.download = `Mural_10K_${selectedResposta.colaborador_nome.replace(/\s+/g, "_")}.png`;
      link.href = dataUrl;
      link.click();
      
      toast({ title: "Download iniciado!", description: "A imagem em alta resolução está sendo baixada." });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro no download", description: "Não foi possível gerar a imagem.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleGenerateGeneralReport = async () => {
    setIsGeneratingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke("analisar-levantamento-geral");
      
      if (error) throw error;
      
      if (!data?.report || data.report.includes("Erro ao gerar relatório")) {
        throw new Error("A IA não conseguiu processar os dados no momento. Tente novamente.");
      }

      // Converter Markdown básico para HTML para exibição na aba
      const reportHtml = data.report
        .replace(/^# (.*$)/gim, '<h1 style="color: #10293f; border-bottom: 2px solid #45e5e5; padding-bottom: 10px;">$1</h1>')
        .replace(/^## (.*$)/gim, '<h2 style="color: #10293f; margin-top: 25px;">$1</h2>')
        .replace(/^### (.*$)/gim, '<h3 style="color: #45e5e5;">$1</h3>')
        .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
        .replace(/<\/ul>\n<ul>/gim, '')
        .replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>')
        .replace(/<\/ul>\n<ul>/gim, '')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .split('\n\n')
        .map((p: string) => p.startsWith('<h') || p.startsWith('<ul') ? p : `<p style="margin-bottom: 15px; line-height: 1.6;">${p}</p>`)
        .join('');

      const fullHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Relatório Estratégico - Sismais 10K</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; padding: 40px 20px; color: #334155; }
            .container { max-width: 850px; margin: 0 auto; background: white; padding: 50px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
            .meta { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 30px; display: flex; justify-content: space-between; }
            h1 { font-size: 2.2rem; }
            h2 { font-size: 1.5rem; }
            ul { padding-left: 20px; margin-bottom: 20px; }
            li { margin-bottom: 10px; }
            @media print { body { background: white; padding: 0; } .container { box-shadow: none; max-width: 100%; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="meta">
              <span>Sismais 10K • Planejamento Estratégico</span>
              <span>Gerado em: ${new Date().toLocaleString('pt-BR')}</span>
            </div>
            ${reportHtml}
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      toast({ title: "Relatório gerado!", description: "A análise estratégica foi aberta em uma nova aba." });
    } catch (err: any) {
      console.error(err);
      toast({ 
        title: "Erro", 
        description: err.message || "Não foi possível gerar o relatório estratégico.", 
        variant: "destructive" 
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleOpenPrintCard = (resposta: LevantamentoRow) => {
    setSelectedResposta(null);
    setImagePosition({ x: 50, y: 50 });
    setImageZoom(1);
    setFitMode("cover"); // Default to cover for better look with grid
    
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
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    initialImgPos.current = { ...imagePosition };
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    
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
              <div className="flex justify-end">
                <Button 
                  onClick={handleGenerateGeneralReport} 
                  disabled={isGeneratingReport}
                  className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-lg"
                >
                  {isGeneratingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  Gerar Relatório Estratégico (IA)
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="h-96"><CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Perfil de Engajamento</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats?.radarData}><PolarGrid /><PolarAngleAxis dataKey="subject" /><Radar name="Time" dataKey="A" stroke="#45E5E5" fill="#45E5E5" fillOpacity={0.6} /><RechartsTooltip /></RadarChart></ResponsiveContainer></CardContent></Card>
                <Card className="h-96"><CardHeader><CardTitle className="flex items-center gap-2"><PieIcon className="w-4 h-4 text-primary" /> Distribuição de Satisfação</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats?.satisfacaoDist}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="nota" /><YAxis /><RechartsTooltip /><Bar dataKey="qtd" fill="#45E5E5" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
              </div>
            </TabsContent>

            <TabsContent value="mural" className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {respostas.filter(r => r.maior_sonho).map((r) => (
                  <MuralCard 
                    key={r.id} 
                    resposta={r} 
                    onOpenDetails={handleOpenDetails}
                    onOpenPrint={handleOpenPrintCard}
                  />
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
        <DialogContent className="max-w-[1200px] p-0 bg-transparent border-none overflow-hidden h-[98vh] flex flex-col items-center justify-center">
          <DialogHeader className="sr-only">
            <DialogTitle>Visualização de Card para Impressão</DialogTitle>
            <DialogDescription>Ajuste a posição e o zoom da imagem do sonho antes de imprimir.</DialogDescription>
          </DialogHeader>
          <div className="absolute top-2 left-4 right-4 flex justify-between items-center z-50 pointer-events-auto">
            <div className="bg-black/90 backdrop-blur-2xl p-4 rounded-3xl border border-white/20 flex flex-col gap-4 shadow-2xl min-w-[500px]">
              <div className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-4">
                  <div className="flex bg-white/10 p-1 rounded-xl border border-white/10">
                    <Button 
                      variant={fitMode === "contain" ? "secondary" : "ghost"} 
                      size="sm" 
                      className="h-8 gap-2 text-xs rounded-lg" 
                      onClick={() => {
                        setFitMode("contain");
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
                  <div className="flex items-center gap-2 px-3 py-1 bg-primary/20 rounded-lg border border-primary/30">
                    <Move className="w-3 h-3 text-primary" />
                    <p className="text-[10px] text-primary font-black uppercase tracking-tighter">Arraste a foto</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-8 bg-primary hover:bg-primary/90 text-white gap-2 text-xs font-bold px-4"
                    onClick={handleDownloadCard}
                    disabled={isDownloading}
                  >
                    {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageDown className="w-3.5 h-3.5" />}
                    Baixar PNG
                  </Button>
                </div>
              </div>
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
            </div>
            <Button variant="outline" size="icon" className="rounded-full h-12 w-12 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md shadow-xl" onClick={() => setIsPrintModalOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 w-full flex items-center justify-center p-4 overflow-hidden mt-12">
            <div 
              className={cn(
                // Escala reduzida para visualização no modal, mas o elemento original tem 900x1200
                "scale-[0.45] sm:scale-[0.55] md:scale-[0.6] lg:scale-[0.65] xl:scale-[0.7] origin-center transition-all duration-300 ease-in-out cursor-move active:cursor-grabbing"
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