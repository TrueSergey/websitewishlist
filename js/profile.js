// Функции для работы с профилем
async function updateProfile(profileData) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      const { data, error } = await supabase
        .from('users')
        .update(profileData)
        .eq('id', user.id);
  
      if (error) {
        throw error;
      }
  
      return { data };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { error };
    }
  }
  
  async function uploadAvatar(file) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
      
      // Создаем уникальное имя файла для пользователя
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${user.id}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
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
      
      // Обновляем URL аватара в профиле пользователя
      await updateProfile({ avatar_url: urlData.publicUrl });
      
      return { url: urlData.publicUrl };
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return { error };
    }
  }
  
  async function updateAvatar(url) {
    try {
      return await updateProfile({ avatar_url: url });
    } catch (error) {
      console.error('Error updating avatar:', error);
      return { error };
    }
  }
  
  async function setTheme(theme) {
    try {
      return await updateProfile({ theme });
    } catch (error) {
      console.error('Error updating theme:', error);
      return { error };
    }
  }
  
  async function getMyGifts() {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      const { data, error } = await supabase
        .from('gifts')
        .select(`
          *,
          booked_gifts (id, booked_by)
        `)
        .eq('user_id', user.id);
  
      if (error) {
        throw error;
      }
  
      // Форматируем полученные данные
      return data.map(gift => ({
        ...gift,
        is_booked: gift.booked_gifts.length > 0,
        booked_by: gift.booked_gifts.length > 0 ? gift.booked_gifts[0].booked_by : null,
      }));
    } catch (error) {
      console.error('Error fetching my gifts:', error);
      return [];
    }
  }
  
  async function addGift(gift) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      const { data, error } = await supabase
        .from('gifts')
        .insert([
          {
            user_id: user.id,
            title: gift.title,
            description: gift.description,
            image_url: gift.image_url,
            link: gift.link,
            article_number: gift.article_number,
            additional_info: gift.additional_info,
          },
        ]);
  
      if (error) {
        throw error;
      }
  
      return { data };
    } catch (error) {
      console.error('Error adding gift:', error);
      return { error };
    }
  }
  
  async function uploadGiftImage(file) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
      
      // Создаем уникальное имя файла
      const fileExt = file.name.split('.').pop();
      const fileName = `gift_${user.id}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `gifts/${fileName}`;
      
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
      console.error('Error uploading gift image:', error);
      return { error };
    }
  }
  
  async function updateGift(giftId, gift) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      // Проверяем, принадлежит ли подарок пользователю
      const { data: giftData, error: giftError } = await supabase
        .from('gifts')
        .select('user_id')
        .eq('id', giftId)
        .single();
  
      if (giftError) {
        throw giftError;
      }
  
      if (giftData.user_id !== user.id) {
        throw new Error('Нет прав на редактирование этого подарка');
      }
  
      const { data, error } = await supabase
        .from('gifts')
        .update({
          title: gift.title,
          description: gift.description,
          image_url: gift.image_url,
          link: gift.link,
          article_number: gift.article_number,
          additional_info: gift.additional_info,
        })
        .eq('id', giftId);
  
      if (error) {
        throw error;
      }
  
      return { data };
    } catch (error) {
      console.error('Error updating gift:', error);
      return { error };
    }
  }
  
  async function deleteGift(giftId) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      // Проверяем, принадлежит ли подарок пользователю
      const { data: giftData, error: giftError } = await supabase
        .from('gifts')
        .select('user_id')
        .eq('id', giftId)
        .single();
  
      if (giftError) {
        throw giftError;
      }
  
      if (giftData.user_id !== user.id && !user.is_admin) {
        throw new Error('Нет прав на удаление этого подарка');
      }
  
      // Удаляем все бронирования подарка
      await supabase
        .from('booked_gifts')
        .delete()
        .eq('gift_id', giftId);
  
      // Удаляем подарок
      const { error } = await supabase
        .from('gifts')
        .delete()
        .eq('id', giftId);
  
      if (error) {
        throw error;
      }
  
      return { success: true };
    } catch (error) {
      console.error('Error deleting gift:', error);
      return { error };
    }
  }
  
  async function copyGiftToMyWishlist(gift) {
    try {
      const newGift = {
        title: gift.title,
        description: gift.description,
        image_url: gift.image_url,
        link: gift.link,
        article_number: gift.article_number,
        additional_info: gift.additional_info,
      };
      
      return await addGift(newGift);
    } catch (error) {
      console.error('Error copying gift:', error);
      return { error };
    }
  }