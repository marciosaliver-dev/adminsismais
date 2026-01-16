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
  selectedPhotos?: string[]; 
  highlightedPhotoUrl?: string | null;
  photoSettings?: Record<string, PhotoSetting>;
  theme?: "light" | "dark";
  id?: string;
  onPhotoClick?: (index: number) => void;
  onPhotoMouseDown?: (index: number, e: React.MouseEvent) => void;
  activePhotoIndex?: number | null;
}

export function MuralPrintCard({ 
  resposta, 
  selectedPhotos = [],
  highlightedPhotoUrl = null,
  photoSettings = {},
  theme = "light",
  id,
  onPhotoClick,
  onPhotoMouseDown,
  activePhotoIndex
}: MuralPrintCardProps) {
  
  const rawPhotos = selectedPhotos.length > 0 
    ? selectedPhotos 
    : (resposta.fotos_sonhos?.slice(0, 6) || []);

  const fotos = highlightedPhotoUrl && rawPhotos.includes(highlightedPhotoUrl)
    ? [highlightedPhotoUrl, ...rawPhotos.filter(p => p !== highlightedPhotoUrl)]
    : rawPhotos;
    
  const hasPhotos = fotos.length > 0;
  const isDark = theme === "dark";

  const colors = {
    bg: isDark ? "bg-[#10293f]" : "bg-white",
    textPrimary: isDark ? "text-[#45e5e5]" : "text-[#10293f]",
    textSecondary: isDark ? "text-white" : "text-[#45e5e5]",
    textMuted: isDark ? "text-zinc-400" : "text-zinc-400",
    borderImage: isDark ? "border-[#10293f]" : "border-white",
    quoteIcon: isDark ? "text-[#45e5e5]/20" : "text-[#45e5e5]/20",
    quoteText: isDark ? "text-white" : "text-[#10293f]",
    motivacionalBg: isDark ? "bg-[#0b1d2e] border border-[#45e5e5]/20" : "bg-[#10293f]",
    motivacionalText: "text-white",
    footerStars: isDark ? "text-[#45e5e5] fill-[#45e5e5]" : "text-[#10293f] fill-[#10293f]",
    badgeBg: isDark ? "bg-[#45e5e5]/10 border-[#45e5e5]/30 text-[#45e5e5]" : "bg-white/80 border-[#10293f]/20 text-[#10293f]",
    headerSubtext: isDark ? "text-zinc-500" : "text-zinc-400",
    headerTitle: isDark ? "text-[#45e5e5]" : "text-[#10293f]",
    imageContainerBg: isDark ? "bg-[#0b1d2e]" : "bg-zinc-50"
  };

  const getFontSize = (text: string) => {
    const length = text.length;
    if (!hasPhotos) {
      if (length < 80) return "text-6xl";
      if (length < 150) return "text-5xl";
      if (length < 300) return "text-4xl";
      return "text-3xl";
    }
    
    if (length < 80) return "text-4xl"; 
    if (length < 150) return "text-3xl";
    if (length < 300) return "text-2xl";
    return "text-xl";
  };

  const fontSizeClass = getFontSize(resposta.maior_sonho || "");

  const RenderImage = ({ url, index, className }: { url: string, index: number, className?: string }) => {
    const settings = photoSettings[url] || { x: 50, y: 50, zoom: 1 };
    
    const originalIndex = selectedPhotos.indexOf(url);
    const isActive = activePhotoIndex !== null && selectedPhotos[activePhotoIndex] === url;
    
    return (
      <div 
        className={cn(
          "w-full h-full overflow-hidden relative group transition-all border-4 box-border",
          className,
          colors.borderImage,
          isActive ? "z-30 shadow-2xl cursor-move" : "cursor-pointer hover:brightness-90"
        )}
        onMouseDown={(e) => {
          if (originalIndex !== -1) onPhotoMouseDown?.(originalIndex, e);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (originalIndex !== -1) onPhotoClick?.(originalIndex);
        }}
      >
        <img 
          src={url} 
          alt={`Sonho ${index}`} 
          draggable={false}
          className="w-full h-full object-cover transition-transform duration-75 ease-out will-change-transform select-none"
          style={{ 
            objectPosition: `${settings.x}% ${settings.y}%`,
            transform: `scale(${settings.zoom})`,
            transformOrigin: `${settings.x}% ${settings.y}%`
          }} 
        />
        
        {/* Overlay de "Editar" apenas se não estiver ativo */}
        {onPhotoClick && !isActive && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none bg-black/10">
            <span className="text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm border border-white/20">
              Ajustar
            </span>
          </div>
        )}
        
        {/* Feedback sutil de seleção (borda interna fina) */}
        {isActive && (
          <div className="absolute inset-0 border border-white/40 pointer-events-none z-40" />
        )}
      </div>
    );
  };

  const renderImageGrid = () => {
    if (!hasPhotos) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center opacity-20">
          <Star className={cn("w-32 h-32 mb-4", colors.textPrimary)} />
          <span className={cn("text-2xl font-black uppercase tracking-widest", colors.textPrimary)}>Sem fotos</span>
        </div>
      );
    }

    if (fotos.length === 1) return <RenderImage url={fotos[0]} index={0} className="rounded-[24px]" />;

    if (fotos.length === 2) {
      return (
        <div className="w-full h-full grid grid-cols-2 gap-2">
          <div className="relative"><RenderImage url={fotos[0]} index={0} className="absolute inset-0 rounded-l-[24px]" /></div>
          <div className="relative"><RenderImage url={fotos[1]} index={1} className="absolute inset-0 rounded-r-[24px]" /></div>
        </div>
      );
    }

    if (fotos.length === 3) {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-2">
          <div className="col-span-2 row-span-2 relative">
            <RenderImage url={fotos[0]} index={0} className="absolute inset-0 rounded-l-[24px]" />
          </div>
          <div className="col-span-1 row-span-1 relative">
            <RenderImage url={fotos[1]} index={1} className="absolute inset-0 rounded-tr-[24px]" />
          </div>
          <div className="col-span-1 row-span-1 relative">
            <RenderImage url={fotos[2]} index={2} className="absolute inset-0 rounded-br-[24px]" />
          </div>
        </div>
      );
    }

    if (fotos.length === 4) {
      return (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-2">
          <div className="relative"><RenderImage url={fotos[0]} index={0} className="absolute inset-0 rounded-tl-[24px]" /></div>
          <div className="relative"><RenderImage url={fotos[1]} index={1} className="absolute inset-0 rounded-tr-[24px]" /></div>
          <div className="relative"><RenderImage url={fotos[2]} index={2} className="absolute inset-0 rounded-bl-[24px]" /></div>
          <div className="relative"><RenderImage url={fotos[3]} index={3} className="absolute inset-0 rounded-br-[24px]" /></div>
        </div>
      );
    }

    if (fotos.length === 5) {
      return (
        <div className="w-full h-full grid grid-rows-2 gap-2">
          <div className="row-span-1 relative">
            <RenderImage url={fotos[0]} index={0} className="absolute inset-0 rounded-t-[24px]" />
          </div>
          <div className="grid grid-cols-4 gap-2 row-span-1">
            <div className="relative"><RenderImage url={fotos[1]} index={1} className="absolute inset-0 rounded-bl-[24px]" /></div>
            <div className="relative"><RenderImage url={fotos[2]} index={2} className="absolute inset-0" /></div>
            <div className="relative"><RenderImage url={fotos[3]} index={3} className="absolute inset-0" /></div>
            <div className="relative"><RenderImage url={fotos[4]} index={4} className="absolute inset-0 rounded-br-[24px]" /></div>
          </div>
        </div>
      );
    }

    if (fotos.length === 6) {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-2">
          <div className="relative"><RenderImage url={fotos[0]} index={0} className="absolute inset-0 rounded-tl-[24px]" /></div>
          <div className="relative"><RenderImage url={fotos[1]} index={1} className="absolute inset-0" /></div>
          <div className="relative"><RenderImage url={fotos[2]} index={2} className="absolute inset-0 rounded-tr-[24px]" /></div>
          <div className="relative"><RenderImage url={fotos[3]} index={3} className="absolute inset-0 rounded-bl-[24px]" /></div>
          <div className="relative"><RenderImage url={fotos[4]} index={4} className="absolute inset-0" /></div>
          <div className="relative"><RenderImage url={fotos[5]} index={5} className="absolute inset-0 rounded-br-[24px]" /></div>
        </div>
      );
    }
  };

  return (
    <div 
      id={id || `card-sonho-${resposta.id}`}
      className={cn("w-[900px] h-[1200px] flex flex-col relative overflow-hidden shadow-2xl flex-shrink-0 select-none", colors.bg)}
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-[#45e5e5]/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-[#10293f]/10 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

      {/* Header */}
      <div className="px-12 pt-10 pb-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-6">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-zinc-100">
            <img src="/logo_op2_horizontal.png.webp" alt="Sismais" className="h-14 w-auto object-contain" />
          </div>
          <div className="h-10 w-[1px] bg-zinc-300/30" />
          <div>
            <p className={cn("font-bold tracking-[0.2em] text-xs", colors.headerTitle)}>PLANO 10K</p>
            <p className={cn("font-black text-2xl tracking-tight", colors.headerSubtext)}>2026</p>
          </div>
        </div>
        <Badge variant="outline" className={cn("px-6 py-2 text-lg font-bold backdrop-blur-sm shadow-sm rounded-full", colors.badgeBg)}>
          MURAL DOS SONHOS
        </Badge>
      </div>

      {/* Área da Imagem (Central) */}
      {hasPhotos && (
        <div className="px-12 flex-1 min-h-0 flex flex-col">
          <div className={cn("w-full flex-1 rounded-[32px] overflow-hidden border-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] relative", colors.imageContainerBg, colors.borderImage)}>
            {renderImageGrid()}
          </div>
        </div>
      )}

      {/* Conteúdo de Texto e Footer */}
      <div className={cn(
        "px-12 pb-12 pt-8 relative z-10 flex flex-col gap-6",
        !hasPhotos && "flex-1 justify-center pt-0" // Centraliza verticalmente se sem fotos
      )}>
        
        {/* Citação do Sonho */}
        <div className="relative pl-10 pr-4">
          <Quote className={cn("w-20 h-20 absolute -top-4 -left-4 rotate-180", colors.quoteIcon)} />
          <p className={`${fontSizeClass} font-bold leading-tight italic relative z-10 drop-shadow-sm ${colors.quoteText}`}>
            "{resposta.maior_sonho}"
          </p>
        </div>

        {/* Frase Motivacional Fixa */}
        <div className={cn("rounded-2xl p-6 shadow-lg relative overflow-hidden", colors.motivacionalBg)}>
          {!isDark && <div className="absolute top-0 right-0 w-32 h-32 bg-[#45e5e5] rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>}
          <p className={cn("text-center text-xl font-medium leading-relaxed relative z-10", colors.motivacionalText)}>
            "Nos dias difíceis, olhe para este quadro. O seu melhor é a única ponte entre onde você está e onde quer chegar."
          </p>
        </div>

        {/* Footer com Nome e Cargo */}
        <div className={cn("mt-2 pt-6 border-t-2 flex justify-between items-end", isDark ? "border-[#45e5e5]/20" : "border-zinc-100")}>
          <div>
            <h3 className={cn("text-5xl font-black uppercase tracking-tight leading-none mb-2 drop-shadow-sm", colors.textPrimary)}>
              {resposta.colaborador_nome}
            </h3>
            <p className={cn("text-2xl font-bold uppercase tracking-widest", colors.textSecondary)}>
              {resposta.funcao_atual}
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2 mb-1">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={cn("w-8 h-8", colors.footerStars)} />
              ))}
            </div>
            <p className={cn("text-[10px] font-bold uppercase tracking-[0.3em]", colors.headerSubtext)}>COMPROMETIMENTO SISMAIS</p>
          </div>
        </div>
      </div>

      {/* Barra colorida inferior */}
      <div className="h-4 w-full bg-gradient-to-r from-[#10293f] to-[#45e5e5]" />
    </div>
  );
}