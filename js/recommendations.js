// Функции для работы с рекомендациями
async function getRecommendations(page = 0, pageSize = 10) {
    try {
      // Используем пагинацию для плавной подгрузки рекомендаций
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await supabase
        .from('recommendations')
        .select(`
          *,
          users (username, avatar_url)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
  
      if (error) {
        throw error;
      }
  
      // Форматируем полученные данные
      return {
        recommendations: data.map(rec => ({
          ...rec,
          username: rec.users.username,
          avatar_url: rec.users.avatar_url,
        })),
        totalCount: count,
        hasMore: count > (page + 1) * pageSize
      };
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return { recommendations: [], totalCount: 0, hasMore: false };
    }
  }
  
  async function uploadMedia(file, type) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
      
      // Создаем уникальное имя файла
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${user.id}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${type}/${fileName}`;
      
      // Загружаем файл в хранилище
      const { data, error } = await supabase.storage
        .from('user_media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        throw error;
      }
      
      // Получаем публичный URL файла
      const { data: urlData } = supabase.storage
        .from('user_media')
        .getPublicUrl(filePath);
      
      return { url: urlData.publicUrl };
    } catch (error) {
      console.error('Error uploading media:', error);
      return { error };
    }
  }
  
  async function addRecommendation(recommendation, mediaFile) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      // Если передан файл медиа, сначала загружаем его
      let media_url = recommendation.media_url;
      if (mediaFile) {
        const isVideo = mediaFile.type.startsWith('video/');
        const { url, error: uploadError } = await uploadMedia(
          mediaFile, 
          isVideo ? 'videos' : 'images'
        );
        
        if (uploadError) {
          throw uploadError;
        }
        
        media_url = url;
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
            media_url: media_url,
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
        .select('user_id, media_url')
        .eq('id', id)
        .single();
  
      if (recError) {
        throw recError;
      }
  
      // Проверяем, может ли пользователь удалить эту рекомендацию
      if (recData.user_id !== user.id && !user.is_admin) {
        throw new Error('Нет прав на удаление этой рекомендации');
      }
  
      // Удаляем медиафайл из хранилища, если он есть и был загружен в наше хранилище
      if (recData.media_url && recData.media_url.includes('user_media')) {
        const mediaPath = recData.media_url.split('user_media/')[1];
        if (mediaPath) {
          await supabase.storage
            .from('user_media')
            .remove([mediaPath]);
        }
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
  
  async function likeRecommendation(id) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      const { data, error } = await supabase
        .from('recommendation_likes')
        .insert([
          {
            recommendation_id: id,
            user_id: user.id,
          },
        ]);
  
      if (error) {
        // Проверяем, если ошибка связана с тем, что лайк уже стоит
        if (error.code === '23505') { // код ошибки уникального ограничения
          // Удаляем лайк (реализуем переключение)
          const { error: deleteError } = await supabase
            .from('recommendation_likes')
            .delete()
            .eq('recommendation_id', id)
            .eq('user_id', user.id);
            
          if (deleteError) {
            throw deleteError;
          }
          
          return { action: 'unliked' };
        }
        throw error;
      }
  
      return { action: 'liked' };
    } catch (error) {
      console.error('Error liking recommendation:', error);
      return { error };
    }
  }
  
  async function getRecommendationLikes(id) {
    try {
      const { data, error, count } = await supabase
        .from('recommendation_likes')
        .select('*', { count: 'exact' })
        .eq('recommendation_id', id);
  
      if (error) {
        throw error;
      }
  
      return { count: count || 0 };
    } catch (error) {
      console.error('Error getting recommendation likes:', error);
      return { count: 0 };
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
  
  async function getRecommendationsByHashtag(hashtag, page = 0, pageSize = 10) {
    try {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await supabase
        .from('recommendations')
        .select(`
          *,
          users (username, avatar_url)
        `, { count: 'exact' })
        .contains('hashtags', [hashtag])
        .order('created_at', { ascending: false })
        .range(from, to);
  
      if (error) {
        throw error;
      }
  
      return {
        recommendations: data.map(rec => ({
          ...rec,
          username: rec.users.username,
          avatar_url: rec.users.avatar_url,
        })),
        totalCount: count,
        hasMore: count > (page + 1) * pageSize
      };
    } catch (error) {
      console.error('Error fetching recommendations by hashtag:', error);
      return { recommendations: [], totalCount: 0, hasMore: false };
    }
  }