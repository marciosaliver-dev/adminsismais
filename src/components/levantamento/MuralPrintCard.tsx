"use client";

import { Badge } from "@/components/ui/badge";
import { Rocket, Quote, Star } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type LevantamentoRow = Tables<"levantamento_operacional_2024">;

interface MuralPrintCardProps {
  resposta: LevantamentoRow;
}

export function MuralPrintCard({ resposta }: MuralPrintCardProps) {
  return (
    <div 
      id={`card-sonho-${resposta.id}`}
      className="w-[800px] h-[1000px] bg-white p-12 flex flex-col relative overflow-hidden shadow-2xl border-[16px] border-primary/10"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Background Decorativo */}
      <div className="absolute top-[-100px] right-[-100px] w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-100px] left-[-100px] w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

      {/* Header do Card */}
      <div className="flex justify-between items-center mb-12 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-secondary tracking-tighter leading-none">SISMAIS</h2>
            <p className="text-primary font-bold tracking-[0.2em] text-sm">PLANO 10K • 2026</p>
          </div>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="text-primary border-primary/30 px-4 py-1 text-lg font-bold">
            MURAL DOS SONHOS
          </Badge>
        </div>
      </div>

      {/* Container da Imagem */}
      <div className="flex-1 bg-muted rounded-[32px] overflow-hidden border-4 border-white shadow-xl mb-12 relative">
        {resposta.fotos_sonhos && resposta.fotos_sonhos.length > 0 ? (
          <img 
            src={resposta.fotos_sonhos[0]} 
            alt="Meu Sonho" 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-primary/20 text-primary/20">
            <Star className="w-32 h-32 mb-4" />
            <span className="text-2xl font-black">RUMO AOS 10K</span>
          </div>
        )}
      </div>

      {/* Conteúdo Texto */}
      <div className="relative z-10 px-4">
        <Quote className="w-16 h-16 text-primary/10 absolute -top-8 -left-4 rotate-180" />
        
        <div className="space-y-6">
          <p className="text-3xl font-medium text-secondary leading-relaxed italic text-center">
            "{resposta.maior_sonho}"
          </p>
          
          <div className="pt-8 border-t border-primary/10 flex justify-between items-end">
            <div>
              <h3 className="text-4xl font-black text-primary tracking-tight leading-none uppercase">
                {resposta.colaborador_nome}
              </h3>
              <p className="text-xl text-muted-foreground mt-2 font-medium">
                {resposta.funcao_atual}
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-xs font-bold text-primary/40 uppercase tracking-widest">Comprometimento Sismais</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé Decorativo */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-primary via-primary/50 to-primary" />
    </div>
  );
}