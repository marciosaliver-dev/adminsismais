import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRadar } from "@/contexts/RadarContext.tsx";
import { usePermissoesRadar } from "@/hooks/usePermissoesRadar.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, Plus, Pencil, Trash2, Calendar, Target, 
  ChevronRight, AlertCircle, Loader2, Rocket
} from "lucide-react";
import { CicloFormModal } from "@/components/radar/gestao/CicloFormModal.tsx";
import { ObjetivoFormModal } from "@/components/radar/gestao/ObjetivoFormModal.tsx";
import { KRFormModal } from "@/components/radar/gestao/KRFormModal.tsx";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RadarGestao() {
  const { podeGerenciarOKRs, loading: loadingPerm } = usePermissoesRadar();
  const { ciclos, cicloAtivo, selecionarCiclo } = useRadar();
  
  const [activeTab, setActiveTab] = useState("estrutura");
  const [isCicloModalOpen, setIsCicloModalOpen] = useState(false);
  const [isObjModalOpen, setIsObjModalOpen] = useState(false);
  const [isKRModalOpen, setIsKRModalOpen] = useState(false);
  
  const [selectedObjId, setSelectedObjId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Fetch Objetivos e KRs do ciclo selecionado
  const { data: estrutura, isLoading: loadingEstrutura } = useQuery({
    queryKey: ["gestao-estrutura", cicloAtivo?.id],
    queryFn: async () => {
      if (!cicloAtivo?.id) return null;
      const { data: objetivos } = await supabase.from("objetivos_okr").select("*").eq("ciclo_id", cicloAtivo.id);
      const objIds = objetivos?.map(o => o.id) || [];
      const { data: krs } = objIds.length > 0 
        ? await supabase.from("key_results").select("*").in("objetivo_id", objIds)
        : { data: [] };
      
      return { objetivos: objetivos || [], krs: krs || [] };
    },
    enabled: !!cicloAtivo?.id
  });

  if (loadingPerm) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
  if (!podeGerenciarOKRs) return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h2 className="text-xl font-bold">Acesso Restrito</h2>
      <p className="text-muted-foreground">Você não possui permissão para gerenciar a estrutura de OKRs.</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Gestão de OKRs</h1>
            <p className="text-muted-foreground">Configure ciclos, objetivos e metas de sucesso.</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="estrutura" className="gap-2"><Target className="w-4 h-4" /> Estrutura OKR</TabsTrigger>
          <TabsTrigger value="ciclos" className="gap-2"><Calendar className="w-4 h-4" /> Ciclos</TabsTrigger>
        </TabsList>

        <TabsContent value="estrutura" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div className="space-y-1">
                <CardTitle>Planejamento Estratégico</CardTitle>
                <CardDescription>Crie a hierarquia de objetivos para o ciclo selecionado.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={cicloAtivo?.id} onValueChange={selecionarCiclo}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="Selecione o Ciclo" /></SelectTrigger>
                  <SelectContent>
                    {ciclos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={() => { setEditingItem(null); setIsObjModalOpen(true); }} size="sm">
                  <Plus className="w-4 h-4 mr-2" /> Novo Objetivo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingEstrutura ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div> : (
                <div className="divide-y">
                  {estrutura?.objetivos.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">Nenhum objetivo cadastrado para este ciclo.</div>
                  ) : (
                    estrutura?.objetivos.map(obj => (
                      <div key={obj.id} className="p-6 space-y-4 hover:bg-muted/10 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{obj.area}</Badge>
                            <h3 className="text-lg font-bold">{obj.titulo}</h3>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingItem(obj); setIsObjModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>

                        <div className="pl-6 space-y-2 border-l-2 border-muted ml-2">
                          {estrutura.krs.filter(k => k.objetivo_id === obj.id).map(kr => (
                            <div key={kr.id} className="flex items-center justify-between p-2 rounded-lg bg-card border shadow-sm text-sm">
                              <span className="font-medium">{kr.titulo}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">{kr.meta} {kr.unidade}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingItem(kr); setSelectedObjId(obj.id); setIsKRModalOpen(true); }}><Pencil className="w-3 h-3" /></Button>
                              </div>
                            </div>
                          ))}
                          <Button variant="ghost" size="sm" className="text-primary h-8" onClick={() => { setSelectedObjId(obj.id); setEditingItem(null); setIsKRModalOpen(true); }}>
                            <Plus className="w-3 h-3 mr-1" /> Adicionar KR
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ciclos" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ciclos de OKR</CardTitle>
              <Button onClick={() => { setEditingItem(null); setIsCicloModalOpen(true); }} size="sm">
                <Plus className="w-4 h-4 mr-2" /> Novo Ciclo
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {ciclos.map(ciclo => (
                  <Card key={ciclo.id} className="hover:border-primary/50 transition-all">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant={ciclo.status === "Ativo" ? "default" : "secondary"}>{ciclo.status}</Badge>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingItem(ciclo); setIsCicloModalOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      </div>
                      <h3 className="text-xl font-bold">{ciclo.nome}</h3>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(parseISO(ciclo.data_inicio), "dd/MM/yy")} - {format(parseISO(ciclo.data_fim), "dd/MM/yy")}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isCicloModalOpen && <CicloFormModal isOpen={isCicloModalOpen} onClose={() => setIsCicloModalOpen(false)} editingCiclo={editingItem} />}
      {isObjModalOpen && <ObjetivoFormModal isOpen={isObjModalOpen} onClose={() => setIsObjModalOpen(false)} cicloId={cicloAtivo?.id!} editingObj={editingItem} />}
      {isKRModalOpen && <KRFormModal isOpen={isKRModalOpen} onClose={() => setIsKRModalOpen(false)} objetivoId={selectedObjId!} editingKR={editingItem} />}
    </div>
  );
}