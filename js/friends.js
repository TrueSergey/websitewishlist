async function addFriend(friendId) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Пользователь не авторизован');
    }

    // Проверяем, не существует ли уже запрос на дружбу
    const { data: existingRequest, error: checkError } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // код PGRST116 означает, что записи не найдены
      throw checkError;
    }

    if (existingRequest) {
      throw new Error('Запрос на дружбу уже существует или вы уже являетесь друзьями');
    }

    // Создаем запрос на дружбу
    const { data, error } = await supabase
      .from('friendships')
      .insert([
        {
          user_id: user.id,
          friend_id: friendId,
          status: 'FALSE'
        },
      ]);

    if (error) {
      throw error;
    }

    // Добавляем уведомление для пользователя
    await supabase
      .from('notifications')
      .insert([
        {
          user_id: friendId,
          type: 'friend_request',
          from_user_id: user.id,
          is_read: false
        },
      ]);

    return { data, message: 'Запрос на дружбу отправлен' };
  } catch (error) {
    console.error('Error adding friend:', error);
    return { error };
  }
}

async function getFriends() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Пользователь не авторизован');
    }

    // Получаем принятые запросы дружбы, где текущий пользователь - инициатор
    const { data: sentRequests, error: sentError } = await supabase
      .from('friendships')
      .select(`
        friend_id,
        status,
        users!friendships_friend_id_fkey (id, username, email, avatar_url)
      `)
      .eq('user_id', user.id);

    if (sentError) {
      throw sentError;
    }

    // Получаем принятые запросы дружбы, где текущий пользователь - получатель
    const { data: receivedRequests, error: receivedError } = await supabase
      .from('friendships')
      .select(`
        user_id,
        status,
        users!friendships_user_id_fkey (id, username, email, avatar_url)
      `)
      .eq('friend_id', user.id);

    if (receivedError) {
      throw receivedError;
    }

    // Объединяем и форматируем данные
    const friends = [
      ...sentRequests.map(friendship => ({
        ...friendship.users,
        status: friendship.status,
        direction: 'outgoing'
      })),
      ...receivedRequests.map(friendship => ({
        ...friendship.users,
        status: friendship.status,
        direction: 'incoming'
      }))
    ];

    return friends;
  } catch (error) {
    console.error('Error fetching friends:', error);
    return [];
  }
}

async function acceptFriendRequest(friendId) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Пользователь не авторизован');
    }

    // Обновляем запрос на дружбу
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('user_id', friendId)
      .eq('friend_id', user.id);

    if (error) {
      throw error;
    }

    // Добавляем уведомление о принятии запроса
    await supabase
      .from('notifications')
      .insert([
        {
          user_id: friendId,
          type: 'friend_request_accepted',
          from_user_id: user.id,
          is_read: false
        },
      ]);

    return { success: true };
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return { error };
  }
}

async function rejectFriendRequest(friendId) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Пользователь не авторизован');
    }

    // Удаляем запрос на дружбу
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('user_id', friendId)
      .eq('friend_id', user.id);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    return { error };
  }
}

async function getFriendRequests() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Пользователь не авторизован');
    }

    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        users!friendships_user_id_fkey (id, username, email, avatar_url)
      `)
      .eq('friend_id', user.id)
      .eq('status', 'FALSE');

    if (error) {
      throw error;
    }

    return data.map(request => ({
      id: request.id,
      user: request.users
    }));
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    return [];
  }
}

// Обновляем getFriendGifts, чтобы проверять статус дружбы
async function getFriendGifts(friendId) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Пользователь не авторизован');
    }

    // Проверяем, что это друг и статус дружбы accepted
    const { data: friendship, error: friendshipError } = await supabase
      .from('friendships')
      .select('status')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId},status.eq.accepted),and(user_id.eq.${friendId},friend_id.eq.${user.id},status.eq.accepted)`)
      .single();

    if (friendshipError || !friendship) {
      throw new Error('Этот пользователь не является вашим другом или запрос не подтвержден');
    }

    // Получаем подарки
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