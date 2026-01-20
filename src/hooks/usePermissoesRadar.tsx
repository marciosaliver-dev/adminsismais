import { useMemo } from "react";
import { useRadar } from "@/contexts/RadarContext";
import { usePermissions } from "./usePermissions";

interface UsePermissoesRadarReturn {
  membroAtual: any;
  area: string | null;
  isProprietario: boolean;
  isGestor: boolean;
  isColaborador: boolean;
  podeGerenciarOKRs: boolean;
  podeGerenciarEquipe: boolean;
  loading: boolean;
}

export function usePermissoesRadar(): UsePermissoesRadarReturn {
  const { membroAtual, loading: loadingRadar } = useRadar();
  const { isAdmin, loading: loadingGlobalPermissions } = usePermissions();

  const loading = loadingRadar || loadingGlobalPermissions;

  const { isProprietario, isGestor, isColaborador, area } = useMemo(() => {
    if (loading || !membroAtual) {
      return {
        isProprietario: false,
        isGestor: false,
        isColaborador: false,
        area: null,
      };
    }

    const papel = membroAtual.papel_radar;
    const isProprietario = isAdmin || papel === "Proprietário";
    const isGestor = isProprietario || papel === "Gestor";
    const isColaborador = papel === "Colaborador";
    const area = membroAtual.area;

    return {
      isProprietario,
      isGestor,
      isColaborador,
      area,
    };
  }, [membroAtual, loading, isAdmin]);

  const podeGerenciarOKRs = isProprietario || isGestor;
  const podeGerenciarEquipe = isProprietario || isGestor;

  return {
    membroAtual,
    area,
    isProprietario,
    isGestor,
    isColaborador,
    podeGerenciarOKRs,
    podeGerenciarEquipe,
    loading,
  };
}