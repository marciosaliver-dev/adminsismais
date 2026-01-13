"use client";

import { Badge } from "@/components/ui/badge";
import { Quote, Star } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type LevantamentoRow = Tables<"levantamento_operacional_2024">;

interface MuralPrintCardProps {
  resposta: LevantamentoRow;
  fitMode?: "cover" | "contain";
  imagePosition?: { x: number; y: number };
  imageZoom?: number;
}

export function MuralPrintCard({ 
  resposta, 
  fitMode = "contain",
  imagePosition = { x: 50, y: 50 },
  imageZoom = 1
}: MuralPrintCardProps) {
  
  const getFontSize = (text: string) => {
    const length = text.length;
    if (length < 100) return "text-4xl";
    if (length < 200) return "text-3xl";
    if (length < 400) return "text-2xl";
    if (length < 600) return "text-xl";
    return "text-lg";
  };

  const getNameSize = (name: string) => {
    if (name.length > 30) return "text-3xl";
    return "text-4xl";
  };

  const fontSizeClass = getFontSize(resposta.maior_sonho || "");
  const nameSizeClass = getNameSize(resposta.colaborador_nome || "");

  return (
    <div 
      id={`card-sonho-${resposta.id}`}
      className="w-[800px] h-[1000px] bg-white p-12 flex flex-col relative overflow-hidden shadow-2xl border-[16px] border-primary/10 flex-shrink-0 select-none"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="absolute top-[-100px] right-[-100px] w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-100px] left-[-100px] w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

      {/* Header do Card */}
      <div className="flex justify-between items-center mb-10 relative z-10">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 rounded-lg border border-primary/10 shadow-sm">
            <img src="/logo_sismais.png" alt="Sismais" className="h-12 w-auto object-contain" />
          </div>
          <div className="h-12 w-[2px] bg-primary/20 mx-2" />
          <div>
            <p className="text-primary font-bold tracking-[0.2em] text-xs">PLANO 10K</p>
            <p className="text-secondary font-black text-xl">2026</p>
          </div>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="text-primary border-primary/30 px-4 py-1 text-lg font-bold bg-white shadow-sm">
            MURAL DOS SONHOS
          </Badge>
        </div>
      </div>

      {/* Área da Imagem */}
      <div className="h-[480px] w-full bg-zinc-50 rounded-[32px] overflow-hidden border-4 border-white shadow-inner mb-8 relative flex items-center justify-center">
        {resposta.fotos_sonhos && resposta.fotos_sonhos.length > 0 ? (
          <div className="w-full h-full relative overflow-hidden">
            <img 
              src={resposta.fotos_sonhos[0]} 
              alt="Meu Sonho" 
              draggable={false}
              className={`w-full h-full transition-all duration-100 ${fitMode === "cover" ? "object-cover" : "object-contain p-4"}`}
              style={{ 
                objectPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                transform: `scale(${imageZoom})`,
                transformOrigin: `${imagePosition.x}% ${imagePosition.y}%`
              }} 
            />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-primary/20 text-primary/20">
            <Star className="w-32 h-32 mb-4" />
            <span className="text-2xl font-black">RUMO AOS 10K</span>
          </div>
        )}
      </div>

      {/* Texto do Sonho */}
      <div className="relative z-10 px-4 flex-1 flex flex-col justify-center">
        <Quote className="w-16 h-16 text-primary/10 absolute -top-4 -left-4 rotate-180" />
        <div className="space-y-4">
          <p className={`${fontSizeClass} font-medium text-secondary leading-tight italic text-center px-4`}>
            "{resposta.maior_sonho}"
          </p>
        </div>
      </div>

      {/* Rodapé com Nome e Função */}
      <div className="mt-6 pt-6 border-t border-primary/10 flex justify-between items-end relative z-10">
        <div className="flex-1 max-w-[70%]">
          <h3 className={`${nameSizeClass} font-black text-primary tracking-tight leading-tight uppercase break-words`}>
            {resposta.colaborador_nome}
          </h3>
          <p className="text-xl text-muted-foreground mt-1 font-semibold uppercase tracking-wide">
            {resposta.funcao_atual}
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-1 ml-4 mb-1">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="w-6 h-6 fill-primary text-primary" />
            ))}
          </div>
          <p className="text-[10px] font-bold text-primary/40 uppercase tracking-[0.2em] whitespace-nowrap">Comprometimento Sismais</p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-primary via-primary/50 to-primary" />
    </div>
  );
}