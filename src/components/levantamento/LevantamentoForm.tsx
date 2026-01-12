"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
import { Loader2, CheckCircle, ChevronRight, ChevronLeft, Clock, TrendingUp, Zap, Star, Rocket, Save, RotateCcw, ImagePlus, X, Image as ImageIcon } from "lucide-react";
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
  motivo_satisfacao_baixa: z.string().optional(),
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
  fotos_sonhos: z.array(z.string()).optional().default([]),
}).refine((data) => {
  if (data.satisfacao_trabalho < 8 && (!data.motivo_satisfacao_baixa || data.motivo_satisfacao_baixa.length < 20)) {
    return false;
  }
  return true;
}, {
  message: "Por favor, detalhe o motivo da sua insatisfação (mínimo 20 caracteres)",
  path: ["motivo_satisfacao_baixa"],
});

type FormData = z.infer<typeof formSchema>;
type LevantamentoInsert = TablesInsert<"levantamento_operacional_2024">;

// --- 2. Configuração das Abas ---
const TABS = [
  { id: "rotina", label: "Rotina & Foco", icon: Clock, fields: ["rotina_diaria", "expectativa_empresa", "definicao_sucesso", "sentimento_valorizacao"] },
  { id: "gargalos", label: "Gargalos & Ação", icon: Zap, fields: ["atividades_top5", "ladrao_tempo", "ferramentas_uso", "interdependencias", "start_action", "stop_action", "continue_action", "reclamacao_cliente", "prioridades_setor"] },
  { id: "cultura", label: "Visão & Estratégia", icon: Star, fields: ["visao_papel_10k", "falta_plano_2026", "falta_metas_2025", "score_autonomia", "score_maestria", "score_proposito", "score_financeiro", "score_ambiente"] },
  { id: "lideranca", label: "Liderança & Finalização", icon: TrendingUp, fields: ["interesse_lideranca", "motivo_lideranca", "papel_bom_lider", "colaborador_nome", "funcao_atual", "satisfacao_trabalho", "motivo_satisfacao_baixa", "talento_oculto", "maior_sonho", "fotos_sonhos"] },
];

