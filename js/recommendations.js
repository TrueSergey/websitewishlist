// Функции для работы с рекомендациями
async function getRecommendations() {
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .select(`
          *,
          users (username, avatar_url)
        `)
        .order('created_at', { ascending: false });
  
      if (error) {
        throw error;
      }
  
      // Форматируем полученные данные
      return data.map(rec => ({
        ...rec,
        username: rec.users.username,
        avatar_url: rec.users.avatar_url,
      }));
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  }
  
  async function addRecommendation(recommendation) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      // Преобразуем строку с хэштегами в массив
      const hashtags = recommendation.hashtags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
  
      const { data, error } = await supabase
        .from('recommendations')
        .insert([
          {
            user_id: user.id,
            title: recommendation.title,
            description: recommendation.description,
            media_url: recommendation.media_url,
            link: recommendation.link,
            article_number: recommendation.article_number,
            hashtags,
          },
        ]);
  
      if (error) {
        throw error;
      }
  
      return { data };
    } catch (error) {
      console.error('Error adding recommendation:', error);
      return { error };
    }
  }
  
  async function deleteRecommendation(id) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      // Получаем данные о рекомендации
      const { data: recData, error: recError } = await supabase
        .from('recommendations')
        .select('user_id')
        .eq('id', id)
        .single();
  
      if (recError) {
        throw recError;
      }
  
      // Проверяем, может ли пользователь удалить эту рекомендацию
      if (recData.user_id !== user.id && !user.is_admin) {
        throw new Error('Нет прав на удаление этой рекомендации');
      }
  
      // Удаляем рекомендацию
      const { error } = await supabase
        .from('recommendations')
        .delete()
        .eq('id', id);
  
      if (error) {
        throw error;
      }
  
      return { success: true };
    } catch (error) {
      console.error('Error deleting recommendation:', error);
      return { error };
    }
  }
  
  async function getPopularHashtags() {
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .select('hashtags');
  
      if (error) {
        throw error;
      }
  
      // Собираем все хэштеги в один массив
      const allTags = data.flatMap(rec => rec.hashtags || []);
      
      // Подсчитываем количество использований каждого хэштега
      const tagCounts = {};
      allTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
      
      // Сортируем хэштеги по популярности
      const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(entry => entry[0]);
      
      return sortedTags;
    } catch (error) {
      console.error('Error fetching popular hashtags:', error);
      return [];
    }
  }