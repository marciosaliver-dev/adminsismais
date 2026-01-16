"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, Rocket, ImagePlus, X, ArrowLeft, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type LevantamentoRow = Tables<"levantamento_operacional_2024">;

export default function MapeamentoSonhos() {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form State
  const [nome, setNome] = useState(profile?.nome || "");
  const [funcao, setFuncao] = useState(profile?.departamento || "");
  const [sonho, setSonho] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);

  // Carregar dados existentes se houver
  const { data: existingResponse } = useQuery({
    queryKey: ["existing-sonho", profile?.nome],
    queryFn: async () => {
      if (!profile?.nome) return null;
      const { data, error } = await supabase
        .from("levantamento_operacional_2024")
        .select("*")
        .eq("colaborador_nome", profile.nome)
        .maybeSingle();
      
      if (error) return null;
      return data as LevantamentoRow;
    },
    enabled: !!profile?.nome,
  });

  useEffect(() => {
    if (existingResponse) {
      if (!nome) setNome(existingResponse.colaborador_nome);
      if (!funcao) setFuncao(existingResponse.funcao_atual || "");
      setSonho(existingResponse.maior_sonho || "");
      setFotos(existingResponse.fotos_sonhos || []);
    }
  }, [existingResponse]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newUrls = [...fotos];

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

      setFotos(newUrls);
      toast({ title: "📸 Foto adicionada!", description: "Sua imagem está no mural." });
    } catch (error) {
      console.error(error);
      toast({ title: "❌ Erro no upload", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const removeFoto = (indexToRemove: number) => {
    setFotos(fotos.filter((_, i) => i !== indexToRemove));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!nome || !funcao || !sonho) {
        throw new Error("Preencha seu nome, função e seu sonho.");
      }

      // 1. Verificar se já existe registro com este nome
      const { data: existingRecords, error: searchError } = await supabase
        .from("levantamento_operacional_2024")
        .select("id")
        .eq("colaborador_nome", nome)
        .limit(1);

      if (searchError) throw searchError;
      
      const existingId = existingRecords?.[0]?.id;

      if (existingId) {
        // Atualizar registro existente
        const { error } = await supabase
          .from("levantamento_operacional_2024")
          .update({
            funcao_atual: funcao,
            maior_sonho: sonho,
            fotos_sonhos: fotos,
          })
          .eq("id", existingId);
          
        if (error) throw error;
      } else {
        // Criar novo registro com placeholders
        const payload = {
          colaborador_nome: nome,
          funcao_atual: funcao,
          maior_sonho: sonho,
          fotos_sonhos: fotos,
          // Campos obrigatórios com valores padrão
          rotina_diaria: "Preenchido via formulário rápido de sonhos",
          expectativa_empresa: "Preenchido via formulário rápido de sonhos",
          definicao_sucesso: "Preenchido via formulário rápido de sonhos",
          sentimento_valorizacao: "Preenchido via formulário rápido de sonhos",
          atividades_top5: "Preenchido via formulário rápido de sonhos",
          ladrao_tempo: "Preenchido via formulário rápido de sonhos",
          ferramentas_uso: "Celular/PC",
          interdependencias: "Equipe Sismais",
          start_action: "Melhorar processos",
          stop_action: "Retrabalho",
          continue_action: "Crescimento",
          reclamacao_cliente: "N/A",
          prioridades_setor: "N/A",
          visao_papel_10k: "N/A",
          falta_plano_2026: "N/A",
          falta_metas_2025: "N/A",
          score_autonomia: 5,
          score_maestria: 5,
          score_proposito: 5,
          score_financeiro: 5,
          score_ambiente: 5,
        };

        const { error } = await supabase
          .from("levantamento_operacional_2024")
          .insert(payload);
          
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({ title: "🚀 Sonho Registrado!", description: "Obrigado por compartilhar!" });
    },
    onError: (error: any) => {
      toast({ title: "❌ Erro ao salvar", description: error.message, variant: "destructive" });
    },
  });

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center py-10 px-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Mural Atualizado!</h2>
          <p className="text-muted-foreground mb-8">Seu sonho agora faz parte do nosso Mural 10K.</p>
          <Button asChild className="w-full rounded-xl h-12 text-lg">
            <Link to="/">Voltar ao Sistema</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-10">
      {/* Header Mobile */}
      <div className="bg-primary p-6 text-white rounded-b-[40px] shadow-lg mb-6">
        <Link to="/" className="flex items-center gap-2 text-white/80 mb-4 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <Rocket className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading">Mural dos Sonhos</h1>
            <p className="text-white/80 text-xs font-medium uppercase tracking-widest">Plano Sismais 10K</p>
          </div>
        </div>
      </div>

      <div className="px-4 max-w-lg mx-auto space-y-6">
        <div className="prose prose-sm dark:prose-invert">
          <p className="text-muted-foreground leading-relaxed">
            Acreditamos que a Sismais é o veículo para te levar onde você quer chegar. 
            <strong> O que faz seu olho brilhar?</strong>
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-6">
          {/* Identificação */}
          <Card className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="font-bold">Seu Nome</Label>
                <Input 
                  id="nome" 
                  value={nome} 
                  onChange={e => setNome(e.target.value)} 
                  placeholder="Como você é conhecido?"
                  className="rounded-xl h-12 bg-muted/30 border-none focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="funcao" className="font-bold">Sua Função</Label>
                <Input 
                  id="funcao" 
                  value={funcao} 
                  onChange={e => setFuncao(e.target.value)} 
                  placeholder="Ex: Suporte, Vendas..."
                  className="rounded-xl h-12 bg-muted/30 border-none focus-visible:ring-primary"
                />
              </div>
            </CardContent>
          </Card>

          {/* O Sonho */}
          <Card className="rounded-3xl border-2 border-primary/20 shadow-md overflow-hidden">
            <div className="bg-primary/5 p-4 border-b border-primary/10 flex items-center gap-2">
              <Star className="w-5 h-5 text-primary fill-primary" />
              <span className="font-bold text-primary text-sm uppercase tracking-tight">Qual seu maior sonho pessoal?</span>
            </div>
            <CardContent className="p-5 space-y-4">
              <Textarea 
                value={sonho} 
                onChange={e => setSonho(e.target.value)}
                placeholder="Pode ser qualquer coisa: casa própria, viagem, estudo, independência..."
                rows={6}
                className="rounded-xl bg-transparent border-none focus-visible:ring-0 text-lg italic p-0 placeholder:text-muted-foreground/50 resize-none"
              />
              
              <div className="pt-4 border-t border-dashed border-primary/20">
                <Label className="font-bold block mb-3">📸 Fotos que te inspiram</Label>
                <div className="grid grid-cols-2 gap-3">
                  {fotos.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border bg-muted group shadow-sm">
                      <img src={url} alt="Sonho" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFoto(index)}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full backdrop-blur-sm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all gap-2"
                  >
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    ) : (
                      <>
                        <ImagePlus className="w-8 h-8 text-primary/60" />
                        <span className="text-[10px] font-bold text-primary uppercase">Adicionar</span>
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
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            size="lg" 
            disabled={saveMutation.isPending || isUploading}
            className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl bg-primary hover:bg-primary/90"
          >
            {saveMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <Rocket className="mr-2" />}
            Atualizar Meu Mural
          </Button>
        </form>
      </div>
    </div>
  );
}