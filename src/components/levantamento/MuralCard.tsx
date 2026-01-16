"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageIcon, Rocket, Heart } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type LevantamentoRow = Tables<"levantamento_operacional_2024">;

interface MuralCardProps {
  resposta: LevantamentoRow;
  onOpenDetails: (r: LevantamentoRow) => void;
  onOpenPrint: (r: LevantamentoRow) => void;
}

export function MuralCard({ resposta, onOpenDetails, onOpenPrint }: MuralCardProps) {
  const hasPhotos = resposta.fotos_sonhos && resposta.fotos_sonhos.length > 0;

  return (
    <Card className="overflow-hidden group border-none shadow-md hover:shadow-xl transition-all bg-card/50 backdrop-blur-sm">
      <div className="relative aspect-[4/5] bg-muted overflow-hidden">
        {hasPhotos ? (
          <Carousel className="w-full h-full">
            <CarouselContent className="h-full ml-0">
              {resposta.fotos_sonhos?.map((url, index) => (
                <CarouselItem key={index} className="pl-0 h-full">
                  <div className="relative w-full h-full flex items-center justify-center bg-zinc-900">
                    <img
                      src={url}
                      alt={`Sonho ${index + 1}`}
                      className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            
            {resposta.fotos_sonhos && resposta.fotos_sonhos.length > 1 && (
              <>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                  {resposta.fotos_sonhos.map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/50" />
                  ))}
                </div>
                {/* Setas com z-40 para ficarem acima do overlay de ações */}
                <CarouselPrevious className="left-2 bg-black/40 border-none text-white hover:bg-black/60 z-40" />
                <CarouselNext className="right-2 bg-black/40 border-none text-white hover:bg-black/60 z-40" />
              </>
            )}
          </Carousel>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-primary/5">
            <Rocket className="w-12 h-12 opacity-10 mb-2" />
            <span className="text-xs font-medium opacity-20 uppercase tracking-widest">Rumo aos 10K</span>
          </div>
        )}

        {/* Overlay de Ações - z-20 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4 z-20">
          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full max-w-[160px] gap-2 rounded-xl shadow-lg"
            onClick={() => onOpenPrint(resposta)}
          >
            <ImageIcon className="w-4 h-4" /> Gerar Card Print
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full max-w-[160px] text-white hover:text-white hover:bg-white/20 rounded-xl"
            onClick={() => onOpenDetails(resposta)}
          >
            Ver Depoimento
          </Button>
        </div>

        {/* Badge de Clima - z-50 para ficar sempre no topo */}
        <div className="absolute top-3 right-3 z-50">
          <Badge className="bg-black/50 backdrop-blur-md border-white/20 text-white font-bold">
            <Heart className="w-3 h-3 mr-1 fill-red-500 text-red-500" />
            {resposta.satisfacao_trabalho}/10
          </Badge>
        </div>
      </div>

      <CardContent className="p-5 relative">
        <div className="space-y-1">
          <p className="font-bold text-primary leading-tight text-lg truncate">
            {resposta.colaborador_nome}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-semibold">
            {resposta.funcao_atual}
          </p>
        </div>
        <div className="mt-4 relative">
          <span className="absolute -top-2 -left-1 text-3xl text-primary/10 font-serif">"</span>
          <p className="text-sm line-clamp-3 italic text-muted-foreground leading-relaxed pl-3 border-l-2 border-primary/20">
            {resposta.maior_sonho}
          </p>
        </div>
        
        {hasPhotos && resposta.fotos_sonhos && resposta.fotos_sonhos.length > 1 && (
          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-primary/60 uppercase tracking-tighter">
            <ImageIcon className="w-3 h-3" />
            {resposta.fotos_sonhos.length} fotos disponíveis
          </div>
        )}
      </CardContent>
    </Card>
  );
}