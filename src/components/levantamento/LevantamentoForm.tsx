"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle, ChevronRight, ChevronLeft, Rocket, Save, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { STORAGE_KEY, TABS, formSchema, type FormData } from "./form-schema";
import { RotinaSection } from "./sections/RotinaSection";
import { GargalosSection } from "./sections/GargalosSection";
import { CulturaSection } from "./sections/CulturaSection";
import { LiderancaSection } from "./sections/LiderancaSection";

export function LevantamentoForm() {
  const { profile } = useAuth();
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

  const { data: existingResponse } = useQuery({
    queryKey: ["existing-levantamento", profile?.nome],
    queryFn: async () => {
      if (!profile?.nome) return null;
      const { data, error } = await supabase
        .from("levantamento_operacional_2024")
        .select("*")
        .eq("colaborador_nome", profile.nome)
        .maybeSingle();
      
      if (error) return null;
      return data;
    },
    enabled: !!profile?.nome && !isStarted,
  });

  useEffect(() => {
    if (existingResponse && !savedData) {
      reset({
        ...existingResponse,
        interesse_lideranca: existingResponse.interesse_lideranca ? "sim" : "nao",
      } as any);
      toast({ title: "Dados carregados", description: "Carregamos suas respostas anteriores do banco de dados." });
    }
  }, [existingResponse, reset, savedData]);

  useEffect(() => {
    const subscription = watch((value) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const fotosSonhos = watch("fotos_sonhos") || [];
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

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
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

      const { error } = await supabase
        .from("levantamento_operacional_2024")
        .insert(payload);
        
      if (error) throw error;
    },
    onSuccess: () => {
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
    toast({ title: "🚀 Progresso Salvo!", description: "Seus dados estão seguros neste navegador." });
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
          <div className="bg-muted p-4 rounded-lg shadow-sm">
            <p className="font-bold mb-2">O pacto de transparência:</p>
            <ul className="space-y-2 list-none p-0">
              <li>🎯 <strong>Sinceridade Radical:</strong> Se um processo é ruim, diga.</li>
              <li>🤝 <strong>Sem Julgamentos:</strong> Não existem respostas erradas.</li>
              <li>📈 <strong>Foco no Futuro:</strong> Ajude-nos a definir onde investiremos.</li>
            </ul>
          </div>
        </div>
        <div className="text-center space-y-3">
          <Button size="lg" className="w-full sm:w-auto px-12" onClick={() => setIsStarted(true)}>Iniciar Mapeamento</Button>
          {(savedData || existingResponse) && (
             <p className="text-xs text-primary font-medium">✨ Você possui dados salvos que serão carregados!</p>
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
      <CardContent className="pb-20 sm:pb-4">
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
            <TabsContent value="rotina">
              <RotinaSection control={control} errors={errors} />
            </TabsContent>

            <TabsContent value="gargalos">
              <GargalosSection control={control} errors={errors} />
            </TabsContent>

            <TabsContent value="cultura">
              <CulturaSection control={control} errors={errors} />
            </TabsContent>

            <TabsContent value="lideranca">
              <LiderancaSection 
                control={control} 
                errors={errors} 
                watch={watch} 
                setValue={setValue}
                fileInputRef={fileInputRef}
                isUploading={isUploading}
                handleFileSelect={handleFileSelect}
              />
            </TabsContent>

            <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-3 shadow-2xl sm:relative sm:p-0 sm:shadow-none sm:border-t-0">
              <div className="flex justify-between pt-0 gap-4">
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="lg" 
                    className="rounded-xl px-4 w-full sm:w-auto" 
                    onClick={handlePrev} 
                    disabled={activeTab === TABS[0].id}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                  </Button>
                </div>
                
                {activeTab !== TABS[TABS.length - 1].id ? (
                  <Button type="button" size="lg" className="bg-primary hover:bg-primary/90 px-8 rounded-xl shadow-md w-full sm:w-auto" onClick={handleNext}>
                    Próximo <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="bg-primary hover:bg-primary/90 px-10 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 w-full sm:w-auto" 
                    disabled={isSubmitting || saveMutation.isPending || isUploading}
                  >
                    {isSubmitting || saveMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />} Enviar Mapeamento
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
}