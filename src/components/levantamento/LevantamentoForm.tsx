"use client";

import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, ChevronRight, ChevronLeft, Clock, TrendingUp, Zap, Star, Rocket, Save, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import type { TablesInsert } from "@/integrations/supabase/types";

const STORAGE_KEY = "sismais-10k-form-data";

// --- 1. Schema de Validação (Zod) ---
const scoreSchema = z.coerce.number().min(1, "Obrigatório").max(5, "Obrigatório");
const satisfacaoSchema = z.coerce.number().min(0, "Obrigatório").max(10, "Obrigatório");

const formSchema = z.object({
  colaborador_nome: z.string().min(2, "Nome é obrigatório"),
  funcao_atual: z.string().min(2, "Função é obrigatória"),
  satisfacao_trabalho: satisfacaoSchema,
  talento_oculto: z.string().max(255).optional(),
  
  rotina_diaria: z.string().min(20, "Descreva sua rotina diária"),
  expectativa_empresa: z.string().min(20, "Descreva o que a empresa espera do seu trabalho"),
  definicao_sucesso: z.string().min(20, "Defina o que é cumprir bem o seu trabalho"),
  sentimento_valorizacao: z.string().min(20, "Descreva se e por que você se sente valorizado"),

  atividades_top5: z.string().min(20, "Detalhe suas 5 principais atividades"),
  ladrao_tempo: z.string().min(20, "Descreva o principal ladrão de tempo"),
  ferramentas_uso: z.string().min(5, "Liste as ferramentas que você usa"),
  interdependencias: z.string().min(20, "Descreva suas interdependências"),
  start_action: z.string().min(10, "O que devemos começar a fazer?"),
  stop_action: z.string().min(10, "O que devemos parar de fazer?"),
  continue_action: z.string().min(10, "O que devemos manter?"),
  reclamacao_cliente: z.string().min(10, "Qual a maior reclamação?"),
  prioridades_setor: z.string().min(20, "Liste 5 prioridades para o seu setor"),

  visao_papel_10k: z.string().min(20, "Descreva seu papel no cenário 10K"),
  falta_plano_2026: z.string().min(10, "O que não pode faltar no plano estratégico?"),
  falta_metas_2025: z.string().min(10, "O que faltou para atingirmos as metas?"),
  score_autonomia: scoreSchema,
  score_maestria: scoreSchema,
  score_proposito: scoreSchema,
  score_financeiro: scoreSchema,
  score_ambiente: scoreSchema,
  
  interesse_lideranca: z.enum(["sim", "nao"], { required_error: "Obrigatório" }),
  motivo_lideranca: z.string().min(20, "Obrigatório detalhar o motivo").optional(),
  papel_bom_lider: z.string().min(20, "Obrigatório descrever o papel do líder").optional(),
  
  maior_sonho: z.string().min(20, "Compartilhe seu maior sonho conosco"),
});

type FormData = z.infer<typeof formSchema>;
type LevantamentoInsert = TablesInsert<"levantamento_operacional_2024">;

// --- 2. Configuração das Abas ---
const TABS = [
  { id: "rotina", label: "Rotina & Foco", icon: Clock, fields: ["rotina_diaria", "expectativa_empresa", "definicao_sucesso", "sentimento_valorizacao"] },
  { id: "gargalos", label: "Gargalos & Ação", icon: Zap, fields: ["atividades_top5", "ladrao_tempo", "ferramentas_uso", "interdependencias", "start_action", "stop_action", "continue_action", "reclamacao_cliente", "prioridades_setor"] },
  { id: "cultura", label: "Visão & Estratégia", icon: Star, fields: ["visao_papel_10k", "falta_plano_2026", "falta_metas_2025", "score_autonomia", "score_maestria", "score_proposito", "score_financeiro", "score_ambiente"] },
  { id: "lideranca", label: "Liderança & Finalização", icon: TrendingUp, fields: ["interesse_lideranca", "motivo_lideranca", "papel_bom_lider", "colaborador_nome", "funcao_atual", "satisfacao_trabalho", "talento_oculto", "maior_sonho"] },
];

