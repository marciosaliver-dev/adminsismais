"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRadar } from "@/contexts/RadarContext.tsx";
import { usePermissoesRadar } from "@/hooks/usePermissoesRadar.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label"; // Importação adicionada
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Settings, Plus, Pencil, Trash2, Calendar, Target, 
  ChevronRight, AlertCircle, Loader2, Rocket, Star,
  TrendingUp, Activity, CheckCircle2, XCircle
} from "lucide-react";
import { CicloModal } from "@/components/radar/gestao/CicloModal.tsx";
import { ObjetivoModal } from "@/components/radar/gestao/ObjetivoModal.tsx";
import { KRModal } from "@/components/radar/gestao/KRModal.tsx";
import { ProgressBar } from "@/components/radar/ProgressBar.tsx";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast"; // Importação adicionada
import type { Tables } from "@/integrations/supabase/types";

export default function RadarGestao() {
  const queryClient = useQueryClient();
  const { podeGerenciarOKRs, isProprietario, isGestor, area: areaGestor, loading: loadingPerm } = usePermissoesRadar();
  const { ciclos, cicloAtivo: cicloContexto } = useRadar();
  
  // Abas e Modais
  const [activeTab, setActiveTab] = useState("ciclos");
  const [modalCiclo, setModalCiclo] = useState<{ open: boolean, data: Tables<"ciclos_okr"> | null }>({ open: false, data: null });
  const [modalObj, setModalObj] = useState<{ open: boolean, data: Tables<"objetivos_okr"> | null }>({ open: false, data: null });
  const [modalKR, setModalKR] = useState<{ open: boolean, data: Tables<"key_results"> | null }>({ open: false, data: null });
  
  // Confirmações
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean, type: 'ciclo' | 'obj' | 'kr', id: string } | null>(null);

  // Filtros contextuais (Aba Obj/KR)
  const [filtroCicloId, setFiltroCicloId] = useState<string>("");
  const cicloSelecionadoId = filtroCicloId || cicloContexto?.id || "";

  // 1. Fetch Dados da Aba Ciclos
  const { data: listaCiclos = [], isLoading: loadingCiclos } = useQuery({
    queryKey: ["ciclos_okr_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ciclos_okr").select("*").order("data_inicio", { ascending: false });
      if (error) throw error;
      return data as Tables<"ciclos_okr">[];
    }
  });

  // 2. Fetch Dados da Aba Objetivos
  const { data: listaObjetivos = [], isLoading: loadingObjetivos } = useQuery({
    queryKey: ["gestao_objetivos", cicloSelecionadoId],
    queryFn: async () => {
      if (!cicloSelecionadoId) return [];
      const { data, error } = await supabase
        .from("objetivos_okr")
        .select(`
          *,
          responsavel:membros_radar!objetivos_okr_responsavel_id_fkey(nome, avatar_url),
          krs:key_results(id)
        `)
        .eq("ciclo_id", cicloSelecionadoId)
        .order("area");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!cicloSelecionadoId
  });

  // 3. Fetch Dados da Aba KRs
  const { data: listaKRs = [], isLoading: loadingKRs } = useQuery({
    queryKey: ["gestao_krs", cicloSelecionadoId],
    queryFn: async () => {
      if (!cicloSelecionadoId) return [];
      const { data, error } = await supabase
        .from("key_results")
        .select(`
          *,
          objetivo:objetivos_okr!key_results_objetivo_id_fkey(id, titulo, area, ciclo_id),
          responsavel:membros_radar!key_results_responsavel_id_fkey(nome, avatar_url),
          cache:calculos_kr_cache(progresso_percentual, status)
        `)
        .order("created_at");
      
      if (error) throw error;
      
      // Filtrar via JS para garantir que o objetivo pertence ao ciclo
      return (data as any[]).filter(kr => kr.objetivo?.ciclo_id === cicloSelecionadoId);
    },
    enabled: !!cicloSelecionadoId
  });

  // Filtragem por permissão de área (Gestor)
  const objetivosPermitidos = useMemo(() => {
    if (isProprietario) return listaObjetivos;
    return listaObjetivos.filter(o => o.area === areaGestor);
  }, [listaObjetivos, isProprietario, areaGestor]);

  const krsPermitidos = useMemo(() => {
    if (isProprietario) return listaKRs;
    return listaKRs.filter(k => k.objetivo?.area === areaGestor);
  }, [listaKRs, isProprietario, areaGestor]);

  // Mutations de Deleção
  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'ciclo' | 'obj' | 'kr', id: string }) => {
      const table = type === 'ciclo' ? 'ciclos_okr' : type === 'obj' ? 'objetivos_okr' : 'key_results';
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({ title: "Removido", description: "Item excluído com sucesso." });
      setDeleteDialog(null);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro ao excluir", description: "Certifique-se que o item não possui dependências." });
    }
  });

  if (loadingPerm) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
  if (!podeGerenciarOKRs) return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h2 className="text-xl font-bold">Acesso Restrito</h2>
      <p className="text-muted-foreground">Você não possui permissão para acessar as ferramentas de gestão estratégica.</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Gestão de OKRs</h1>
            <p className="text-muted-foreground">Arquitete a estratégia da empresa definindo ciclos e métricas.</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="ciclos" className="gap-2"><Calendar className="w-4 h-4" /> Ciclos</TabsTrigger>
          <TabsTrigger value="objetivos" className="gap-2"><Target className="w-4 h-4" /> Objetivos</TabsTrigger>
          <TabsTrigger value="krs" className="gap-2"><Activity className="w-4 h-4" /> Key Results</TabsTrigger>
        </TabsList>

        {/* Aba 1: Ciclos */}
        <TabsContent value="ciclos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Histórico de Ciclos</CardTitle>
                <CardDescription>Gerencie os períodos de vigência das metas.</CardDescription>
              </div>
              <Button onClick={() => setModalCiclo({ open: true, data: null })} size="sm">
                <Plus className="w-4 h-4 mr-2" /> Novo Ciclo
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingCiclos ? <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow> :
                     listaCiclos.map(ciclo => (
                      <TableRow key={ciclo.id}>
                        <TableCell className="font-bold">{ciclo.nome}</TableCell>
                        <TableCell>{ciclo.tipo}</TableCell>
                        <TableCell className="text-xs">
                          {format(parseISO(ciclo.data_inicio), "dd/MM/yy")} — {format(parseISO(ciclo.data_fim), "dd/MM/yy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ciclo.status === 'Ativo' ? 'default' : ciclo.status === 'Planejamento' ? 'secondary' : 'outline'}>
                            {ciclo.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => setModalCiclo({ open: true, data: ciclo })}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteDialog({ open: true, type: 'ciclo', id: ciclo.id })} disabled={ciclo.status === 'Ativo'}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 2: Objetivos */}
        <TabsContent value="objetivos" className="space-y-6">
          <div className="flex items-center gap-4 bg-card p-4 border rounded-xl shadow-sm">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ciclo de Visualização:</Label>
            <Select value={cicloSelecionadoId} onValueChange={setFiltroCicloId}>
              <SelectTrigger className="w-64 h-9"><SelectValue placeholder="Selecione o Ciclo" /></SelectTrigger>
              <SelectContent>
                {ciclos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button onClick={() => setModalObj({ open: true, data: null })} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Novo Objetivo
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-center">Peso</TableHead>
                    <TableHead className="text-center">KRs</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingObjetivos ? <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow> :
                   objetivosPermitidos.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">Nenhum objetivo encontrado para os filtros selecionados.</TableCell></TableRow> :
                   objetivosPermitidos.map(obj => (
                    <TableRow key={obj.id}>
                      <TableCell className="font-bold max-w-[300px]">{obj.titulo}</TableCell>
                      <TableCell><Badge variant="outline">{obj.area}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={obj.responsavel?.avatar_url} />
                            <AvatarFallback>{obj.responsavel?.nome?.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{obj.responsavel?.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center text-amber-500">
                          {Array.from({ length: obj.peso || 1 }).map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{obj.krs?.[0]?.count || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setModalObj({ open: true, data: obj })}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteDialog({ open: true, type: 'obj', id: obj.id })}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 3: Key Results */}
        <TabsContent value="krs" className="space-y-6">
          <div className="flex items-center gap-4 bg-card p-4 border rounded-xl shadow-sm">
            <div className="flex items-center gap-4">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ciclo:</Label>
              <Select value={cicloSelecionadoId} onValueChange={setFiltroCicloId}>
                <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ciclos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1" />
            <Button onClick={() => setModalKR({ open: true, data: null })} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Novo Key Result
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>KR</TableHead>
                    <TableHead>Objetivo Pai</TableHead>
                    <TableHead>Meta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="w-[120px]">Progresso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingKRs ? <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow> :
                   krsPermitidos.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground italic">Nenhum Key Result encontrado.</TableCell></TableRow> :
                   krsPermitidos.map(kr => (
                    <TableRow key={kr.id}>
                      <TableCell className="font-bold text-sm">{kr.titulo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{kr.objetivo?.titulo}</TableCell>
                      <TableCell className="text-xs font-mono">{kr.meta} {kr.unidade}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase">{kr.tipo_meta}</Badge>
                      </TableCell>
                      <TableCell>
                         <Avatar className="h-6 w-6">
                            <AvatarImage src={kr.responsavel?.avatar_url} />
                            <AvatarFallback>{kr.responsavel?.nome?.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                      </TableCell>
                      <TableCell>
                        <ProgressBar progresso={kr.cache?.progresso_percentual || 0} status={kr.cache?.status || 'Crítico'} height="sm" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setModalKR({ open: true, data: kr })}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteDialog({ open: true, type: 'kr', id: kr.id })}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <CicloModal isOpen={modalCiclo.open} onClose={() => setModalCiclo({ open: false, data: null })} editingCiclo={modalCiclo.data} />
      <ObjetivoModal isOpen={modalObj.open} onClose={() => setModalObj({ open: false, data: null })} cicloId={cicloSelecionadoId} editingObj={modalObj.data} />
      <KRModal isOpen={modalKR.open} onClose={() => setModalKR({ open: false, data: null })} objetivos={objetivosPermitidos} editingKR={modalKR.data} />

      {/* Alertas de Deleção */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog?.type === 'ciclo' ? "Deletar este ciclo apagará TODOS os objetivos e KRs vinculados. Esta ação é irreversível." :
               deleteDialog?.type === 'obj' ? "Deletar este objetivo apagará TODOS os KRs vinculados. Esta ação é irreversível." :
               "Deletar este KR apagará TODOS os lançamentos de histórico vinculados. Esta ação é irreversível."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteDialog && deleteMutation.mutate({ type: deleteDialog.type, id: deleteDialog.id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sim, Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}