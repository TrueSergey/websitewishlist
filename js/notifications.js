// Функции для работы с уведомлениями
async function createNotification(notification) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([
          {
            recipient_id: notification.recipient_id,
            sender_id: notification.sender_id,
            type: notification.type,
            content: notification.content,
            is_read: false,
          },
        ]);
  
      if (error) {
        throw error;
      }
  
      return { data };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { error };
    }
  }
  
  async function getMyNotifications() {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          users!notifications_sender_id_fkey (username, avatar_url)
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });
  
      if (error) {
        throw error;
      }
  
      // Форматируем полученные данные
      return data.map(notification => ({
        ...notification,
        sender_username: notification.users?.username || 'Система',
        sender_avatar: notification.users?.avatar_url || null,
      }));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }
  
  async function markNotificationAsRead(notificationId) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('recipient_id', user.id);
  
      if (error) {
        throw error;
      }
  
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { error };
    }
  }
  
  async function markAllNotificationsAsRead() {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);
  
      if (error) {
        throw error;
      }
  
      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { error };
    }
  }
  
  async function deleteNotification(notificationId) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('recipient_id', user.id);
  
      if (error) {
        throw error;
      }
  
      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { error };
    }
  }