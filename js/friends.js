// Функции для работы с друзьями
async function getFriends() {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          friend_id,
          users!friendships_friend_id_fkey (id, username, email, avatar_url)
        `)
        .eq('user_id', user.id);
  
      if (error) {
        throw error;
      }
  
      // Форматируем полученные данные
      return data.map(friendship => ({
        ...friendship.users,
      }));
    } catch (error) {
      console.error('Error fetching friends:', error);
      return [];
    }
  }
  
  async function searchUsers(query) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      // Получаем список ID друзей пользователя
      const { data: friendsData, error: friendsError } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', user.id);
  
      if (friendsError) {
        throw friendsError;
      }
  
      const friendIds = friendsData.map(f => f.friend_id);
      
      // Добавляем ID самого пользователя, чтобы исключить его из результатов
      friendIds.push(user.id);
  
      // Ищем пользователей по имени или email, исключая уже добавленных друзей и самого пользователя
      const { data, error } = await supabase
        .from('users')
        .select('id, username, email, avatar_url')
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .not('id', 'in', `(${friendIds.join(',')})`);
  
      if (error) {
        throw error;
      }
  
      return data;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }
  
  async function addFriend(friendId) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      const { data, error } = await supabase
        .from('friendships')
        .insert([
          {
            user_id: user.id,
            friend_id: friendId,
          },
        ]);
  
      if (error) {
        throw error;
      }
  
      return { data };
    } catch (error) {
      console.error('Error adding friend:', error);
      return { error };
    }
  }
  
  async function removeFriend(friendId) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', friendId);
  
      if (error) {
        throw error;
      }
  
      return { success: true };
    } catch (error) {
      console.error('Error removing friend:', error);
      return { error };
    }
  }
  
  async function getFriendGifts(friendId) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      // Проверяем, является ли этот пользователь другом
      const { data: friendshipData, error: friendshipError } = await supabase
        .from('friendships')
        .select('*')
        .eq('user_id', user.id)
        .eq('friend_id', friendId)
        .single();
  
      if (friendshipError) {
        throw new Error('Этот пользователь не является вашим другом');
      }
  
      // Получаем подарки пользователя и информацию о бронировании
      const { data, error } = await supabase
        .from('gifts')
        .select(`
          *,
          booked_gifts (id, booked_by)
        `)
        .eq('user_id', friendId);
  
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
      console.error('Error fetching friend gifts:', error);
      return [];
    }
  }
  
  async function bookGift(giftId) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      const { data, error } = await supabase
        .from('booked_gifts')
        .insert([
          {
            gift_id: giftId,
            booked_by: user.id,
          },
        ]);
  
      if (error) {
        throw error;
      }
  
      return { data };
    } catch (error) {
      console.error('Error booking gift:', error);
      return { error };
    }
  }
  
  async function unbookGift(giftId) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      const { error } = await supabase
        .from('booked_gifts')
        .delete()
        .eq('gift_id', giftId)
        .eq('booked_by', user.id);
  
      if (error) {
        throw error;
      }
  
      return { success: true };
    } catch (error) {
      console.error('Error unbooking gift:', error);
      return { error };
    }
  }