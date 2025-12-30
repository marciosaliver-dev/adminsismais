import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";

interface PermissionGateProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  requireAdmin?: boolean;
  fallback?: ReactNode;
}

export function PermissionGate({
  children,
  permission,
  permissions = [],
  requireAll = false,
  requireAdmin = false,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission, isAdmin, loading } = usePermissions();

  if (loading) {
    return null;
  }

  // Se requer admin, verificar primeiro
  if (requireAdmin && !isAdmin) {
    return <>{fallback}</>;
  }

  // Se não tem permissões específicas para verificar, renderizar children
  if (!permission && permissions.length === 0) {
    return <>{children}</>;
  }

  // Combinar permission única com array de permissions
  const allPermissions = permission ? [permission, ...permissions] : permissions;

  // Verificar permissões
  const hasAccess = requireAll
    ? allPermissions.every((p) => hasPermission(p))
    : allPermissions.some((p) => hasPermission(p));

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