// --- 3. Componente de Rating ---
const RatingInput = ({ label, name, control, error }: { label: string; name: keyof FormData; control: any; error: string | undefined }) => (
  <div className="space-y-2">
    <Label className="flex items-center justify-between font-medium">
      <span>{label} (1-5)</span>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </Label>
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <RadioGroup onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString() || ""} className="flex justify-between p-2 border rounded-lg bg-muted/30">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex flex-col items-center space-y-1">
              <Label htmlFor={`${name}-${s}`} className="text-xs text-muted-foreground">{s}</Label>
              <RadioGroupItem value={s.toString()} id={`${name}-${s}`} className="w-6 h-6" />
            </div>
          ))}
        </RadioGroup>
      )}
    />
  </div>
);

// --- 4. Componente de Pergunta com Dica ---
const QuestionField = ({ label, hint, name, control, error, placeholder, rows = 3 }: { label: string; hint: string; name: keyof FormData; control: any; error: any; placeholder?: string; rows?: number }) => (
  <div className="space-y-2">
    <Label className="text-base font-semibold">{label}</Label>
    <p className="text-xs text-muted-foreground italic mb-2">💡 {hint}</p>
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Textarea {...field} rows={rows} placeholder={placeholder} className={cn(error && "border-destructive")} />
      )}
    />
    {error && <p className="text-xs text-destructive">{error.message}</p>}
  </div>
);

