
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export enum UserRole {
  TEACHER = 'teacher',
  INSTITUTION_ADMIN = 'institution_admin',
  SUPER_ADMIN = 'super_admin'
}

export const useAdmin = () => {
  const { user } = useAuth();
  
  const { data: isAdmin, isLoading: isAdminLoading } = useQuery({
    queryKey: ['isAdmin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase.rpc('is_admin', { uid: user.id });
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user,
  });
  
  const { data: userRole, isLoading: isRoleLoading } = useQuery({
    queryKey: ['userRole', user?.id],
    queryFn: async () => {
      if (!user) return UserRole.TEACHER;
      
      const { data, error } = await supabase.rpc('get_user_role', { uid: user.id });
      if (error) {
        console.error('Error checking user role:', error);
        return UserRole.TEACHER;
      }
      
      return data as UserRole || UserRole.TEACHER;
    },
    enabled: !!user,
  });
  
  const isInstitutionAdmin = userRole === UserRole.INSTITUTION_ADMIN;
  const isSuperAdmin = userRole === UserRole.SUPER_ADMIN;
  
  return { 
    isAdmin: !!isAdmin || isSuperAdmin, 
    isInstitutionAdmin,
    isSuperAdmin,
    userRole,
    isLoading: isAdminLoading || isRoleLoading 
  };
};
