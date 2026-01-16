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
  Image as ImageDown,
  CheckCircle2,
  MousePointer2
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/hooks/usePermissions";
import { LevantamentoDetalhesDialog } from "@/components/levantamento/LevantamentoDetalhesDialog";
import { MuralPrintCard, type PhotoSetting } from "@/components/levantamento/MuralPrintCard";
import { MuralCard } from "@/components/levantamento/MuralCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";
import { toPng } from "html-to-image";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  // Card Editing State
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [photoSettings, setPhotoSettings] = useState<Record<string, PhotoSetting>>({});
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
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

  const handleOpenPrintCard = (resposta: LevantamentoRow) => {
    setSelectedResposta(null);
    
    // Initialize with first 6 photos if available
    const initialPhotos = resposta.fotos_sonhos?.slice(0, 6) || [];
    setSelectedPhotos(initialPhotos);
    
    // Initialize settings
    const initialSettings: Record<string, PhotoSetting> = {};
    initialPhotos.forEach(url => {
      initialSettings[url] = { x: 50, y: 50, zoom: 1 };
    });
    setPhotoSettings(initialSettings);
    setActivePhotoIndex(initialPhotos.length > 0 ? 0 : null);
    
    setTimeout(() => {
      setSelectedResposta(resposta);
      setIsPrintModalOpen(true);
    }, 10);
  };

  const handleTogglePhoto = (url: string) => {
    let newSelection;
    if (selectedPhotos.includes(url)) {
      newSelection = selectedPhotos.filter(p => p !== url);
    } else {
      if (selectedPhotos.length >= 6) {
        toast({ title: "Limite atingido", description: "Máximo de 6 fotos permitidas.", variant: "destructive" });
        return;
      }
      newSelection = [...selectedPhotos, url];
    }
    
    setSelectedPhotos(newSelection);
    
    // Reset active index if selected photo was removed or ensure valid index
    if (newSelection.length > 0) {
      setActivePhotoIndex(0);
    } else {
      setActivePhotoIndex(null);
    }
    
    // Init settings if new
    if (!photoSettings[url]) {
      setPhotoSettings(prev => ({ ...prev, [url]: { x: 50, y: 50, zoom: 1 } }));
    }
  };

  const handleUpdateSetting = (url: string, key: keyof PhotoSetting, value: number) => {
    setPhotoSettings(prev => ({
      ...prev,
      [url]: { ...prev[url], [key]: value }
    }));
  };

  // Drag logic for image position
  const onMouseDown = (e: React.MouseEvent) => {
    if (activePhotoIndex === null || selectedPhotos.length === 0) return;
    
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    const activeUrl = selectedPhotos[activePhotoIndex];
    initialImgPos.current = { x: photoSettings[activeUrl]?.x || 50, y: photoSettings[activeUrl]?.y || 50 };
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging || activePhotoIndex === null) return;
    
    const activeUrl = selectedPhotos[activePhotoIndex];
    const currentZoom = photoSettings[activeUrl]?.zoom || 1;
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    
    const sensitivity = 0.15 / currentZoom;
    
    const newX = Math.max(0, Math.min(100, initialImgPos.current.x - (dx * sensitivity)));
    const newY = Math.max(0, Math.min(100, initialImgPos.current.y - (dy * sensitivity)));
    
    setPhotoSettings(prev => ({
      ...prev,
      [activeUrl]: { ...prev[activeUrl], x: newX, y: newY }
    }));
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

  // Generate general report logic (kept same as before)
  const handleGenerateGeneralReport = async () => {
    setIsGeneratingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke("analisar-levantamento-geral");
      
      if (error) throw error;
      
      if (!data?.report) throw new Error("A IA não conseguiu processar os dados.");

      // Converter Markdown básico para HTML (simplificado)
      const reportHtml = data.report
        .replace(/^# (.*$)/gim, '<h1 style="color: #10293f; border-bottom: 2px solid #45e5e5; padding-bottom: 10px;">$1</h1>')
        .replace(/^## (.*$)/gim, '<h2 style="color: #10293f; margin-top: 25px;">$1</h2>')
        .split('\n\n')
        .map((p: string) => p.startsWith('<h') ? p : `<p style="margin-bottom: 15px; line-height: 1.6;">${p}</p>`)
        .join('');

      const fullHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8"><title>Relatório Estratégico</title>
        <style>body{font-family:sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#333;}</style>
        </head><body>${reportHtml}</body></html>
      `;

      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast({ title: "Relatório gerado!", description: "A análise estratégica foi aberta em uma nova aba." });
    } catch (err: any) {
      toast({ title: "Erro", description: "Não foi possível gerar o relatório.", variant: "destructive" });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (loadingPermissions || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Carregando respostas do time...</p>
      </div>
    );
  }

  const activePhotoUrl = activePhotoIndex !== null && selectedPhotos[activePhotoIndex] ? selectedPhotos[activePhotoIndex] : null;
  const activeSettings = activePhotoUrl ? photoSettings[activePhotoUrl] : { zoom: 1 };

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
            <Download className="w-4 h-4" /> Exportar Planilha
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
        <DialogContent className="max-w-screen h-screen p-0 bg-zinc-950/95 border-none overflow-hidden flex flex-col sm:flex-row">
          <DialogHeader className="sr-only">
            <DialogTitle>Editor de Card</DialogTitle>
          </DialogHeader>
          
          {/* Sidebar Controls */}
          <div className="w-full sm:w-80 h-auto sm:h-full bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col gap-6 overflow-y-auto z-50">
            <div>
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" /> Selecionar Fotos ({selectedPhotos.length}/6)
              </h3>
              <ScrollArea className="h-48 border border-zinc-800 rounded-lg p-2 bg-zinc-950">
                <div className="grid grid-cols-3 gap-2">
                  {selectedResposta?.fotos_sonhos?.map((url, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "aspect-square rounded-md overflow-hidden cursor-pointer relative border-2 transition-all",
                        selectedPhotos.includes(url) ? "border-primary opacity-100" : "border-transparent opacity-50 hover:opacity-80"
                      )}
                      onClick={() => handleTogglePhoto(url)}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {selectedPhotos.includes(url) && (
                        <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  {(!selectedResposta?.fotos_sonhos || selectedResposta.fotos_sonhos.length === 0) && (
                    <p className="col-span-3 text-xs text-zinc-500 text-center py-4">Sem fotos disponíveis</p>
                  )}
                </div>
              </ScrollArea>
            </div>

            {selectedPhotos.length > 0 && (
              <div className="space-y-4">
                <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-800">
                  <h4 className="text-white text-sm font-semibold mb-2 flex items-center gap-2">
                    <MousePointer2 className="w-4 h-4 text-primary" /> Ajustar Foto
                  </h4>
                  <p className="text-xs text-zinc-400 mb-4">
                    {activePhotoIndex !== null 
                      ? `Editando foto ${activePhotoIndex + 1}. Arraste a imagem no card para mover.`
                      : "Clique em uma foto no card para editar."}
                  </p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>Zoom</span>
                        <span>{activeSettings?.zoom?.toFixed(1)}x</span>
                      </div>
                      <Slider 
                        value={[activeSettings?.zoom || 1]} 
                        min={0.5} 
                        max={3} 
                        step={0.1} 
                        disabled={activePhotoIndex === null}
                        onValueChange={([v]) => activePhotoUrl && handleUpdateSetting(activePhotoUrl, "zoom", v)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-auto pt-6 border-t border-zinc-800 space-y-3">
              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold"
                onClick={handleDownloadCard}
                disabled={isDownloading}
              >
                {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Baixar Alta Resolução (PNG)
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-zinc-400 hover:text-white"
                onClick={() => setIsPrintModalOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </div>

          {/* Main Preview Area */}
          <div className="flex-1 bg-zinc-950 flex items-center justify-center p-4 sm:p-12 overflow-hidden relative">
            <div 
              className={cn(
                // Escala responsiva para caber na tela, mantendo proporção
                "origin-center transition-all duration-300 ease-in-out shadow-2xl",
                "scale-[0.35] sm:scale-[0.45] md:scale-[0.55] lg:scale-[0.65] xl:scale-[0.75]",
                isDragging && "cursor-grabbing"
              )}
              onMouseDown={onMouseDown}
            >
               {selectedResposta && (
                 <MuralPrintCard 
                  resposta={selectedResposta} 
                  selectedPhotos={selectedPhotos}
                  photoSettings={photoSettings}
                  onPhotoClick={setActivePhotoIndex}
                  activePhotoIndex={activePhotoIndex}
                 />
               )}
            </div>
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur text-white text-xs px-4 py-2 rounded-full pointer-events-none">
              Pré-visualização (Qualidade reduzida)
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}