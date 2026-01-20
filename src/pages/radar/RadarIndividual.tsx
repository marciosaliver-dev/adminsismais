import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRadar } from "@/contexts/RadarContext";
import { useAuth } from "@/hooks/useAuth";
import { 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  Zap,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MetricCard } from "@/components/radar/MetricCard";
import { ObjetivoCard } from "@/components/radar/ObjetivoCard";
import { AcoesPendentesCard } from "@/components/radar/AcoesPendentesCard";
import { TimelineRecente } from "@/components/radar/TimelineRecente";
import { AchievementBadges } from "@/components/radar/AchievementBadges";
import { QuickLaunchFAB } from "@/components/radar/QuickLaunchFAB";
import { KRDetailModal } from "@/components/radar/KRDetailModal";
import { differenceInDays, parseISO } from "date-fns";

export default function RadarIndividual() {
  const { user, profile } = useAuth();
  const { cicloAtivo, loading: loadingRadar } = useRadar();
  const [selectedKR, setSelectedKR] = useState<string | null>(null);

  // 1. Fetch Dados Pessoais
  const { data, isLoading: loadingData, refetch } = useQuery({
    queryKey: ["radar-individual-data", cicloAtivo?.id, user?.id],
    queryFn: async () => {
      if (!cicloAtivo?.id || !user?.id) return null;

      // Buscar Objetivos onde sou responsável
      const { data: objetivos, error: objError } = await supabase
        .from("objetivos_okr")
        .select(`
          *,
          membros_radar!objetivos_okr_responsavel_id_fkey (nome, avatar_url)
        `)
        .eq("ciclo_id", cicloAtivo.id)
        .eq("responsavel_id", (profile as any)?.id);

      if (objError) throw objError;

      // Buscar KRs onde sou responsável
      const { data: krs, error: krError } = await supabase
        .from("key_results")
        .select(`
          *,
          cache:calculos_kr_cache(*)
        `)
        .eq("responsavel_id", (profile as any)?.id);

      if (krError) throw krError;

      // Buscar últimos lançamentos do usuário
      const { data: lancamentos, error: lancError } = await supabase
        .from("lancamentos_kr")
        .select(`
          *,
          kr:key_results(id, titulo, meta, unidade, frequencia)
        `)
        .eq("lancado_por_id", user.id)
        .order("data", { ascending: false });

      if (lancError) throw lancError;

      return { 
        objetivos: objetivos?.map(o => ({ ...o, responsavel: o.membros_radar })) || [], 
        krs: krs || [], 
        lancamentos: lancamentos || [] 
      };
    },
    enabled: !!cicloAtivo?.id && !!user?.id && !!profile
  });

  // 2. Cálculos e Lógica de Ações Pendentes
  const processedData = useMemo(() => {
    if (!data) return null;
    const { objetivos, krs, lancamentos } = data;

    // KPI: Progresso Médio
    const progressoMedio = krs.length > 0 
      ? krs.reduce((acc, k) => acc + (k.cache?.progresso_percentual || 0), 0) / krs.length 
      : 0;

    // KPI: KRs Atingidos
    const krsAtingidos = krs.filter(k => (k.cache?.progresso_percentual || 0) >= 100).length;

    // Lógica de Ações Pendentes
    const acoes: any[] = [];
    const hoje = new Date();

    krs.forEach(kr => {
      // 1. Critério: Sem lançamento
      const ultimosLancsKR = lancamentos.filter(l => l.kr_id === kr.id);
      const ultimoData = ultimosLancsKR.length > 0 ? parseISO(ultimosLancsKR[0].data) : null;
      const diasSemLancar = ultimoData ? differenceInDays(hoje, ultimoData) : 999;

      const limiteFreq: Record<string, number> = { 'Diário': 2, 'Semanal': 7, 'Mensal': 30 };
      if (diasSemLancar > (limiteFreq[kr.frequencia] || 7)) {
        acoes.push({
          id: `atraso-${kr.id}`,
          krId: kr.id,
          titulo: kr.titulo,
          mensagem: ultimoData ? `Sem lançamento há ${diasSemLancar} dias` : "Nenhum dado lançado ainda",
          tipo: 'atraso',
          ritmo: kr.cache?.ritmo_necessario ? `${kr.cache.ritmo_necessario.toFixed(2)} / ${kr.frequencia.toLowerCase()}` : undefined
        });
      }

      // 2. Critério: Status Crítico
      if (kr.cache?.status === 'Crítico' && !acoes.find(a => a.krId === kr.id)) {
        acoes.push({
          id: `critico-${kr.id}`,
          krId: kr.id,
          titulo: kr.titulo,
          mensagem: "O KR está em situação crítica (progresso muito abaixo do esperado)",
          tipo: 'critico'
        });
      }
    });

    return { 
      progressoMedio, 
      krsAtingidos, 
      totalKRs: krs.length, 
      acoes: acoes.slice(0, 3) // Mostrar top 3
    };
  }, [data]);

  if (loadingRadar || loadingData) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;

  if (!data) return <div className="text-center p-20 text-muted-foreground">Dados não carregados.</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 max-w-6xl mx-auto">
      {/* Header com Progresso Geral */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meu Radar</h1>
            <p className="text-muted-foreground mt-1">Olá, {profile?.nome}. Veja como andam suas responsabilidades.</p>
          </div>
          <AchievementBadges 
            metasAtingidas={processedData?.krsAtingidos || 0} 
            streak={Math.min(data.lancamentos.length, 7)} // Placeholder para lógica de streak
          />
        </div>

        <div className="bg-card p-6 rounded-2xl border shadow-sm space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Seu Progresso Geral</span>
            <span className="text-2xl font-black text-primary">{processedData?.progressoMedio.toFixed(1)}%</span>
          </div>
          <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary-light transition-all duration-1000 ease-out" 
              style={{ width: `${processedData?.progressoMedio}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {processedData?.progressoMedio && processedData.progressoMedio >= 100 
              ? "Incrível! Você superou suas metas! 🚀" 
              : `Faltam ${(100 - (processedData?.progressoMedio || 0)).toFixed(1)}% para completar todos os seus KRs.`}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          titulo="Meus Objetivos" 
          valor={data.objetivos.length} 
          icone={<Target className="w-6 h-6" />} 
          cor="blue" 
        />
        <MetricCard 
          titulo="KRs Atingidos" 
          valor={`${processedData?.krsAtingidos}/${processedData?.totalKRs}`} 
          icone={<CheckCircle2 className="w-6 h-6" />} 
          cor="green" 
        />
        <MetricCard 
          titulo="Meu Progresso" 
          valor={`${processedData?.progressoMedio.toFixed(0)}%`} 
          icone={<TrendingUp className="w-6 h-6" />} 
          cor="yellow" 
        />
        <MetricCard 
          titulo="Ações Pendentes" 
          valor={processedData?.acoes.length || 0} 
          icone={<AlertCircle className="w-6 h-6" />} 
          cor="red" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Principal: Ações e Objetivos */}
        <div className="lg:col-span-2 space-y-8">
          <AcoesPendentesCard 
            acoes={processedData?.acoes || []} 
            onAction={(id) => setSelectedKR(id)} 
          />

          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 px-2">
              <Target className="w-5 h-5 text-primary" /> Meus Objetivos
            </h2>
            <div className="grid gap-4">
              {data.objetivos.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center text-muted-foreground">
                    Você não é responsável por nenhum objetivo neste ciclo.
                  </CardContent>
                </Card>
              ) : (
                data.objetivos.map(obj => (
                  <ObjetivoCard 
                    key={obj.id} 
                    objetivo={obj} 
                    keyResults={data.krs} 
                    stats={data.krs.map(k => k.cache).filter(Boolean)} 
                    initialExpanded={true}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Coluna Lateral: Timeline */}
        <div className="space-y-8">
          <TimelineRecente lancamentos={data.lancamentos.slice(0, 10) as any} />
        </div>
      </div>

      {/* FAB e Modal */}
      <QuickLaunchFAB 
        krs={data.krs.map(k => ({ id: k.id, titulo: k.titulo }))} 
        onSelect={(id) => setSelectedKR(id)} 
      />

      {selectedKR && (
        <KRDetailModal 
          krId={selectedKR} 
          isOpen={!!selectedKR} 
          onClose={() => setSelectedKR(null)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}