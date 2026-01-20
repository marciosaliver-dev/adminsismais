import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Tables } from "@/integrations/supabase/types";

type CicloOKR = Tables<"ciclos_okr">;
type MembroRadar = Tables<"membros_radar">;

export function useRadarData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1. Fetch Membros Radar (para identificar o usuário logado e permissões)
  const { data: membros = [], isLoading: loadingMembros } = useQuery({
    queryKey: ["membros_radar"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("membros_radar")
        .select("id, user_id, nome, email, area, papel_radar, ativo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data as MembroRadar[];
    },
    enabled: !!user,
  });

  const membroAtual = membros.find(m => m.user_id === user?.id);

  // 2. Fetch Ciclos OKR
  const { data: ciclos = [], isLoading: loadingCiclos } = useQuery({
    queryKey: ["ciclos_okr"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ciclos_okr")
        .select("id, nome, tipo, data_inicio, data_fim, status")
        .order("data_fim", { ascending: false });
      if (error) throw error;
      return data as CicloOKR[];
    },
    enabled: !!user,
  });

  const cicloAtivoPadrao = ciclos.find(c => c.status === "Ativo");

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ["membros_radar"] });
    queryClient.invalidateQueries({ queryKey: ["ciclos_okr"] });
  };

  return {
    membros,
    membroAtual,
    ciclos,
    cicloAtivoPadrao,
    loading: loadingMembros || loadingCiclos,
    refetchAll,
  };
}