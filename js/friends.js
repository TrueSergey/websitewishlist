// Функции для работы с друзьями
async function getFriends() {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      // Получаем подтвержденных друзей (статус 'accepted')
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          friend_id,
          users!friendships_friend_id_fkey (id, username, email, avatar_url)
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted');
  
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
  
  async function getFriendRequests() {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      // Получаем входящие запросы в друзья (где текущий пользователь - получатель)
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          created_at,
          users!friendships_user_id_fkey (id, username, email, avatar_url)
        `)
        .eq('friend_id', user.id)
        .eq('status', 'pending');
  
      if (error) {
        throw error;
      }
  
      // Форматируем полученные данные
      return data.map(request => ({
        requestId: request.id,
        ...request.users,
        created_at: request.created_at
      }));
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      return [];
    }
  }
  
  async function getSentRequests() {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      // Получаем исходящие запросы в друзья (где текущий пользователь - отправитель)
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          friend_id,
          created_at,
          users!friendships_friend_id_fkey (id, username, email, avatar_url)
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending');
  
      if (error) {
        throw error;
      }
  
      // Форматируем полученные данные
      return data.map(request => ({
        requestId: request.id,
        ...request.users,
        created_at: request.created_at
      }));
    } catch (error) {
      console.error('Error fetching sent requests:', error);
      return [];
    }
  }
  
  async function searchUsers(query) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      // Получаем список ID пользователей, с которыми уже есть отношения (друзья или запросы)
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('friendships')
        .select('friend_id, user_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
  
      if (relationshipsError) {
        throw relationshipsError;
      }
  
      // Собираем все ID для исключения
      const excludeIds = new Set();
      excludeIds.add(user.id); // Исключаем самого пользователя
      
      relationshipsData.forEach(rel => {
        if (rel.user_id === user.id) {
          excludeIds.add(rel.friend_id);
        } else if (rel.friend_id === user.id) {
          excludeIds.add(rel.user_id);
        }
      });
  
      const excludeIdsArray = Array.from(excludeIds);
      
      // Ищем пользователей по имени или email, исключая уже связанных пользователей
      const { data, error } = await supabase
        .from('users')
        .select('id, username, email, avatar_url')
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .not('id', 'in', `(${excludeIdsArray.join(',')})`);
  
      if (error) {
        throw error;
      }
  
      return data;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }
  
  async function sendFriendRequest(friendId) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      // Создаем запрос на дружбу со статусом 'pending'
      const { data, error } = await supabase
        .from('friendships')
        .insert([
          {
            user_id: user.id,
            friend_id: friendId,
            status: 'pending',
          },
        ]);
  
      if (error) {
        throw error;
      }
  
      // Создаем уведомление для получателя запроса
      await createNotification({
        recipient_id: friendId,
        type: 'friend_request',
        content: `Пользователь ${user.username} хочет добавить вас в друзья`,
        sender_id: user.id
      });
  
      return { data };
    } catch (error) {
      console.error('Error sending friend request:', error);
      return { error };
    }
  }
  
  async function acceptFriendRequest(requestId) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      // Получаем информацию о запросе
      const { data: requestData, error: requestError } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('id', requestId)
        .single();
  
      if (requestError) {
        throw requestError;
      }
  
      // Проверяем, что текущий пользователь - получатель запроса
      if (requestData.friend_id !== user.id) {
        throw new Error('Нет прав на принятие этого запроса');
      }
  
      // Обновляем статус запроса на 'accepted'
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId);
  
      if (error) {
        throw error;
      }
  
      // Создаем уведомление для отправителя запроса
      await createNotification({
        recipient_id: requestData.user_id,
        type: 'friend_request_accepted',
        content: `Пользователь ${user.username} принял ваш запрос на дружбу`,
        sender_id: user.id
      });
  
      return { success: true };
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return { error };
    }
  }
  
  async function rejectFriendRequest(requestId) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      // Получаем информацию о запросе
      const { data: requestData, error: requestError } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('id', requestId)
        .single();
  
      if (requestError) {
        throw requestError;
      }
  
      // Проверяем, что текущий пользователь - получатель запроса
      if (requestData.friend_id !== user.id) {
        throw new Error('Нет прав на отклонение этого запроса');
      }
  
      // Удаляем запрос
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId);
  
      if (error) {
        throw error;
      }
  
      return { success: true };
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      return { error };
    }
  }
  
  async function cancelFriendRequest(requestId) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      // Получаем информацию о запросе
      const { data: requestData, error: requestError } = await supabase
        .from('friendships')
        .select('user_id')
        .eq('id', requestId)
        .single();
  
      if (requestError) {
        throw requestError;
      }
  
      // Проверяем, что текущий пользователь - отправитель запроса
      if (requestData.user_id !== user.id) {
        throw new Error('Нет прав на отмену этого запроса');
      }
  
      // Удаляем запрос
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId);
  
      if (error) {
        throw error;
      }
  
      return { success: true };
    } catch (error) {
      console.error('Error canceling friend request:', error);
      return { error };
    }
  }
  
  async function removeFriend(friendId) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      // Удаляем отношение дружбы в обоих направлениях
      const { error: error1 } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', friendId);
  
      const { error: error2 } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', friendId)
        .eq('friend_id', user.id);
  
      if (error1 || error2) {
        throw error1 || error2;
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
  
      // Проверяем, является ли этот пользователь другом с подтвержденным статусом
      const { data: friendshipData, error: friendshipError } = await supabase
        .from('friendships')
        .select('*')
        .eq('user_id', user.id)
        .eq('friend_id', friendId)
        .eq('status', 'accepted')
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
  
      // Получаем информацию о подарке и его владельце
      const { data: giftData, error: giftError } = await supabase
        .from('gifts')
        .select('user_id')
        .eq('id', giftId)
        .single();
  
      if (giftError) {
        throw giftError;
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
  
      // Создаем уведомление для владельца подарка
      await createNotification({
        recipient_id: giftData.user_id,
        type: 'gift_booked',
        content: `Пользователь ${user.username} забронировал один из ваших подарков`,
        sender_id: user.id
      });
  
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