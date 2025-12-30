import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Save, Loader2 } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  aprovado: boolean;
}

interface Modulo {
  id: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  ordem: number;
}

interface Funcionalidade {
  id: string;
  modulo_id: string;
  nome: string;
  codigo: string;
  descricao: string | null;
}

interface PermissaoUsuario {
  id: string;
  user_id: string;
  funcionalidade_id: string;
  permitido: boolean;
}

export default function GerenciarPermissoes() {
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [funcionalidades, setFuncionalidades] = useState<Funcionalidade[]>([]);
  const [permissoes, setPermissoes] = useState<PermissaoUsuario[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserPermissions(selectedUserId);
      checkIfUserIsAdmin(selectedUserId);
    }
  }, [selectedUserId]);

  const fetchInitialData = async () => {
    try {
      const [profilesRes, modulosRes, funcRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("aprovado", true).order("nome"),
        supabase.from("modulos").select("*").eq("ativo", true).order("ordem"),
        supabase.from("funcionalidades").select("*").eq("ativo", true),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (modulosRes.error) throw modulosRes.error;
      if (funcRes.error) throw funcRes.error;

      setProfiles(profilesRes.data || []);
      setModulos(modulosRes.data || []);
      setFuncionalidades(funcRes.data || []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("permissoes_usuario")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      setPermissoes(data || []);
      setPendingChanges(new Map());
    } catch (err) {
      console.error("Erro ao carregar permissões:", err);
    }
  };

  const checkIfUserIsAdmin = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (error) throw error;
      setIsUserAdmin(!!data);
    } catch (err) {
      console.error("Erro ao verificar admin:", err);
    }
  };

  const getPermissionForFunc = (funcId: string): boolean => {
    // Primeiro verificar mudanças pendentes
    if (pendingChanges.has(funcId)) {
      return pendingChanges.get(funcId)!;
    }
    // Depois verificar permissões salvas
    const perm = permissoes.find((p) => p.funcionalidade_id === funcId);
    return perm?.permitido ?? false;
  };

  const handlePermissionChange = (funcId: string, value: boolean) => {
    const newChanges = new Map(pendingChanges);
    newChanges.set(funcId, value);
    setPendingChanges(newChanges);
  };

  const handleSave = async () => {
    if (!selectedUserId || pendingChanges.size === 0) return;

    setSaving(true);
    try {
      const updates: { user_id: string; funcionalidade_id: string; permitido: boolean }[] = [];
      
      pendingChanges.forEach((permitido, funcId) => {
        updates.push({
          user_id: selectedUserId,
          funcionalidade_id: funcId,
          permitido,
        });
      });

      // Upsert todas as permissões alteradas
      const { error } = await supabase
        .from("permissoes_usuario")
        .upsert(updates, { onConflict: "user_id,funcionalidade_id" });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Permissões salvas com sucesso!",
      });

      // Recarregar permissões
      fetchUserPermissions(selectedUserId);
    } catch (err) {
      console.error("Erro ao salvar:", err);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as permissões.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getFuncionalidadesByModulo = (moduloId: string) => {
    return funcionalidades.filter((f) => f.modulo_id === moduloId);
  };

  const selectedUser = profiles.find((p) => p.user_id === selectedUserId);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Acesso Negado</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gerenciar Permissões</h1>
        <p className="text-muted-foreground">
          Configure as permissões de acesso por usuário e módulo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Usuário</CardTitle>
          <CardDescription>
            Escolha um usuário para configurar suas permissões.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Selecione um usuário..." />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((profile) => (
                <SelectItem key={profile.user_id} value={profile.user_id}>
                  {profile.nome} ({profile.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedUser && (
            <div className="mt-4 flex items-center gap-2">
              <Badge variant={isUserAdmin ? "default" : "secondary"}>
                {isUserAdmin ? (
                  <>
                    <Shield className="h-3 w-3 mr-1" />
                    Administrador
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3 mr-1" />
                    Usuário
                  </>
                )}
              </Badge>
              {isUserAdmin && (
                <span className="text-sm text-muted-foreground">
                  Administradores têm acesso total ao sistema.
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUserId && !isUserAdmin && (
        <div className="space-y-4">
          {modulos.map((modulo) => {
            const funcs = getFuncionalidadesByModulo(modulo.id);
            if (funcs.length === 0) return null;

            return (
              <Card key={modulo.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{modulo.nome}</CardTitle>
                  {modulo.descricao && (
                    <CardDescription>{modulo.descricao}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {funcs.map((func, idx) => (
                    <div key={func.id}>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor={func.id} className="text-base">
                            {func.nome}
                          </Label>
                          {func.descricao && (
                            <p className="text-sm text-muted-foreground">
                              {func.descricao}
                            </p>
                          )}
                        </div>
                        <Switch
                          id={func.id}
                          checked={getPermissionForFunc(func.id)}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(func.id, checked)
                          }
                        />
                      </div>
                      {idx < funcs.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {pendingChanges.size > 0 && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Alterações ({pendingChanges.size})
              </Button>
            </div>
          )}
        </div>
      )}

      {selectedUserId && isUserAdmin && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                Este usuário é um administrador e possui acesso total a todas as
                funcionalidades do sistema.
              </p>
              <p className="mt-2 text-sm">
                Para configurar permissões específicas, remova o papel de
                administrador primeiro.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
