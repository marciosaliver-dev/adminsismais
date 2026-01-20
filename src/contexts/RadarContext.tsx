import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRadarData } from "@/hooks/useRadarData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type CicloOKR = Tables<"ciclos_okr">;
type MembroRadar = Tables<"membros_radar">;
type ObjetivoOKR = Tables<"objetivos_okr">;
type KeyResult = Tables<"key_results">;

interface RadarContextType {
  loading: boolean;
  membros: MembroRadar[];
  membroAtual: MembroRadar | undefined;
  ciclos: CicloOKR[];
  cicloAtivo: CicloOKR | null;
  objetivos: ObjetivoOKR[];
  keyResults: KeyResult[];
  selecionarCiclo: (cicloId: string) => void;
  fetchObjetivos: (cicloId: string) => Promise<ObjetivoOKR[]>;
  fetchKeyResults: (objetivoId: string) => Promise<KeyResult[]>;
}

const RadarContext = createContext<RadarContextType | undefined>(undefined);

export function RadarProvider({ children }: { children: ReactNode }) {
  const { user, loading: loadingAuth } = useAuth();
  const { membros, membroAtual, ciclos, cicloAtivoPadrao, loading: loadingData } = useRadarData();
  
  const [cicloAtivo, setCicloAtivo] = useState<CicloOKR | null>(null);
  const [objetivos, setObjetivos] = useState<ObjetivoOKR[]>([]);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loadingAuth && !loadingData) {
      if (cicloAtivoPadrao && !cicloAtivo) {
        setCicloAtivo(cicloAtivoPadrao);
      }
      setLoading(false);
    }
  }, [loadingAuth, loadingData, cicloAtivoPadrao, cicloAtivo]);

  const selecionarCiclo = (cicloId: string) => {
    const novoCiclo = ciclos.find(c => c.id === cicloId);
    if (novoCiclo) {
      setCicloAtivo(novoCiclo);
      // Limpar objetivos e KRs ao trocar de ciclo
      setObjetivos([]);
      setKeyResults([]);
    }
  };

  const fetchObjetivos = async (cicloId: string): Promise<ObjetivoOKR[]> => {
    const { data, error } = await supabase
      .from("objetivos_okr")
      .select("*")
      .eq("ciclo_id", cicloId)
      .order("created_at");
    
    if (error) {
      console.error("Erro ao buscar objetivos:", error);
      return [];
    }
    setObjetivos(data as ObjetivoOKR[]);
    return data as ObjetivoOKR[];
  };

  const fetchKeyResults = async (objetivoId: string): Promise<KeyResult[]> => {
    const { data, error } = await supabase
      .from("key_results")
      .select("*")
      .eq("objetivo_id", objetivoId)
      .order("created_at");
    
    if (error) {
      console.error("Erro ao buscar KRs:", error);
      return [];
    }
    setKeyResults(data as KeyResult[]);
    return data as KeyResult[];
  };

  const contextValue = {
    loading,
    membros,
    membroAtual,
    ciclos,
    cicloAtivo,
    objetivos,
    keyResults,
    selecionarCiclo,
    fetchObjetivos,
    fetchKeyResults,
  };

  return (
    <RadarContext.Provider value={contextValue}>
      {children}
    </RadarContext.Provider>
  );
}

export function useRadar() {
  const context = useContext(RadarContext);
  if (context === undefined) {
    throw new Error("useRadar must be used within a RadarProvider");
  }
  return context;
}