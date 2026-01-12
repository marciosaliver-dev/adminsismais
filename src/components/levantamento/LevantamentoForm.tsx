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
import { Loader2, CheckCircle, ChevronRight, ChevronLeft, User, List, Lightbulb, Star, Clock, TrendingUp, Zap, Rocket } from "lucide-react";
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
});

type FormData = z.infer<typeof formSchema>;
type LevantamentoInsert = TablesInsert<"levantamento_operacional_2024">;

// --- 2. Configuração das Abas ---
const TABS = [
  { id: "rotina", label: "Rotina & Foco", icon: Clock, fields: ["rotina_diaria", "expectativa_empresa", "definicao_sucesso", "sentimento_valorizacao"] },
  { id: "gargalos", label: "Gargalos & Ação", icon: Zap, fields: ["atividades_top5", "ladrao_tempo", "ferramentas_uso", "interdependencias", "start_action", "stop_action", "continue_action", "reclamacao_cliente", "prioridades_setor"] },
  { id: "cultura", label: "Visão & Estratégia", icon: Star, fields: ["visao_papel_10k", "falta_plano_2026", "falta_metas_2025", "score_autonomia", "score_maestria", "score_proposito", "score_financeiro", "score_ambiente"] },
  { id: "lideranca", label: "Liderança & Finalização", icon: TrendingUp, fields: ["interesse_lideranca", "motivo_lideranca", "papel_bom_lider", "colaborador_nome", "funcao_atual", "satisfacao_trabalho", "talento_oculto"] },
];

