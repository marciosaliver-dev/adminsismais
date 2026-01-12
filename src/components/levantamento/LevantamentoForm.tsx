import { useState, useMemo } from "react";
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
import { Loader2, CheckCircle, AlertCircle, ChevronRight, ChevronLeft, User, List, Lightbulb, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import type { TablesInsert } from "@/integrations/supabase/types";

// --- 1. Schema de Validação (Zod) ---
const scoreSchema = z.coerce.number().min(1, "Obrigatório").max(5, "Obrigatório");

const formSchema = z.object({
  colaborador_nome: z.string().min(2, "Nome é obrigatório"),
  atividades_top5: z.string().min(20, "Detalhe suas 5 principais atividades"),
  ladrao_tempo: z.string().min(20, "Descreva o principal ladrão de tempo"),
  ferramentas_uso: z.string().min(5, "Liste as ferramentas que você usa"),
  interdependencias: z.string().min(20, "Descreva suas interdependências"),
  start_action: z.string().min(10, "O que devemos começar a fazer?"),
  stop_action: z.string().min(10, "O que devemos parar de fazer?"),
  continue_action: z.string().min(10, "O que devemos manter?"),
  reclamacao_cliente: z.string().min(10, "Qual a maior reclamação?"),
  visao_papel_10k: z.string().min(20, "Descreva seu papel no cenário 10K"),
  score_autonomia: scoreSchema,
  score_maestria: scoreSchema,
  score_proposito: scoreSchema,
  score_financeiro: scoreSchema,
  score_ambiente: scoreSchema,
  talento_oculto: z.string().max(255).optional(),
});

type FormData = z.infer<typeof formSchema>;
type LevantamentoInsert = TablesInsert<"levantamento_operacional_2024">;

// --- 2. Configuração das Abas ---
const TABS = [
  { id: "operacional", label: "Raio-X Operacional", icon: List, fields: ["atividades_top5", "ladrao_tempo", "ferramentas_uso", "interdependencias"] },
  { id: "diagnostico", label: "Diagnóstico S/S/C", icon: Lightbulb, fields: ["start_action", "stop_action", "continue_action", "reclamacao_cliente"] },
  { id: "cultura", label: "Visão & Cultura", icon: Star, fields: ["visao_papel_10k", "score_autonomia", "score_maestria", "score_proposito", "score_financeiro", "score_ambiente"] },
  { id: "finalizacao", label: "Finalização", icon: User, fields: ["colaborador_nome", "talento_oculto"] },
];

// --- 3. Componente de Rating (1-5) ---
interface RatingInputProps {
  label: string;
  name: keyof FormData;
  control: any;
  error: string | undefined;
}

const RatingInput = ({ label, name, control, error }: RatingInputProps) => {
  const scores = [1, 2, 3, 4, 5];
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="flex items-center justify-between">
        <span>{label} (1 = Baixa, 5 = Alta)</span>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <RadioGroup
            onValueChange={(value) => field.onChange(parseInt(value))}
            value={field.value?.toString() || ""}
            className="flex justify-between p-2 border rounded-lg bg-muted/30"
          >
            {scores.map((score) => (
              <div key={score} className="flex flex-col items-center space-y-1">
                <Label htmlFor={`${name}-${score}`} className="text-xs font-medium text-muted-foreground">
                  {score}
                </Label>
                <RadioGroupItem
                  value={score.toString()}
                  id={`${name}-${score}`}
                  className="w-6 h-6 border-2 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
              </div>
            ))}
          </RadioGroup>
        )}
      />
    </div>
  );
};