// --- 3. Componente de Rating ---
const RatingInput = ({ label, hint, name, control, error }: { label: string; hint: string; name: keyof FormData; control: any; error: string | undefined }) => (
  <div className="space-y-2">
    <Label className="flex flex-col font-medium">
      <span className="text-base font-semibold">{label}</span>
      <span className="text-xs text-muted-foreground font-normal italic">💡 {hint}</span>
    </Label>
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <RadioGroup onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString() || ""} className="flex justify-between p-3 border rounded-xl bg-muted/30 mt-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex flex-col items-center space-y-1">
              <Label htmlFor={`${name}-${s}`} className="text-xs text-muted-foreground">{s}</Label>
              <RadioGroupItem value={s.toString()} id={`${name}-${s}`} className="w-6 h-6" />
            </div>
          ))}
        </RadioGroup>
      )}
    />
    {error && <p className="text-xs text-destructive">{error}</p>}
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      fotos_sonhos: [],
    },
  });

  const { control, handleSubmit, formState: { errors, isSubmitting }, trigger, watch, reset, setValue } = form;
  const interesseLideranca = watch("interesse_lideranca");
  const satisfacaoTrabalho = watch("satisfacao_trabalho");
  const fotosSonhos = watch("fotos_sonhos") || [];

  useEffect(() => {
    const subscription = watch((value) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // --- Lógica de Upload de Fotos ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newUrls: string[] = [...fotosSonhos];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${profile?.user_id || 'anon'}/${Date.now()}_${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('sonhos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('sonhos')
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }

      setValue("fotos_sonhos", newUrls, { shouldValidate: true });
      toast({ title: "📸 Fotos enviadas!", description: "Suas imagens foram adicionadas ao Mural dos Sonhos." });
    } catch (error) {
      console.error(error);
      toast({ title: "❌ Erro no upload", description: "Não foi possível enviar as fotos.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFoto = (indexToRemove: number) => {
    const newUrls = fotosSonhos.filter((_, index) => index !== indexToRemove);
    setValue("fotos_sonhos", newUrls, { shouldValidate: true });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: LevantamentoInsert = {
        colaborador_nome: data.colaborador_nome,
        funcao_atual: data.funcao_atual,
        satisfacao_trabalho: data.satisfacao_trabalho,
        motivo_satisfacao_baixa: data.motivo_satisfacao_baixa || null,
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
        fotos_sonhos: data.fotos_sonhos,
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
        fotos_sonhos: [],
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
                hint="Conte o que você faz: horários, reuniões e as tarefas que mais se repetem."
                name="rotina_diaria"
                control={control}
                error={errors.rotina_diaria}
                placeholder="Ex: Chego às 8h, verifico o dashboard, respondo tickets de urgência, faço reunião com time..."
              />
              <QuestionField 
                label="2. Na sua visão, o que a empresa espera do seu trabalho?"
                hint="Quais resultados você acha que a gestão mais valoriza na sua função?"
                name="expectativa_empresa"
                control={control}
                error={errors.expectativa_empresa}
              />
              <QuestionField 
                label="3. Para você, o que define se você fez um bom trabalho no final do dia?"
                hint="O que te dá aquela sensação de 'dever cumprido'?"
                name="definicao_sucesso"
                control={control}
                error={errors.definicao_sucesso}
              />
              <QuestionField 
                label="4. Você se sente valorizado? Por quê?"
                hint="Fale sobre o ambiente, reconhecimento e o apoio que você recebe."
                name="sentimento_valorizacao"
                control={control}
                error={errors.sentimento_valorizacao}
              />
            </TabsContent>

            {/* --- ABA 2: GARGALOS --- */}
            <TabsContent value="gargalos" className="space-y-8 mt-0 focus-visible:outline-none">
              <QuestionField 
                label="5. Liste suas 5 principais atividades (as mais importantes)"
                hint="O que é o 'coração' do seu trabalho hoje?"
                name="atividades_top5"
                control={control}
                error={errors.atividades_top5}
              />
              <QuestionField 
                label="6. O que mais 'rouba seu tempo' hoje?"
                hint="Tarefas chatas ou manuais que te impedem de focar no que dá resultado."
                name="ladrao_tempo"
                control={control}
                error={errors.ladrao_tempo}
              />
              <div className="space-y-2">
                <Label className="text-base font-semibold">7. Quais ferramentas você usa todo dia?</Label>
                <p className="text-xs text-muted-foreground italic mb-2">💡 Ex: Excel, Sistemas, WhatsApp, Planilhas específicas...</p>
                <Controller name="ferramentas_uso" control={control} render={({ field }) => <Input {...field} className={cn(errors.ferramentas_uso && "border-destructive")} />} />
                {errors.ferramentas_uso && <p className="text-xs text-destructive">{errors.ferramentas_uso.message}</p>}
              </div>
              <QuestionField 
                label="8. Quem depende do seu trabalho e de quem você depende?"
                hint="Como sua entrega chega em outras pessoas (ou vice-versa)?"
                name="interdependencias"
                control={control}
                error={errors.interdependencias}
              />
              <div className="grid sm:grid-cols-3 gap-6 p-4 bg-muted/30 rounded-xl border">
                <QuestionField label="START (Começar)" hint="O que deveríamos começar a fazer para melhorar?" name="start_action" control={control} error={errors.start_action} rows={2} />
                <QuestionField label="STOP (Parar)" hint="O que deveríamos parar de fazer por ser ineficiente?" name="stop_action" control={control} error={errors.stop_action} rows={2} />
                <QuestionField label="CONTINUE (Manter)" hint="O que está funcionando muito bem e deve continuar?" name="continue_action" control={control} error={errors.continue_action} rows={2} />
              </div>
              <QuestionField 
                label="9. Qual a maior reclamação que você ouve dos clientes?"
                hint="O que o cliente mais 'chora' ou pede no dia a dia?"
                name="reclamacao_cliente"
                control={control}
                error={errors.reclamacao_cliente}
              />
              <QuestionField 
                label="10. Se você mandasse, quais seriam as 5 prioridades do seu setor?"
                hint="O que você atacaria primeiro para a Sismais crescer rápido?"
                name="prioridades_setor"
                control={control}
                error={errors.prioridades_setor}
              />
            </TabsContent>

            {/* --- ABA 3: CULTURA --- */}
            <TabsContent value="cultura" className="space-y-8 mt-0 focus-visible:outline-none">
              <QuestionField 
                label="11. O que não pode faltar no plano da Sismais para 2026?"
                hint="Dê sugestões sobre tecnologia, pessoas, espaço ou novos produtos."
                name="falta_plano_2026"
                control={control}
                error={errors.falta_plano_2026}
              />
              <QuestionField 
                label="12. O que você acha que faltou para batermos as metas de 2025?"
                hint="Seja sincero sobre os obstáculos que atrapalharam o time."
                name="falta_metas_2025"
                control={control}
                error={errors.falta_metas_2025}
              />
              <QuestionField 
                label="13. Como você se vê quando a empresa tiver 10.000 clientes?"
                hint="Imagine a gente grande: onde e como você quer estar?"
                name="visao_papel_10k"
                control={control}
                error={errors.visao_papel_10k}
              />
              <div className="grid sm:grid-cols-2 gap-8 p-6 border rounded-2xl bg-primary/5">
                <RatingInput 
                  label="Autonomia" 
                  hint="Liberdade para decidir como fazer suas tarefas (1 = Mandado, 5 = Decido sozinho)"
                  name="score_autonomia" 
                  control={control} 
                  error={errors.score_autonomia?.message} 
                />
                <RatingInput 
                  label="Maestria" 
                  hint="O quanto você sente que está evoluindo e aprendendo (1 = Estagnado, 5 = Referência)"
                  name="score_maestria" 
                  control={control} 
                  error={errors.score_maestria?.message} 
                />
                <RatingInput 
                  label="Propósito" 
                  hint="O quanto seu trabalho faz diferença na missão da empresa (1 = Só um número, 5 = Faço parte do sonho)"
                  name="score_proposito" 
                  control={control} 
                  error={errors.score_proposito?.message} 
                />
                <RatingInput 
                  label="Financeiro" 
                  hint="Justiça da sua remuneração e bônus (1 = Desvalorizado, 5 = Valor justo)"
                  name="score_financeiro" 
                  control={control} 
                  error={errors.score_financeiro?.message} 
                />
                <RatingInput 
                  label="Ambiente" 
                  hint="Clima com os colegas e infraestrutura (1 = Tenso/Ruim, 5 = Leve/Excelente)"
                  name="score_ambiente" 
                  control={control} 
                  error={errors.score_ambiente?.message} 
                />
              </div>
            </TabsContent>

            {/* --- ABA 4: LIDERANÇA & FINALIZAÇÃO --- */}
            <TabsContent value="lideranca" className="space-y-8 mt-0 focus-visible:outline-none">
              <div className="space-y-6 p-6 border rounded-xl bg-muted/20">
                <div className="space-y-2">
                  <Label className="text-lg font-bold">14. Você tem interesse em ser Líder na empresa? *</Label>
                  <p className="text-xs text-muted-foreground italic mb-4">💡 Líder não é só cargo, é inspirar pessoas e cuidar do time.</p>
                  <Controller name="interesse_lideranca" control={control} render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-10">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="l-sim" className="w-5 h-5" /><Label htmlFor="l-sim" className="text-base">Sim</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="l-nao" className="w-5 h-5" /><Label htmlFor="l-nao" className="text-base">Não</Label></div>
                    </RadioGroup>
                  )} />
                  {errors.interesse_lideranca && <p className="text-xs text-destructive">{errors.interesse_lideranca.message}</p>}
                </div>
                {interesseLideranca && (
                  <QuestionField label="15. Por que você tem (ou não) interesse em liderança?" hint="Fale sobre suas vontades ou o que te dá medo nessa função." name="motivo_lideranca" control={control} error={errors.motivo_lideranca} />
                )}
                <QuestionField label="16. O que é ser um bom líder para você?" hint="Quais atitudes você admira nos seus gestores?" name="papel_bom_lider" control={control} error={errors.papel_bom_lider} />
              </div>

              <div className="grid sm:grid-cols-2 gap-6 border-t pt-8">
                <div className="space-y-2"><Label className="font-bold text-base">Seu Nome *</Label><Controller name="colaborador_nome" control={control} render={({ field }) => <Input {...field} placeholder="Digite seu nome completo" className={cn(errors.colaborador_nome && "border-destructive")} />} />{errors.colaborador_nome && <p className="text-xs text-destructive">{errors.colaborador_nome.message}</p>}</div>
                <div className="space-y-2"><Label className="font-bold text-base">Sua Função Atual *</Label><Controller name="funcao_atual" control={control} render={({ field }) => <Input {...field} placeholder="Ex: Analista de Suporte" className={cn(errors.funcao_atual && "border-destructive")} />} />{errors.funcao_atual && <p className="text-xs text-destructive">{errors.funcao_atual.message}</p>}</div>
              </div>
              <div className="space-y-4">
                <Label className="font-bold text-base">17. De 0 a 10, o quanto você está feliz no trabalho hoje? *</Label>
                <Controller name="satisfacao_trabalho" control={control} render={({ field }) => (
                  <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString() || ""}>
                    <SelectTrigger className={cn("w-full h-12", errors.satisfacao_trabalho && "border-destructive")}><SelectValue placeholder="Selecione de 0 a 10" /></SelectTrigger>
                    <SelectContent>{Array.from({ length: 11 }, (_, i) => <SelectItem key={i} value={i.toString()}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
                {errors.satisfacao_trabalho && <p className="text-xs text-destructive">{errors.satisfacao_trabalho.message}</p>}
                
                {satisfacaoTrabalho !== undefined && satisfacaoTrabalho < 8 && (
                   <div className="mt-4 p-4 border-2 border-amber-200 bg-amber-50 rounded-xl space-y-4">
                     <QuestionField 
                        label="O que falta para essa nota chegar a 10?"
                        hint="Sua opinião sincera nos ajuda a melhorar seu dia a dia de verdade."
                        name="motivo_satisfacao_baixa"
                        control={control}
                        error={errors.motivo_satisfacao_baixa}
                        placeholder="Conte pra gente o que está incomodando e como podemos ajudar..."
                        rows={4}
                     />
                   </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-base">18. Você tem algum talento que a gente ainda não usa?</Label>
                <p className="text-xs text-muted-foreground italic mb-2">💡 Ex: 'Sou muito bom em planilhas', 'Faço design', 'Gosto de gravar vídeos'...</p>
                <Controller name="talento_oculto" control={control} render={({ field }) => <Input {...field} placeholder="Ex: Programação, Oratória, Organização..." />} />
              </div>

              {/* SEÇÃO FINAL: O COMBUSTÍVEL */}
              <div className="mt-12 p-8 border-2 border-primary/30 rounded-3xl bg-primary/5 shadow-inner space-y-6">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-primary rounded-xl text-primary-foreground shadow-lg"><Rocket className="w-6 h-6" /></div>
                   <h3 className="text-2xl font-heading font-bold text-primary">O Combustível 🚀</h3>
                </div>
                
                <div className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                  <p className="text-lg">Aqui na Sismais, nós trabalhamos por sonhos.</p>
                  <p>Acreditamos que a Sismais é o veículo para te levar onde você quer chegar. Para que a gente cresça junto, eu preciso saber o que faz seu olho brilhar.</p>
                </div>

                <div className="space-y-6 pt-6 border-t border-primary/20">
                  <div className="flex items-start gap-2">
                    <span className="text-3xl mt-1">🌟</span>
                    <div className="space-y-1">
                      <Label className="text-xl font-bold text-foreground leading-tight">Qual é o seu MAIOR SONHO para os próximos 5 anos? *</Label>
                      <p className="text-sm text-muted-foreground italic">Pode ser qualquer coisa: casa própria, viagem, estudo, independência...</p>
                    </div>
                  </div>
                  <Controller
                    name="maior_sonho"
                    control={control}
                    render={({ field }) => (
                      <Textarea 
                        {...field} 
                        rows={6} 
                        placeholder="Escreva aqui sobre seus planos e sonhos pessoais..." 
                        className={cn("bg-background text-lg p-5 border-primary/20 focus:border-primary rounded-xl shadow-sm min-h-[150px]", errors.maior_sonho && "border-destructive")}
                      />
                    )}
                  />
                  {errors.maior_sonho && <p className="text-xs text-destructive font-medium">{errors.maior_sonho.message}</p>}

                  <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-primary" />
                      <Label className="text-lg font-bold">Mural dos Sonhos (Fotos)</Label>
                    </div>
                    <p className="text-sm text-muted-foreground italic">Coloque fotos que te inspirem! Pode ser o destino de uma viagem, uma casa, um carro ou sua família.</p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {fotosSonhos.map((url, index) => (
                        <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border bg-muted shadow-sm">
                          <img src={url} alt={`Sonho ${index + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          <button
                            type="button"
                            onClick={() => removeFoto(index)}
                            className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all gap-2"
                      >
                        {isUploading ? (
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        ) : (
                          <>
                            <ImagePlus className="w-6 h-6 text-primary" />
                            <span className="text-[10px] sm:text-xs font-medium text-primary">Adicionar Foto</span>
                          </>
                        )}
                      </button>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <div className="flex justify-between pt-8 border-t gap-4">
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="lg" className="rounded-xl px-8" onClick={handlePrev} disabled={activeTab === TABS[0].id}><ChevronLeft className="mr-2 h-4 w-4" /> Anterior</Button>
                <Button type="button" variant="ghost" size="lg" className="rounded-xl px-4 text-primary hover:bg-primary/10" onClick={handleSaveDraft}>
                  <Save className="w-4 h-4 mr-1" /> Salvar Rascunho
                </Button>
              </div>
              
              {activeTab !== TABS[TABS.length - 1].id ? (
                <Button type="button" size="lg" className="rounded-xl px-8 shadow-md" onClick={handleNext}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button>
              ) : (
                <Button type="submit" size="lg" className="bg-primary hover:bg-primary/90 px-10 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95" disabled={isSubmitting || saveMutation.isPending || isUploading}>
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