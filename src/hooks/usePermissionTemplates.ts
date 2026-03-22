import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { GranularPermissions } from '@/types/permissions';
import type { Tables } from '@/integrations/supabase/types';

export type PermissionTemplate = Tables<'permission_templates'> & {
  permissions: GranularPermissions;
};

const QUERY_KEY = 'permission_templates';

export function usePermissionTemplates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permission_templates')
        .select('*')
        .eq('head_coach_id', user!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PermissionTemplate[];
    },
    enabled: !!user?.id,
  });
}

export function useCreatePermissionTemplate() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, permissions }: { name: string; permissions: GranularPermissions }) => {
      const { data, error } = await supabase
        .from('permission_templates')
        .insert({ head_coach_id: user!.id, name, permissions: permissions as any })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdatePermissionTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, permissions }: { id: string; name: string; permissions: GranularPermissions }) => {
      const { data, error } = await supabase
        .from('permission_templates')
        .update({ name, permissions: permissions as any })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useDeletePermissionTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('permission_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
