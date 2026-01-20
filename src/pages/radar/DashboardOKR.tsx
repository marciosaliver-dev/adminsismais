import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRadar } from "@/contexts/RadarContext";
import { 
  BarChart3, 
  Target, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp,
  Filter,
  Users,
  Search,
  X
} from "lucide-react";
import { MetricCard } from "@/components/radar/MetricCard";
import { ObjetivoCard } from "@/components/radar/ObjetivoCard";
import { DashboardSkeleton } from "@/components/radar/DashboardSkeleton";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const AREAS_ORDEM = ["Comercial", "Produto", "Suporte", "Financeiro", "Geral"];

export default function DashboardOKR() {
  const { cicloAtivo, loading: loadingRadar } = useRadar();
  
  // Filtros
  const [filtroArea, setFiltroArea] = useState<string>("all");
  const [filtroStatus, setFiltroStatus] = useState<string>("all");
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>("all");
  const [busca, setBusca] = useState("");

  // 1. Fetch Dados Principais
  const { data, isLoading: loadingData, error } = useQuery({
    queryKey: ["radar-dashboard-data", cicloAtivo?.id],
    queryFn: async () => {
      if (!cicloAtivo?.id) return null;

      // Buscar objetivos com responsáveis
      const { data: objetivos, error: objError } = await supabase
        .from("objetivos_okr")
        .select(`
          *,
          membros_radar!objetivos_okr_responsavel_id_fkey (
            nome,
            avatar_url
          )
        `)
        .eq("ciclo_id", cicloAtivo.id);

      if (objError) throw objError;

      if (!objetivos || objetivos.length === 0) {
        return { objetivos: [], keyResults: [], caches: [] };
      }

      const objIds = objetivos.map(o => o.id);

      // Buscar KRs
      const { data: keyResults, error: krError } = await supabase
        .from("key_results")
        .select("*")
        .in("objetivo_id", objIds);

      if (krError) throw krError;

      const krIds = keyResults?.map(k => k.id) || [];

      // Buscar Caches
      const { data: caches, error: cacheError } = await supabase
        .from("calculos_kr_cache")
        .select("*")
        .in("kr_id", krIds);

      if (cacheError) throw cacheError;

      // Formatar dados dos responsáveis para o componente
      const objetivosFormatados = objetivos.map(obj => ({
        ...obj,
        responsavel: (obj.membros_radar as any) || { nome: "Sem Resp.", avatar_url: null }
      }));

      return {
        objetivos: objetivosFormatados,
        keyResults: keyResults || [],
        caches: caches || []
      };
    },
    enabled: !!cicloAtivo?.id
  });

  // 2. Cálculos para KPIs
  const kpis = useMemo(() => {
    if (!data) return null;
    const { objetivos, caches, keyResults } = data;

    const totalObjetivos = objetivos.length;
    const totalKRs = keyResults.length;
    const krsAtingidos = caches.filter(c => (c.progresso_percentual || 0) >= 100).length;
    
    const progressoMedio = totalKRs > 0 
      ? caches.reduce((acc, c) => acc + (c.progresso_percentual || 0), 0) / totalKRs 
      : 0;

    const objetivosEmRisco = objetivos.filter(obj => {
      const krsDoObj = keyResults.filter(k => k.objetivo_id === obj.id);
      const statsDoObj = caches.filter(c => krsDoObj.some(k => k.id === c.kr_id));
      return statsDoObj.some(s => s.status === "Crítico");
    }).length;

    return {
      totalObjetivos,
      krsAtingidos: `${krsAtingidos}/${totalKRs}`,
      progressoMedio: `${progressoMedio.toFixed(1)}%`,
      objetivosEmRisco
    };
  }, [data]);

  // 3. Filtragem e Agrupamento
  const objetivosFiltrados = useMemo(() => {
    if (!data) return [];
    const { objetivos, caches, keyResults } = data;

    return objetivos.filter(obj => {
      // Filtro Area
      if (filtroArea !== "all" && obj.area !== filtroArea) return false;
      
      // Filtro Responsável
      if (filtroResponsavel !== "all" && obj.responsavel_id !== filtroResponsavel) return false;

      // Filtro Busca
      if (busca && !obj.titulo.toLowerCase().includes(busca.toLowerCase())) return false;

      // Filtro Status (Baseado na média dos KRs)
      if (filtroStatus !== "all") {
        const krsDoObj = keyResults.filter(k => k.objetivo_id === obj.id);
        const statsDoObj = caches.filter(c => krsDoObj.some(k => k.id === c.kr_id));
        const mediaObj = statsDoObj.length > 0 
          ? statsDoObj.reduce((acc, s) => acc + (s.progresso_percentual || 0), 0) / statsDoObj.length 
          : 0;
        
        const statusObj = statsDoObj.some(s => s.status === "Crítico") ? "Crítico" : (
          mediaObj >= 100 ? "Atingido" : mediaObj >= 70 ? "Em dia" : mediaObj >= 40 ? "Alerta" : "Crítico"
        );
        
        if (statusObj !== filtroStatus) return false;
      }

      return true;
    });
  }, [data, filtroArea, filtroStatus, filtroResponsavel, busca]);

  const objetivosAgrupados = useMemo(() => {
    const grupos: Record<string, typeof objetivosFiltrados> = {};
    
    objetivosFiltrados.forEach(obj => {
      if (!grupos[obj.area]) grupos[obj.area] = [];
      grupos[obj.area].push(obj);
    });

    // Ordenar objetivos dentro de cada grupo por peso (desc)
    Object.keys(grupos).forEach(area => {
      grupos[area].sort((a, b) => (b.peso || 0) - (a.peso || 0));
    });

    // Retornar lista de áreas ordenadas conforme o peso solicitado
    return AREAS_ORDEM
      .filter(area => grupos[area])
      .map(area => ({ area, objetivos: grupos[area] }));
  }, [objetivosFiltrados]);

  // Lista de responsáveis únicos para o filtro
  const listaResponsaveis = useMemo(() => {
    if (!data) return [];
    const map = new Map();
    data.objetivos.forEach(o => map.set(o.responsavel_id, o.responsavel.nome));
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [data]);

  if (loadingRadar || loadingData) return <DashboardSkeleton />;

  if (error) return (
    <div className="p-8 text-center bg-red-50 border border-red-100 rounded-2xl">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-bold text-red-700">Erro ao carregar dashboard</h3>
      <p className="text-red-600">Não foi possível carregar as informações do ciclo ativo.</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header com Ciclo e Filtros */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Dashboard {cicloAtivo?.nome && `- ${cicloAtivo.nome}`}
            </h1>
            <p className="text-muted-foreground mt-1">Acompanhamento estratégico em tempo real.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar objetivo..." 
                className="pl-9"
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
            {(filtroArea !== "all" || filtroStatus !== "all" || filtroResponsavel !== "all" || busca) && (
              <Button variant="ghost" size="icon" onClick={() => {
                setFiltroArea("all"); setFiltroStatus("all"); setFiltroResponsavel("all"); setBusca("");
              }}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center gap-3 bg-card p-3 border rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mr-2 text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Filtros:</span>
          </div>
          
          <Select value={filtroArea} onValueChange={setFiltroArea}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Áreas</SelectItem>
              {AREAS_ORDEM.map(area => <SelectItem key={area} value={area}>{area}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="Atingido">Atingido</SelectItem>
              <SelectItem value="Em dia">Em dia</SelectItem>
              <SelectItem value="Alerta">Alerta</SelectItem>
              <SelectItem value="Crítico">Crítico</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Responsáveis</SelectItem>
              {listaResponsaveis.map(resp => <SelectItem key={resp.id} value={resp.id}>{resp.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            titulo="Total Objetivos" 
            valor={kpis.totalObjetivos} 
            icone={<Target className="w-6 h-6" />} 
            cor="blue" 
            subtexto="No ciclo ativo"
          />
          <MetricCard 
            titulo="KRs Atingidos" 
            valor={kpis.krsAtingidos} 
            icone={<CheckCircle2 className="w-6 h-6" />} 
            cor="green" 
            subtexto="Meta ≥ 100%"
          />
          <MetricCard 
            titulo="Progresso Médio" 
            valor={kpis.progressoMedio} 
            icone={<TrendingUp className="w-6 h-6" />} 
            cor="yellow" 
            subtexto="Consolidado do ciclo"
          />
          <MetricCard 
            titulo="OKRs em Risco" 
            valor={kpis.objetivosEmRisco} 
            icone={<AlertCircle className="w-6 h-6" />} 
            cor="red" 
            subtexto="Com KRs críticos"
          />
        </div>
      )}

      {/* Lista de Objetivos Agrupados */}
      <div className="space-y-10">
        {objetivosAgrupados.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 border-2 border-dashed rounded-3xl">
            <BarChart3 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-muted-foreground">Nenhum objetivo encontrado</h3>
            <p className="text-sm text-muted-foreground/60">Tente ajustar os filtros ou cadastrar novos objetivos.</p>
          </div>
        ) : (
          objetivosAgrupados.map((grupo) => (
            <div key={grupo.area} className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <h2 className="text-xl font-bold tracking-tight text-secondary uppercase">{grupo.area}</h2>
                <Badge variant="secondary" className="font-bold">{grupo.objetivos.length}</Badge>
                <div className="flex-1 h-px bg-border" />
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {grupo.objetivos.map((obj) => (
                  <ObjetivoCard 
                    key={obj.id} 
                    objetivo={obj} 
                    keyResults={data?.keyResults || []} 
                    stats={data?.caches || []} 
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}