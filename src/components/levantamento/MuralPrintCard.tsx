"use client";

import { Badge } from "@/components/ui/badge";
import { Quote, Star } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type LevantamentoRow = Tables<"levantamento_operacional_2024">;

export interface PhotoSetting {
  x: number;
  y: number;
  zoom: number;
}

interface MuralPrintCardProps {
  resposta: LevantamentoRow;
  selectedPhotos?: string[]; // Lista de URLs selecionadas
  photoSettings?: Record<string, PhotoSetting>; // Configurações por URL
  id?: string;
  onPhotoClick?: (index: number) => void; // Para selecionar qual foto editar
  activePhotoIndex?: number | null;
}

export function MuralPrintCard({ 
  resposta, 
  selectedPhotos = [],
  photoSettings = {},
  id,
  onPhotoClick,
  activePhotoIndex
}: MuralPrintCardProps) {
  
  // Se não vierem fotos selecionadas, pega as primeiras 6 ou todas se tiver menos
  const fotos = selectedPhotos.length > 0 
    ? selectedPhotos 
    : (resposta.fotos_sonhos?.slice(0, 6) || []);
    
  const hasPhotos = fotos.length > 0;

  // Ajuste de tamanho de fonte baseado no tamanho do texto
  const getFontSize = (text: string) => {
    const length = text.length;
    if (length < 80) return "text-4xl"; // Maior destaque
    if (length < 150) return "text-3xl";
    if (length < 300) return "text-2xl";
    return "text-xl";
  };

  const fontSizeClass = getFontSize(resposta.maior_sonho || "");

  // Helper para renderizar imagem com suas configurações
  const RenderImage = ({ url, index, className }: { url: string, index: number, className?: string }) => {
    const settings = photoSettings[url] || { x: 50, y: 50, zoom: 1 };
    const isActive = activePhotoIndex === index;
    
    return (
      <div 
        className={cn(
          "w-full h-full overflow-hidden relative cursor-pointer group transition-all border-4",
          className,
          isActive ? "border-[#45e5e5] z-20 shadow-xl scale-[1.02]" : "border-transparent hover:border-white/50"
        )}
        onClick={(e) => {
          e.stopPropagation(); // Impede propagação para não bugar o drag do container
          onPhotoClick?.(index);
        }}
      >
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10 pointer-events-none" />
        <img 
          src={url} 
          alt={`Sonho ${index}`} 
          className="w-full h-full object-cover transition-transform duration-75 ease-linear will-change-transform"
          style={{ 
            objectPosition: `${settings.x}% ${settings.y}%`,
            transform: `scale(${settings.zoom})`,
            transformOrigin: `${settings.x}% ${settings.y}%`
          }} 
        />
        {/* Overlay indicativo de clique apenas na edição */}
        {onPhotoClick && !isActive && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
            <span className="text-white text-sm font-bold bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm shadow-lg border border-white/20">
              Clique para Editar
            </span>
          </div>
        )}
      </div>
    );
  };

  // Grid layout dinâmico estilo "Bento Grid" / Colagem
  const renderImageGrid = () => {
    if (!hasPhotos) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50 text-[#10293f]/20">
          <Star className="w-32 h-32 mb-4" />
          <span className="text-2xl font-black uppercase tracking-widest">Sem fotos</span>
        </div>
      );
    }

    // 1 Foto: Full
    if (fotos.length === 1) {
      return <RenderImage url={fotos[0]} index={0} />;
    }

    // 2 Fotos: Split Vertical
    if (fotos.length === 2) {
      return (
        <div className="w-full h-full grid grid-cols-2 gap-2">
          {fotos.map((url, idx) => <RenderImage key={idx} url={url} index={idx} />)}
        </div>
      );
    }

    // 3 Fotos: 1 Grande Esq, 2 Pequenas Dir (GARANTIR QUE OCUPA 100% ALTURA)
    if (fotos.length === 3) {
      return (
        <div className="w-full h-full grid grid-cols-3 gap-2">
          <div className="col-span-2 h-full">
            <RenderImage url={fotos[0]} index={0} className="rounded-l-2xl h-full" />
          </div>
          <div className="col-span-1 flex flex-col gap-2 h-full">
            <div className="h-1/2 relative"><RenderImage url={fotos[1]} index={1} className="rounded-tr-2xl absolute inset-0" /></div>
            <div className="h-1/2 relative"><RenderImage url={fotos[2]} index={2} className="rounded-br-2xl absolute inset-0" /></div>
          </div>
        </div>
      );
    }

    // 4 Fotos: Grid 2x2
    if (fotos.length === 4) {
      return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-2">
          {fotos.map((url, idx) => <RenderImage key={idx} url={url} index={idx} />)}
        </div>
      );
    }

    // 5 Fotos: 1 Grande Cima, 4 Pequenas Baixo
    if (fotos.length === 5) {
      return (
        <div className="w-full h-full grid grid-rows-2 gap-2">
          <div className="row-span-1">
            <RenderImage url={fotos[0]} index={0} className="rounded-t-2xl" />
          </div>
          <div className="grid grid-cols-4 gap-2 row-span-1">
            {fotos.slice(1).map((url, idx) => (
              <RenderImage key={idx+1} url={url} index={idx+1} className={cn(
                idx === 0 && "rounded-bl-2xl",
                idx === 3 && "rounded-br-2xl"
              )} />
            ))}
          </div>
        </div>
      );
    }

    // 6 Fotos: Grid 2x3 (Mosaico)
    if (fotos.length === 6) {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-2">
          {fotos.map((url, idx) => <RenderImage key={idx} url={url} index={idx} />)}
        </div>
      );
    }
  };

  return (
    <div 
      id={id || `card-sonho-${resposta.id}`}
      className="w-[900px] h-[1200px] bg-white flex flex-col relative overflow-hidden shadow-2xl flex-shrink-0 select-none"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-[#10293f]/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-[#45e5e5]/10 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

      {/* Header */}
      <div className="px-12 pt-10 pb-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-6">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-zinc-100">
            <img src="/logo_op2_horizontal.png.webp" alt="Sismais" className="h-14 w-auto object-contain" />
          </div>
          <div className="h-10 w-[1px] bg-zinc-300" />
          <div>
            <p className="text-[#10293f] font-bold tracking-[0.2em] text-xs">PLANO 10K</p>
            <p className="text-zinc-400 font-black text-2xl tracking-tight">2026</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[#10293f] border-[#10293f]/20 px-6 py-2 text-lg font-bold bg-white/80 backdrop-blur-sm shadow-sm rounded-full">
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
        
        {/* Citação do Sonho (Com mais destaque solicitado) */}
        <div className="relative pl-10 pr-4">
          <Quote className="w-20 h-20 text-[#45e5e5]/20 absolute -top-4 -left-4 rotate-180" />
          <p className={`${fontSizeClass} font-bold text-[#10293f] leading-tight italic relative z-10 drop-shadow-sm`}>
            "{resposta.maior_sonho}"
          </p>
        </div>

        {/* Frase Motivacional Fixa */}
        <div className="bg-[#10293f] rounded-2xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#45e5e5] rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
          <p className="text-center text-xl text-white font-medium leading-relaxed relative z-10">
            "Nos dias difíceis, olhe para este quadro. O seu melhor é a única ponte entre onde você está e onde quer chegar."
          </p>
        </div>

        {/* Footer com Nome e Cargo */}
        <div className="mt-2 pt-6 border-t-2 border-zinc-100 flex justify-between items-end">
          <div>
            {/* COR DO NOME ALTERADA PARA 10293f */}
            <h3 className="text-5xl font-black text-[#10293f] uppercase tracking-tight leading-none mb-2 drop-shadow-sm">
              {resposta.colaborador_nome}
            </h3>
            <p className="text-2xl text-[#45e5e5] font-bold uppercase tracking-widest">
              {resposta.funcao_atual}
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2 mb-1">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-8 h-8 fill-[#10293f] text-[#10293f]" />
              ))}
            </div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em]">COMPROMETIMENTO SISMAIS</p>
          </div>
        </div>
      </div>

      {/* Barra colorida inferior */}
      <div className="h-4 w-full bg-gradient-to-r from-[#10293f] to-[#45e5e5]" />
    </div>
  );
}