// --- 4. Componente Principal ---
export function LevantamentoForm() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(() => ({
      colaborador_nome: profile?.nome || "",
      atividades_top5: "",
      ladrao_tempo: "",
      ferramentas_uso: "",
      interdependencias: "",
      start_action: "",
      stop_action: "",
      continue_action: "",
      reclamacao_cliente: "",
      visao_papel_10k: "",
      score_autonomia: 0,
      score_maestria: 0,
      score_proposito: 0,
      score_financeiro: 0,
      score_ambiente: 0,
      talento_oculto: "",
    }), [profile]),
  });

  const { control, handleSubmit, formState: { errors, isSubmitting }, trigger, getValues, setValue } = form;

  // Preencher nome do colaborador automaticamente
  if (profile?.nome && getValues("colaborador_nome") === "") {
    setValue("colaborador_nome", profile.nome);
  }

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: LevantamentoInsert = {
          colaborador_nome: data.colaborador_nome,
          atividades_top5: data.atividades_top5,
          ladrao_tempo: data.ladrao_tempo,
          ferramentas_uso: data.ferramentas_uso,
          interdependencias: data.interdependencias,
          start_action: data.start_action,
          stop_action: data.stop_action,
          continue_action: data.continue_action,
          reclamacao_cliente: data.reclamacao_cliente,
          visao_papel_10k: data.visao_papel_10k,
          score_autonomia: data.score_autonomia,
          score_maestria: data.score_maestria,
          score_proposito: data.score_proposito,
          score_financeiro: data.score_financeiro,
          score_ambiente: data.score_ambiente,
          talento_oculto: data.talento_oculto || null,
      };

      const { error } = await supabase
        .from("levantamento_operacional_2024")
        .insert(payload);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["levantamento-operacional"] });
      setIsSubmitted(true);
      toast({
        title: "✅ Sucesso!",
        description: "Obrigado! Suas respostas ajudarão a construir o futuro da Sismais.",
      });
    },
    onError: (error) => {
      console.error("Erro ao salvar:", error);
      toast({
        title: "❌ Erro ao salvar",
        description: "Não foi possível enviar o formulário. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    saveMutation.mutate(data);
  };

  const handleNext = async () => {
    const currentIndex = TABS.findIndex(t => t.id === activeTab);
    if (currentIndex < TABS.length - 1) {
      const currentTab = TABS[currentIndex];
      
      // Validar apenas os campos da aba atual
      const isValid = await trigger(currentTab.fields as (keyof FormData)[]);
      
      if (isValid) {
        setActiveTab(TABS[currentIndex + 1].id);
      } else {
        toast({
          title: "⚠️ Preencha os campos",
          description: "Existem campos obrigatórios nesta seção que precisam ser preenchidos.",
          variant: "destructive",
        });
      }
    }
  };

  const handlePrev = () => {
    const currentIndex = TABS.findIndex(t => t.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1].id);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="max-w-xl mx-auto text-center">
        <CardContent className="pt-8 pb-6 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-700">Obrigado!</h2>
          <p className="text-muted-foreground">
            Suas respostas ajudarão a construir o futuro da Sismais.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-heading">Mapeamento Rumo aos 10K</CardTitle>
        <CardDescription>
          Sua visão é crucial para o plano de crescimento da Sismais. Responda com detalhes!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 h-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="flex flex-col sm:flex-row items-center gap-1 py-2 px-1 sm:px-4">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
            {/* Seção 1: Raio-X Operacional */}
            <TabsContent value="operacional" className="mt-0 space-y-6">
              <h3 className="text-xl font-semibold border-b pb-2">Seção 1: Raio-X Operacional</h3>
              
              <div className="space-y-2">
                <Label htmlFor="atividades_top5">1. A Lista dos 5 (Principais atividades) *</Label>
                <Controller
                  name="atividades_top5"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Liste suas 5 atividades principais, em ordem de tempo gasto."
                      className={cn(errors.atividades_top5 && "border-destructive")}
                    />
                  )}
                />
                {errors.atividades_top5 && <p className="text-xs text-destructive">{errors.atividades_top5.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ladrao_tempo">2. O "Ladrão de Tempo" (Tarefas manuais) *</Label>
                <Controller
                  name="ladrao_tempo"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Descreva a tarefa manual/repetitiva que mais consome seu tempo e o impacto disso."
                      className={cn(errors.ladrao_tempo && "border-destructive")}
                    />
                  )}
                />
                {errors.ladrao_tempo && <p className="text-xs text-destructive">{errors.ladrao_tempo.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ferramentas_uso">3. O Kit de Ferramentas (Softwares abertos) *</Label>
                <Controller
                  name="ferramentas_uso"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Liste os 5 principais softwares/sistemas que você usa diariamente."
                      className={cn(errors.ferramentas_uso && "border-destructive")}
                    />
                  )}
                />
                {errors.ferramentas_uso && <p className="text-xs text-destructive">{errors.ferramentas_uso.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="interdependencias">4. Interdependências (Quem depende de você?) *</Label>
                <Controller
                  name="interdependencias"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Quais áreas ou pessoas dependem diretamente do seu trabalho? Descreva o que você fornece a eles."
                      className={cn(errors.interdependencias && "border-destructive")}
                    />
                  )}
                />
                {errors.interdependencias && <p className="text-xs text-destructive">{errors.interdependencias.message}</p>}
              </div>
            </TabsContent>

            {/* Seção 2: Diagnóstico */}
            <TabsContent value="diagnostico" className="mt-0 space-y-6">
              <h3 className="text-xl font-semibold border-b pb-2">Seção 2: Diagnóstico (Start/Stop/Continue)</h3>
              
              <div className="space-y-2">
                <Label htmlFor="start_action">5. START (O que devemos começar a fazer?) *</Label>
                <Controller
                  name="start_action"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Qual nova rotina, processo ou ferramenta traria o maior impacto positivo?"
                      className={cn(errors.start_action && "border-destructive")}
                    />
                  )}
                />
                {errors.start_action && <p className="text-xs text-destructive">{errors.start_action.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stop_action">5. STOP (O que devemos parar de fazer?) *</Label>
                <Controller
                  name="stop_action"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Qual atividade, processo ou reunião é ineficiente e deve ser eliminada imediatamente?"
                      className={cn(errors.stop_action && "border-destructive")}
                    />
                  )}
                />
                {errors.stop_action && <p className="text-xs text-destructive">{errors.stop_action.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="continue_action">5. CONTINUE (O que devemos manter?) *</Label>
                <Controller
                  name="continue_action"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Qual rotina, cultura ou prática está funcionando muito bem e deve ser mantida/reforçada?"
                      className={cn(errors.continue_action && "border-destructive")}
                    />
                  )}
                />
                {errors.continue_action && <p className="text-xs text-destructive">{errors.continue_action.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reclamacao_cliente">6. A Voz do Cliente (Maior reclamação) *</Label>
                <Controller
                  name="reclamacao_cliente"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Qual é a maior dor ou reclamação recorrente que você ouve dos clientes?"
                      className={cn(errors.reclamacao_cliente && "border-destructive")}
                    />
                  )}
                />
                {errors.reclamacao_cliente && <p className="text-xs text-destructive">{errors.reclamacao_cliente.message}</p>}
              </div>
            </TabsContent>

            {/* Seção 3: Visão & Cultura */}
            <TabsContent value="cultura" className="mt-0 space-y-6">
              <h3 className="text-xl font-semibold border-b pb-2">Seção 3: Visão & Cultura</h3>
              
              <div className="space-y-2">
                <Label htmlFor="visao_papel_10k">7. O Cenário 10K (Seu papel no futuro) *</Label>
                <Controller
                  name="visao_papel_10k"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Descreva como você imagina seu papel e suas responsabilidades quando a Sismais atingir 10.000 clientes."
                      className={cn(errors.visao_papel_10k && "border-destructive")}
                    />
                  )}
                />
                {errors.visao_papel_10k && <p className="text-xs text-destructive">{errors.visao_papel_10k.message}</p>}
              </div>

              <h4 className="font-semibold pt-4">8. Importância (De 1 a 5) *</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Quão importante é cada um desses fatores para sua satisfação e motivação no trabalho?
              </p>

              <RatingInput
                label="Autonomia (Liberdade para tomar decisões)"
                name="score_autonomia"
                control={control}
                error={errors.score_autonomia?.message}
              />
              <RatingInput
                label="Maestria (Aprendizado e desenvolvimento de habilidades)"
                name="score_maestria"
                control={control}
                error={errors.score_maestria?.message}
              />
              <RatingInput
                label="Propósito (Impacto do seu trabalho na missão da empresa)"
                name="score_proposito"
                control={control}
                error={errors.score_proposito?.message}
              />
              <RatingInput
                label="Financeiro (Remuneração e benefícios)"
                name="score_financeiro"
                control={control}
                error={errors.score_financeiro?.message}
              />
              <RatingInput
                label="Ambiente (Cultura, colegas e clima de trabalho)"
                name="score_ambiente"
                control={control}
                error={errors.score_ambiente?.message}
              />
            </TabsContent>

            {/* Seção 4: Finalização */}
            <TabsContent value="finalizacao" className="mt-0 space-y-6">
              <h3 className="text-xl font-semibold border-b pb-2">Seção 4: Finalização</h3>
              
              <div className="space-y-2">
                <Label htmlFor="colaborador_nome">Nome do Colaborador *</Label>
                <Controller
                  name="colaborador_nome"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Seu nome completo"
                      className={cn(errors.colaborador_nome && "border-destructive")}
                    />
                  )}
                />
                {errors.colaborador_nome && <p className="text-xs text-destructive">{errors.colaborador_nome.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="talento_oculto">9. A Pergunta de Ouro (Habilidade não usada)</Label>
                <Controller
                  name="talento_oculto"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Qual talento ou habilidade você tem que não está sendo usada no seu papel atual?"
                    />
                  )}
                />
              </div>
            </TabsContent>

            {/* Navegação e Submissão */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrev}
                disabled={activeTab === TABS[0].id}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>

              {activeTab !== TABS[TABS.length - 1].id ? (
                <Button
                  type="button"
                  onClick={handleNext}
                >
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting || saveMutation.isPending}
                >
                  {isSubmitting || saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
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