export function LevantamentoForm() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isStarted, setIsStarted] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const savedData = useMemo(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: savedData || {
      colaborador_nome: profile?.nome || "",
      funcao_atual: profile?.departamento || "",
      satisfacao_trabalho: 0,
      interesse_lideranca: undefined,
    },
  });

  const { control, handleSubmit, formState: { errors, isSubmitting }, trigger, watch, reset } = form;
  const interesseLideranca = watch("interesse_lideranca");

  useEffect(() => {
    const subscription = watch((value) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: LevantamentoInsert = {
        colaborador_nome: data.colaborador_nome,
        funcao_atual: data.funcao_atual,
        satisfacao_trabalho: data.satisfacao_trabalho,
        talento_oculto: data.talento_oculto || null,
        rotina_diaria: data.rotina_diaria,
        expectativa_empresa: data.expectativa_empresa,
        definicao_sucesso: data.definicao_sucesso,
        sentimento_valorizacao: data.sentimento_valorizacao,
        atividades_top5: data.atividades_top5,
        ladrao_tempo: data.ladrao_tempo,
        ferramentas_uso: data.ferramentas_uso,
        interdependencias: data.interdependencias,
        start_action: data.start_action,
        stop_action: data.stop_action,
        continue_action: data.continue_action,
        reclamacao_cliente: data.reclamacao_cliente,
        prioridades_setor: data.prioridades_setor,
        visao_papel_10k: data.visao_papel_10k,
        falta_plano_2026: data.falta_plano_2026,
        falta_metas_2025: data.falta_metas_2025,
        score_autonomia: data.score_autonomia,
        score_maestria: data.score_maestria,
        score_proposito: data.score_proposito,
        score_financeiro: data.score_financeiro,
        score_ambiente: data.score_ambiente,
        interesse_lideranca: data.interesse_lideranca === "sim",
        motivo_lideranca: data.motivo_lideranca || null,
        papel_bom_lider: data.papel_bom_lider || null,
        maior_sonho: data.maior_sonho,
      };

      const { error } = await supabase.from("levantamento_operacional_2024").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["levantamento-operacional"] });
      localStorage.removeItem(STORAGE_KEY);
      setIsSubmitted(true);
      toast({ title: "✅ Sucesso!", description: "Obrigado! Suas respostas ajudarão a construir o futuro da Sismais." });
    },
    onError: (error) => {
      console.error(error);
      toast({ title: "❌ Erro ao salvar", description: "Tente novamente mais tarde.", variant: "destructive" });
    },
  });

  const handleNext = async () => {
    const currentIndex = TABS.findIndex(t => t.id === activeTab);
    if (currentIndex < TABS.length - 1) {
      const isValid = await trigger(TABS[currentIndex].fields as any);
      if (isValid) {
        setActiveTab(TABS[currentIndex + 1].id);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      else toast({ title: "⚠️ Preencha os campos obrigatórios", variant: "destructive" });
    }
  };

  const handlePrev = () => {
    const currentIndex = TABS.findIndex(t => t.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSaveDraft = () => {
    const data = watch();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    toast({
      title: "🚀 Progresso Salvo!",
      description: "Seus dados estão seguros neste navegador. Você pode fechar esta aba e voltar quando quiser!",
    });
  };

  const handleClearData = () => {
    if (confirm("Tem certeza que deseja apagar todos os dados digitados e começar de novo?")) {
      localStorage.removeItem(STORAGE_KEY);
      reset({
        colaborador_nome: profile?.nome || "",
        funcao_atual: profile?.departamento || "",
        satisfacao_trabalho: 0,
        interesse_lideranca: undefined,
      });
      setActiveTab(TABS[0].id);
      toast({ title: "Dados resetados", description: "O formulário foi limpo com sucesso." });
    }
  };

  if (isSubmitted) return (
    <Card className="max-w-xl mx-auto text-center"><CardContent className="pt-8 pb-6 space-y-4">
      <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="h-8 w-8 text-green-600" /></div>
      <h2 className="text-2xl font-bold text-green-700">Obrigado!</h2>
      <p className="text-muted-foreground">Suas respostas ajudarão a construir o futuro da Sismais.</p>
    </CardContent></Card>
  );

  if (!isStarted) return (
    <Card className="max-w-2xl mx-auto overflow-hidden">
      <div className="bg-primary/10 p-8 text-center border-b">
        <Rocket className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-3xl font-heading font-bold text-foreground">Construindo a Sismais 10K 🚀</h2>
        <p className="text-lg text-primary font-medium mt-2">Sua voz vai desenhar nosso Planejamento 2026.</p>
      </div>
      <CardContent className="p-8 space-y-6">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p>Estamos iniciando a jornada para levar a Sismais de 1.400 para 10.000 clientes. Para chegar lá, não podemos apenas trabalhar mais; precisamos trabalhar melhor.</p>
          <p>Este formulário não é uma avaliação de desempenho. É um <strong>mapeamento estratégico</strong>. Queremos entender a realidade do seu dia a dia — o que te motiva, o que te atrapalha e onde estão os gargalos que você vê e nós não vemos.</p>
          <div className="bg-muted p-4 rounded-lg shadow-sm">
            <p className="font-bold mb-2">O pacto de transparência:</p>
            <ul className="space-y-2 list-none p-0">
              <li>🎯 <strong>Sinceridade Radical:</strong> Se um processo é ruim, diga. Se uma ferramenta atrapalha, aponte.</li>
              <li>🤝 <strong>Sem Julgamentos:</strong> Não existem respostas erradas. Estamos avaliando processos, não pessoas.</li>
              <li>📈 <strong>Foco no Futuro:</strong> Suas respostas ajudarão a definir onde investiremos e como sua carreira pode evoluir conosco.</li>
            </ul>
          </div>
          <p className="text-center font-medium">Vamos juntos construir o próximo nível?</p>
        </div>
        <div className="text-center space-y-3">
          <Button size="lg" className="w-full sm:w-auto px-12" onClick={() => setIsStarted(true)}>Iniciar Mapeamento</Button>
          <p className="text-xs text-muted-foreground">Tempo estimado: 10-15 minutos.</p>
          {savedData && (
             <p className="text-xs text-primary font-medium">✨ Você possui um rascunho salvo!</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card className="max-w-4xl mx-auto border-t-4 border-primary shadow-lg">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-heading">Mapeamento Sismais</CardTitle>
        <CardDescription>Responda com calma. Seu progresso é salvo automaticamente.</CardDescription>
        <div className="flex justify-center gap-2 mt-2">
           <Button variant="ghost" size="sm" type="button" onClick={handleSaveDraft} className="text-xs text-primary">
             <Save className="w-3 h-3 mr-1" /> Salvar Rascunho
           </Button>
           <Button variant="ghost" size="sm" type="button" onClick={handleClearData} className="text-xs text-muted-foreground">
             <RotateCcw className="w-3 h-3 mr-1" /> Limpar Tudo
           </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 h-auto bg-muted/50 p-1 rounded-xl">
            {TABS.map(t => (
              <TabsTrigger key={t.id} value={t.id} className="flex flex-col gap-1 py-3 data-[state=active]:bg-background shadow-sm transition-all rounded-lg">
                <t.icon className="w-4 h-4" />
                <span className="text-[10px] sm:text-xs font-medium">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="mt-8 space-y-8">
            {/* --- ABA 1: ROTINA --- */}
            <TabsContent value="rotina" className="space-y-8 mt-0 focus-visible:outline-none">
              <QuestionField 
                label="1. Como é o seu dia a dia na Sismais (desde quando chega até ir embora)?"
                hint="Dê detalhes sobre sua rotina, horários e as principais tarefas recorrentes."
                name="rotina_diaria"
                control={control}
                error={errors.rotina_diaria}
                placeholder="Ex: Chego às 8h, verifico o dashboard, respondo tickets de urgência, faço reunião com time..."
              />
              <QuestionField 
                label="2. Na sua visão, o que a empresa espera do seu trabalho?"
                hint="Quais são os principais resultados ou comportamentos que você acredita que a gestão valoriza em você?"
                name="expectativa_empresa"
                control={control}
                error={errors.expectativa_empresa}
              />
              <QuestionField 
                label="3. Para você, o que define se você está cumprindo bem o seu trabalho?"
                hint="Pense nos critérios que te dão a sensação de dever cumprido ao final do dia."
                name="definicao_sucesso"
                control={control}
                error={errors.definicao_sucesso}
              />
              <QuestionField 
                label="4. Você se sente valorizado? Por quê?"
                hint="Fale sobre reconhecimento, ambiente e suporte da liderança."
                name="sentimento_valorizacao"
                control={control}
                error={errors.sentimento_valorizacao}
              />
            </TabsContent>

            {/* --- ABA 2: GARGALOS --- */}
            <TabsContent value="gargalos" className="space-y-8 mt-0 focus-visible:outline-none">
              <QuestionField 
                label="5. Liste suas 5 principais atividades (em ordem de importância)"
                hint="O que é o coração do seu trabalho?"
                name="atividades_top5"
                control={control}
                error={errors.atividades_top5}
              />
              <QuestionField 
                label="6. Qual é o seu maior 'Ladrão de Tempo'?"
                hint="Aquelas tarefas burocráticas ou manuais que te impedem de focar no que realmente importa."
                name="ladrao_tempo"
                control={control}
                error={errors.ladrao_tempo}
              />
              <div className="space-y-2">
                <Label className="text-base font-semibold">7. Quais ferramentas/softwares você usa diariamente?</Label>
                <p className="text-xs text-muted-foreground italic mb-2">💡 Sistemas, extensões, planilhas, etc.</p>
                <Controller name="ferramentas_uso" control={control} render={({ field }) => <Input {...field} className={cn(errors.ferramentas_uso && "border-destructive")} />} />
                {errors.ferramentas_uso && <p className="text-xs text-destructive">{errors.ferramentas_uso.message}</p>}
              </div>
              <QuestionField 
                label="8. Quem depende do seu trabalho e de quem você depende?"
                hint="Explique o fluxo de entrega entre você e as outras áreas."
                name="interdependencias"
                control={control}
                error={errors.interdependencias}
              />
              <div className="grid sm:grid-cols-3 gap-6 p-4 bg-muted/30 rounded-xl border">
                <QuestionField label="START" hint="O que começar?" name="start_action" control={control} error={errors.start_action} rows={2} />
                <QuestionField label="STOP" hint="O que parar?" name="stop_action" control={control} error={errors.stop_action} rows={2} />
                <QuestionField label="CONTINUE" hint="O que manter?" name="continue_action" control={control} error={errors.continue_action} rows={2} />
              </div>
              <QuestionField 
                label="9. Qual a maior reclamação recorrente dos clientes?"
                hint="O que você mais ouve de 'dor' do cliente no dia a dia?"
                name="reclamacao_cliente"
                control={control}
                error={errors.reclamacao_cliente}
              />
              <QuestionField 
                label="10. Liste 5 prioridades que devemos focar no seu setor:"
                hint="Se você fosse o gestor, o que atacaria primeiro para chegarmos aos 10K?"
                name="prioridades_setor"
                control={control}
                error={errors.prioridades_setor}
              />
            </TabsContent>

            {/* --- ABA 3: CULTURA --- */}
            <TabsContent value="cultura" className="space-y-8 mt-0 focus-visible:outline-none">
              <QuestionField 
                label="11. O que não pode faltar no nosso plano estratégico de 2026?"
                hint="Pense em inovação, processos, infraestrutura ou pessoas."
                name="falta_plano_2026"
                control={control}
                error={errors.falta_plano_2026}
              />
              <QuestionField 
                label="12. O que faltou para atingirmos as metas de 2025?"
                hint="Analise os obstáculos que enfrentamos no último ciclo."
                name="falta_metas_2025"
                control={control}
                error={errors.falta_metas_2025}
              />
              <QuestionField 
                label="13. Como você vê seu papel quando atingirmos 10.000 clientes?"
                hint="Imagine a empresa grande: como você quer estar nela?"
                name="visao_papel_10k"
                control={control}
                error={errors.visao_papel_10k}
              />
              <div className="grid sm:grid-cols-2 gap-6 p-6 border rounded-xl bg-primary/5">
                <RatingInput label="Autonomia" name="score_autonomia" control={control} error={errors.score_autonomia?.message} />
                <RatingInput label="Maestria" name="score_maestria" control={control} error={errors.score_maestria?.message} />
                <RatingInput label="Propósito" name="score_proposito" control={control} error={errors.score_proposito?.message} />
                <RatingInput label="Financeiro" name="score_financeiro" control={control} error={errors.score_financeiro?.message} />
                <RatingInput label="Ambiente" name="score_ambiente" control={control} error={errors.score_ambiente?.message} />
              </div>
            </TabsContent>

            {/* --- ABA 4: LIDERANÇA & FINALIZAÇÃO --- */}
            <TabsContent value="lideranca" className="space-y-8 mt-0 focus-visible:outline-none">
              <div className="space-y-6 p-6 border rounded-xl bg-muted/20">
                <div className="space-y-2">
                  <Label className="text-lg font-bold">14. Você tem interesse em ser Líder na empresa? *</Label>
                  <p className="text-xs text-muted-foreground italic mb-4">💡 Líder não é apenas cargo, é influência e gestão de pessoas.</p>
                  <Controller name="interesse_lideranca" control={control} render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-10">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="l-sim" className="w-5 h-5" /><Label htmlFor="l-sim" className="text-base">Sim</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="l-nao" className="w-5 h-5" /><Label htmlFor="l-nao" className="text-base">Não</Label></div>
                    </RadioGroup>
                  )} />
                  {errors.interesse_lideranca && <p className="text-xs text-destructive">{errors.interesse_lideranca.message}</p>}
                </div>
                {interesseLideranca && (
                  <QuestionField label="15. Por que você tem (ou não) interesse em liderança?" hint="Seja sincero sobre suas motivações ou receios." name="motivo_lideranca" control={control} error={errors.motivo_lideranca} />
                )}
                <QuestionField label="16. Na sua visão, qual é o papel de um bom líder?" hint="Quais qualidades você mais admira em um gestor?" name="papel_bom_lider" control={control} error={errors.papel_bom_lider} />
              </div>

              <div className="grid sm:grid-cols-2 gap-6 border-t pt-8">
                <div className="space-y-2"><Label className="font-bold text-base">Seu Nome *</Label><Controller name="colaborador_nome" control={control} render={({ field }) => <Input {...field} placeholder="Digite seu nome completo" className={cn(errors.colaborador_nome && "border-destructive")} />} />{errors.colaborador_nome && <p className="text-xs text-destructive">{errors.colaborador_nome.message}</p>}</div>
                <div className="space-y-2"><Label className="font-bold text-base">Sua Função Atual *</Label><Controller name="funcao_atual" control={control} render={({ field }) => <Input {...field} placeholder="Ex: Analista de Suporte" className={cn(errors.funcao_atual && "border-destructive")} />} />{errors.funcao_atual && <p className="text-xs text-destructive">{errors.funcao_atual.message}</p>}</div>
              </div>
              <div className="space-y-4">
                <Label className="font-bold text-base">17. De 0 a 10, quão satisfeito você está com seu trabalho hoje? *</Label>
                <Controller name="satisfacao_trabalho" control={control} render={({ field }) => (
                  <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString() || ""}>
                    <SelectTrigger className={cn("w-full h-12", errors.satisfacao_trabalho && "border-destructive")}><SelectValue placeholder="Selecione de 0 a 10" /></SelectTrigger>
                    <SelectContent>{Array.from({ length: 11 }, (_, i) => <SelectItem key={i} value={i.toString()}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
                {errors.satisfacao_trabalho && <p className="text-xs text-destructive">{errors.satisfacao_trabalho.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-base">18. A Pergunta de Ouro: Algum talento seu não está sendo usado hoje?</Label>
                <p className="text-xs text-muted-foreground italic mb-2">💡 Algo que você faz muito bem fora daqui, mas não faz no trabalho.</p>
                <Controller name="talento_oculto" control={control} render={({ field }) => <Input {...field} placeholder="Ex: Programação, Design, Oratória..." />} />
              </div>

              {/* SEÇÃO FINAL: O COMBUSTÍVEL */}
              <div className="mt-12 p-8 border-2 border-primary/30 rounded-3xl bg-primary/5 shadow-inner space-y-6">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-primary rounded-xl text-primary-foreground shadow-lg"><Rocket className="w-6 h-6" /></div>
                   <h3 className="text-2xl font-heading font-bold text-primary">O Combustível 🚀</h3>
                </div>
                
                <div className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                  <p className="text-lg">Aqui na Sismais, nós trabalhamos por sonhos.</p>
                  <p>Acreditamos que o trabalho não é o fim, mas o meio. A Sismais é o veículo que estamos construindo juntos para nos levar a lugares onde sozinhos não chegaríamos.</p>
                  <p>Nossa meta de 10.000 clientes é ambiciosa, mas ela só faz sentido se servir de alavanca para as suas conquistas pessoais. Seja a casa própria, a viagem internacional, a independência financeira, a formação dos filhos ou até mesmo empreender o seu próprio negócio um dia.</p>
                  <p className="font-bold text-foreground text-lg italic bg-primary/10 p-4 rounded-lg">Para que eu possa ajudar a alinhar o crescimento da empresa com o seu crescimento pessoal, eu preciso saber o que faz o seu olho brilhar.</p>
                </div>

                <div className="space-y-4 pt-6 border-t border-primary/20">
                  <div className="flex items-start gap-2">
                    <span className="text-3xl mt-1">🌟</span>
                    <div className="space-y-1">
                      <Label className="text-xl font-bold text-foreground leading-tight">Qual é o seu MAIOR SONHO para os próximos 5 anos? *</Label>
                      <p className="text-sm text-muted-foreground italic">Não se preocupe se parecer grande demais ou distante. Compartilhe aquilo que realmente te move.</p>
                    </div>
                  </div>
                  <Controller
                    name="maior_sonho"
                    control={control}
                    render={({ field }) => (
                      <Textarea 
                        {...field} 
                        rows={6} 
                        placeholder="Escreva aqui sobre suas ambições pessoais e sonhos..." 
                        className={cn("bg-background text-lg p-5 border-primary/20 focus:border-primary rounded-xl shadow-sm min-h-[150px]", errors.maior_sonho && "border-destructive")}
                      />
                    )}
                  />
                  {errors.maior_sonho && <p className="text-xs text-destructive font-medium">{errors.maior_sonho.message}</p>}
                </div>
              </div>
            </TabsContent>

            <div className="flex justify-between pt-8 border-t gap-4">
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="lg" className="rounded-xl px-8" onClick={handlePrev} disabled={activeTab === TABS[0].id}><ChevronLeft className="mr-2 h-4 w-4" /> Anterior</Button>
                <Button type="button" variant="ghost" size="lg" className="rounded-xl px-4 text-primary hover:bg-primary/10" onClick={handleSaveDraft}>
                  <Save className="w-4 h-4 mr-2" /> Salvar e Voltar Depois
                </Button>
              </div>
              
              {activeTab !== TABS[TABS.length - 1].id ? (
                <Button type="button" size="lg" className="rounded-xl px-8 shadow-md" onClick={handleNext}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button>
              ) : (
                <Button type="submit" size="lg" className="bg-primary hover:bg-primary/90 px-10 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95" disabled={isSubmitting || saveMutation.isPending}>
                  {isSubmitting || saveMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />} 
                  Enviar Mapeamento
                </Button>
              )}
            </div>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
}