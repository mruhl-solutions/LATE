import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const { session, user } = useAuthStore();

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  // El perfil se crea automáticamente via trigger on_auth_user_created.
  // El alias se pasa como metadata para que el trigger lo use.
  const signUp = async (email: string, password: string, alias: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { alias: alias.trim() } },
    });
    if (error) throw error;
    // Si session es null, Supabase tiene confirmación de email activada
    return { needsEmailConfirmation: !data.session };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { session, user, signIn, signUp, signOut };
}
