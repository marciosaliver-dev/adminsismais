"use client";

import { Badge } from "@/components/ui/badge";
import { Quote, Star } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type LevantamentoRow = Tables<"levantamento_operacional_2024">;

interface MuralPrintCardProps {
  resposta: LevantamentoRow;
  fitMode?: "cover" | "contain";
  imagePosition?: { x: number; y: number };
  imageZoom?: number;
  id?: string;
}

export function MuralPrintCard({ 
  resposta, 
  fitMode = "cover",
  imagePosition = { x: 50, y: 50 },
  imageZoom = 1,
  id
}: MuralPrintCardProps) {
  
  // Selecionar até 3 fotos
  const fotos = resposta.fotos_sonhos?.slice(0, 3) || [];
  const hasPhotos = fotos.length > 0;

  // Ajuste de tamanho de fonte baseado no tamanho do texto
  const getFontSize = (text: string) => {
    const length = text.length;
    if (length < 100) return "text-3xl";
    if (length < 200) return "text-2xl";
    if (length < 300) return "text-xl";
    return "text-lg";
  };

  const fontSizeClass = getFontSize(resposta.maior_sonho || "");

  // Grid layout para imagens
  const renderImageGrid = () => {
    if (!hasPhotos) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50 text-primary/20">
          <Star className="w-32 h-32 mb-4" />
          <span className="text-2xl font-black uppercase tracking-widest">Sem fotos</span>
        </div>
      );
    }

    if (fotos.length === 1) {
      return (
        <div className="w-full h-full overflow-hidden relative">
          <img 
            src={fotos[0]} 
            alt="Sonho" 
            className={cn("w-full h-full transition-all duration-100", fitMode === "cover" ? "object-cover" : "object-contain")}
            style={{ 
              objectPosition: `${imagePosition.x}% ${imagePosition.y}%`,
              transform: `scale(${imageZoom})`,
              transformOrigin: `${imagePosition.x}% ${imagePosition.y}%`
            }} 
          />
        </div>
      );
    }

    if (fotos.length === 2) {
      return (
        <div className="w-full h-full grid grid-cols-2 gap-2">
          {fotos.map((url, idx) => (
            <div key={idx} className="w-full h-full overflow-hidden relative">
              <img src={url} alt={`Sonho ${idx}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      );
    }

    // 3 fotos: 1 grande esquerda, 2 pequenas direita
    return (
      <div className="w-full h-full grid grid-cols-3 gap-2">
        <div className="col-span-2 w-full h-full overflow-hidden relative rounded-l-2xl">
          <img src={fotos[0]} alt="Sonho 1" className="w-full h-full object-cover" />
        </div>
        <div className="col-span-1 flex flex-col gap-2 h-full">
          <div className="h-1/2 w-full overflow-hidden relative rounded-tr-2xl">
            <img src={fotos[1]} alt="Sonho 2" className="w-full h-full object-cover" />
          </div>
          <div className="h-1/2 w-full overflow-hidden relative rounded-br-2xl">
            <img src={fotos[2]} alt="Sonho 3" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      id={id || `card-sonho-${resposta.id}`}
      // Tamanho fixo para proporção 15x20cm (3:4) em alta resolução
      // 15cm ~ 900px, 20cm ~ 1200px (approx 150dpi para tela/print básico)
      className="w-[900px] h-[1200px] bg-white flex flex-col relative overflow-hidden shadow-2xl flex-shrink-0 select-none"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-secondary/5 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

      {/* Header */}
      <div className="px-12 pt-10 pb-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-6">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-zinc-100">
            <img src="/logo_op2_horizontal.png.webp" alt="Sismais" className="h-12 w-auto object-contain" />
          </div>
          <div className="h-10 w-[1px] bg-zinc-300" />
          <div>
            <p className="text-primary font-bold tracking-[0.2em] text-xs">PLANO 10K</p>
            <p className="text-secondary font-black text-2xl tracking-tight">2026</p>
          </div>
        </div>
        <Badge variant="outline" className="text-primary border-primary/30 px-6 py-2 text-lg font-bold bg-white/80 backdrop-blur-sm shadow-sm rounded-full">
          MURAL DOS SONHOS
        </Badge>
      </div>

      {/* Área da Imagem (Central) */}
      <div className="px-12 flex-1 min-h-0 flex flex-col">
        <div className="w-full flex-1 bg-zinc-50 rounded-[32px] overflow-hidden border-8 border-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] relative">
          {renderImageGrid()}
        </div>
      </div>

      {/* Conteúdo de Texto e Footer */}
      <div className="px-12 pb-12 pt-8 relative z-10 flex flex-col gap-6">
        
        {/* Citação do Sonho */}
        <div className="relative pl-10">
          <Quote className="w-16 h-16 text-primary/10 absolute -top-2 -left-2 rotate-180" />
          <p className={`${fontSizeClass} font-medium text-secondary/90 leading-relaxed italic relative z-10`}>
            "{resposta.maior_sonho}"
          </p>
        </div>

        {/* Frase Motivacional Fixa (Novo Requisito) */}
        <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
          <p className="text-center text-lg text-primary font-semibold leading-relaxed">
            "Nos dias difíceis, olhe para este quadro. O seu melhor é a única ponte entre onde você está e onde quer chegar."
          </p>
        </div>

        {/* Footer com Nome e Cargo */}
        <div className="mt-2 pt-6 border-t-2 border-zinc-100 flex justify-between items-end">
          <div>
            <h3 className="text-5xl font-black text-[#45e5e5] uppercase tracking-tight leading-none mb-2 drop-shadow-sm">
              {resposta.colaborador_nome}
            </h3>
            <p className="text-2xl text-zinc-400 font-bold uppercase tracking-widest">
              {resposta.funcao_atual}
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2 mb-1">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-8 h-8 fill-[#45e5e5] text-[#45e5e5]" />
              ))}
            </div>
            <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-[0.3em]">COMPROMETIMENTO SISMAIS</p>
          </div>
        </div>
      </div>

      {/* Barra colorida inferior */}
      <div className="h-4 w-full bg-gradient-to-r from-[#45e5e5] to-[#2c5282]" />
    </div>
  );
}