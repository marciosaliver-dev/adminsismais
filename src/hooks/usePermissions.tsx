import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Permission {
  codigo: string;
  permitido: boolean;
}

interface UserRole {
  role: "admin" | "user";
}

interface UsePermissionsReturn {
  permissions: Permission[];
  roles: UserRole[];
  isAdmin: boolean;
  loading: boolean;
  hasPermission: (codigo: string) => boolean;
  hasRole: (role: "admin" | "user") => boolean;
  refetch: () => Promise<void>;
}

export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      // Buscar roles do usuário
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (rolesError) {
        console.error("Erro ao buscar roles:", rolesError);
      } else {
        setRoles(rolesData?.map((r) => ({ role: r.role as "admin" | "user" })) || []);
      }

      // Buscar permissões específicas do usuário
      const { data: permData, error: permError } = await supabase
        .from("permissoes_usuario")
        .select(`
          permitido,
          funcionalidades (
            codigo
          )
        `)
        .eq("user_id", user.id);

      if (permError) {
        console.error("Erro ao buscar permissões:", permError);
      } else {
        const formattedPerms = permData?.map((p) => ({
          codigo: (p.funcionalidades as unknown as { codigo: string })?.codigo || "",
          permitido: p.permitido,
        })) || [];
        setPermissions(formattedPerms);
      }
    } catch (err) {
      console.error("Erro ao carregar permissões:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const isAdmin = roles.some((r) => r.role === "admin");

  const hasRole = useCallback(
    (role: "admin" | "user") => {
      return roles.some((r) => r.role === role);
    },
    [roles]
  );

  const hasPermission = useCallback(
    (codigo: string) => {
      // Admins têm todas as permissões
      if (isAdmin) return true;

      // Verificar permissão específica
      const perm = permissions.find((p) => p.codigo === codigo);
      return perm?.permitido ?? false;
    },
    [permissions, isAdmin]
  );

  return {
    permissions,
    roles,
    isAdmin,
    loading,
    hasPermission,
    hasRole,
    refetch: fetchPermissions,
  };
}