// --- 3. Componente de Rating ---
const RatingInput = ({ label, name, control, error }: { label: string; name: keyof FormData; control: any; error: string | undefined }) => (
  <div className="space-y-2">
    <Label className="flex items-center justify-between">
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

export function LevantamentoForm() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isStarted, setIsStarted] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Carregar dados salvos do localStorage
  const savedData = useMemo(() => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
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

  // Salvar no localStorage automaticamente ao mudar qualquer campo
  useEffect(() => {
    const subscription = watch((value) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Mapeamento explícito para satisfazer o TypeScript e garantir a conversão correta
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
      if (isValid) setActiveTab(TABS[currentIndex + 1].id);
      else toast({ title: "⚠️ Preencha os campos obrigatórios", variant: "destructive" });
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
          <div className="bg-muted p-4 rounded-lg">
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
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-heading">Mapeamento Rumo aos 10K</CardTitle>
        <CardDescription>Seus dados são salvos automaticamente no navegador.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 h-auto">
            {TABS.map(t => <TabsTrigger key={t.id} value={t.id} className="flex flex-col gap-1 py-2"><t.icon className="w-4 h-4" /><span className="text-[10px] sm:text-xs">{t.label}</span></TabsTrigger>)}
          </TabsList>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="mt-6 space-y-6">
            <TabsContent value="rotina" className="space-y-6">
              <div className="space-y-2">
                <Label>1. Como é o seu dia a dia na Sismais (desde quando chega até ir embora)? *</Label>
                <Controller name="rotina_diaria" control={control} render={({ field }) => <Textarea {...field} rows={4} placeholder="Descreva sua rotina detalhadamente..." className={cn(errors.rotina_diaria && "border-destructive")} />} />
              </div>
              <div className="space-y-2">
                <Label>2. Na sua visão, o que a empresa espera do seu trabalho? *</Label>
                <Controller name="expectativa_empresa" control={control} render={({ field }) => <Textarea {...field} rows={4} placeholder="O que você acredita ser sua principal missão?" className={cn(errors.expectativa_empresa && "border-destructive")} />} />
              </div>
              <div className="space-y-2">
                <Label>3. Para você, o que define se você está cumprindo bem o seu trabalho? *</Label>
                <Controller name="definicao_sucesso" control={control} render={({ field }) => <Textarea {...field} rows={4} placeholder="Quais indicadores ou resultados te dão essa certeza?" className={cn(errors.definicao_sucesso && "border-destructive")} />} />
              </div>
              <div className="space-y-2">
                <Label>4. Você se sente valorizado? Por quê? *</Label>
                <Controller name="sentimento_valorizacao" control={control} render={({ field }) => <Textarea {...field} rows={4} placeholder="Diga com sinceridade o que te faz sentir valorizado ou o que falta..." className={cn(errors.sentimento_valorizacao && "border-destructive")} />} />
              </div>
            </TabsContent>

            <TabsContent value="gargalos" className="space-y-6">
              <div className="grid gap-6">
                <div className="space-y-2"><Label>5. Liste suas 5 principais atividades (em ordem de importância) *</Label><Controller name="atividades_top5" control={control} render={({ field }) => <Textarea {...field} rows={3} className={cn(errors.atividades_top5 && "border-destructive")} />} /></div>
                <div className="space-y-2"><Label>6. Qual é o seu maior "Ladrão de Tempo" (tarefas chatas/manuais)? *</Label><Controller name="ladrao_tempo" control={control} render={({ field }) => <Textarea {...field} rows={2} className={cn(errors.ladrao_tempo && "border-destructive")} />} /></div>
                <div className="space-y-2"><Label>7. Quais ferramentas/softwares você usa diariamente? *</Label><Controller name="ferramentas_uso" control={control} render={({ field }) => <Input {...field} className={cn(errors.ferramentas_uso && "border-destructive")} />} /></div>
                <div className="space-y-2"><Label>8. Quem depende do seu trabalho e de quem você depende? *</Label><Controller name="interdependencias" control={control} render={({ field }) => <Textarea {...field} rows={2} className={cn(errors.interdependencias && "border-destructive")} />} /></div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>START (Começar)</Label><Controller name="start_action" control={control} render={({ field }) => <Textarea {...field} rows={2} placeholder="O que deveríamos começar a fazer?" />} /></div>
                  <div className="space-y-2"><Label>STOP (Parar)</Label><Controller name="stop_action" control={control} render={({ field }) => <Textarea {...field} rows={2} placeholder="O que deveríamos parar?" />} /></div>
                  <div className="space-y-2"><Label>CONTINUE (Manter)</Label><Controller name="continue_action" control={control} render={({ field }) => <Textarea {...field} rows={2} placeholder="O que está dando certo?" />} /></div>
                </div>
                <div className="space-y-2"><Label>9. Qual a maior reclamação recorrente dos clientes? *</Label><Controller name="reclamacao_cliente" control={control} render={({ field }) => <Textarea {...field} rows={2} className={cn(errors.reclamacao_cliente && "border-destructive")} />} /></div>
                <div className="space-y-2 font-bold"><Label>10. Liste 5 prioridades que devemos focar no seu setor: *</Label><Controller name="prioridades_setor" control={control} render={({ field }) => <Textarea {...field} rows={3} placeholder="1. Exemplo\n2. Exemplo..." className={cn(errors.prioridades_setor && "border-destructive")} />} /></div>
              </div>
            </TabsContent>

            <TabsContent value="cultura" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2"><Label>11. O que não pode faltar no nosso plano estratégico de 2026? *</Label><Controller name="falta_plano_2026" control={control} render={({ field }) => <Textarea {...field} rows={3} className={cn(errors.falta_plano_2026 && "border-destructive")} />} /></div>
                <div className="space-y-2"><Label>12. O que faltou para atingirmos as metas de 2025? *</Label><Controller name="falta_metas_2025" control={control} render={({ field }) => <Textarea {...field} rows={3} className={cn(errors.falta_metas_2025 && "border-destructive")} />} /></div>
                <div className="space-y-2"><Label>13. Como você vê seu papel quando atingirmos 10.000 clientes? *</Label><Controller name="visao_papel_10k" control={control} render={({ field }) => <Textarea {...field} rows={3} className={cn(errors.visao_papel_10k && "border-destructive")} />} /></div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <RatingInput label="Autonomia" name="score_autonomia" control={control} error={errors.score_autonomia?.message} />
                  <RatingInput label="Maestria" name="score_maestria" control={control} error={errors.score_maestria?.message} />
                  <RatingInput label="Propósito" name="score_proposito" control={control} error={errors.score_proposito?.message} />
                  <RatingInput label="Financeiro" name="score_financeiro" control={control} error={errors.score_financeiro?.message} />
                  <RatingInput label="Ambiente" name="score_ambiente" control={control} error={errors.score_ambiente?.message} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="lideranca" className="space-y-6">
              <div className="space-y-4 p-4 border rounded-lg bg-primary/5">
                <Label className="font-bold">14. Você tem interesse em ser Líder na empresa? *</Label>
                <Controller name="interesse_lideranca" control={control} render={({ field }) => (
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-8 mt-2">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="l-sim" /><Label htmlFor="l-sim">Sim</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="l-nao" /><Label htmlFor="l-nao">Não</Label></div>
                  </RadioGroup>
                )} />
              </div>
              {interesseLideranca && (
                <div className="space-y-2"><Label>15. Por que você tem (ou não tem) interesse em liderança? *</Label><Controller name="motivo_lideranca" control={control} render={({ field }) => <Textarea {...field} rows={3} className={cn(errors.motivo_lideranca && "border-destructive")} />} /></div>
              )}
              <div className="space-y-2"><Label>16. Na sua visão, qual é o papel de um bom líder? *</Label><Controller name="papel_bom_lider" control={control} render={({ field }) => <Textarea {...field} rows={3} className={cn(errors.papel_bom_lider && "border-destructive")} />} /></div>
              <div className="grid sm:grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-2"><Label>Seu Nome *</Label><Controller name="colaborador_nome" control={control} render={({ field }) => <Input {...field} />} /></div>
                <div className="space-y-2"><Label>Sua Função Atual *</Label><Controller name="funcao_atual" control={control} render={({ field }) => <Input {...field} placeholder="Ex: Analista de Suporte" />} /></div>
              </div>
              <div className="space-y-2"><Label>17. De 0 a 10, quão satisfeito você está com seu trabalho? *</Label>
                <Controller name="satisfacao_trabalho" control={control} render={({ field }) => (
                  <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString() || ""}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{Array.from({ length: 11 }, (_, i) => <SelectItem key={i} value={i.toString()}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-2"><Label>18. A Pergunta de Ouro: Algum talento seu não está sendo usado hoje?</Label><Controller name="talento_oculto" control={control} render={({ field }) => <Input {...field} placeholder="Ex: Programação, Design, Organização..." />} /></div>
            </TabsContent>

            <div className="flex justify-between pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => activeTab !== TABS[0].id ? setActiveTab(TABS[TABS.findIndex(t => t.id === activeTab) - 1].id) : null} disabled={activeTab === TABS[0].id}><ChevronLeft className="mr-2" /> Anterior</Button>
              {activeTab !== TABS[TABS.length - 1].id ? <Button type="button" onClick={handleNext}>Próximo <ChevronRight className="ml-2" /></Button> : <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />} Enviar Mapeamento</Button>}
            </div>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
}