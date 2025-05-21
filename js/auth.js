// Функции для работы с аутентификацией
async function signUp(email, password, username) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    // Сохраняем данные пользователя в таблицу users
    const { error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: data.user.id,
          username,
          email,
        },
      ]);

    if (profileError) {
      throw profileError;
    }

    return { data, message: "Письмо для подтверждения отправлено на вашу почту" };
  } catch (error) {
    console.error('Error signing up:', error);
    return { error };
  }
}
  
  async function signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
  
      if (error) {
        throw error;
      }
  
      return { data };
    } catch (error) {
      console.error('Error signing in:', error);
      return { error };
    }
  }
  
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  }
  
  async function getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }
    
    if (!data.user) {
      return null;
    }
    
    // Получаем дополнительные данные пользователя из таблицы users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (userError) {
      console.error('Error getting user data:', userError);
      return null;
    }
    
    return { ...data.user, ...userData };
  }