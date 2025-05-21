// Основное приложение Vue.js
const app = Vue.createApp({
    data() {
      return {
        // Авторизация
        user: null,
        authMode: 'login',
        email: '',
        password: '',
        username: '',
        authError: null,
        authSuccess: null,
  
        // Основной интерфейс
        currentTab: 'recommendations',
        navCollapsed: false,
        notification: {
          show: false,
          message: '',
          type: 'success'
        },
        
        // Профиль
        profile: {},
        showChangeAvatarModal: false,
        avatarFile: null,
        avatarPreview: null,
        newAvatarUrl: '',
        showEditProfileModal: false,
        editedProfile: { username: '' },
        myGifts: [],
        showAddGiftModal: false,
        giftImageFile: null,
        giftImagePreview: null,
        newGift: {
          title: '',
          description: '',
          image_url: '',
          link: '',
          article_number: '',
          additional_info: ''
        },
        editingGift: false,
        editingGiftId: null,
        savingGift: false,
  
        // Рекомендации (TikTok-style)
        recommendations: [],
        totalRecommendations: 0,
        hasMoreRecommendations: true,
        page: 0,
        loading: false,
        recommendationSearch: '',
        selectedHashtags: [],
        popularHashtags: [],
        showAddRecommendationModal: false,
        newRecommendation: {
          title: '',
          description: '',
          media_url: '',
          link: '',
          article_number: '',
          hashtags: ''
        },
        mediaFile: null,
        mediaPreview: null,
        activeRecommendation: null,
        addingRecommendation: false,
  
        // Друзья
        friends: [],
        friendRequests: [],
        sentRequests: [],
        friendSearch: '',
        showAddFriendModal: false,
        friendUsername: '',
        friendError: null,
        searching: false,
        searchResults: [],
        showFriendGiftsModal: false,
        selectedFriend: {},
        friendGifts: [],
  
        // Уведомления
        notifications: [],
        showNotificationsModal: false,
  
        // Админ-панель
        isAdmin: false,
        allUsers: [],
        adminUserSearch: '',
        allRecommendations: [],
        adminRecommendationSearch: '',
        showRecommendationDetailsModal: false,
        selectedRecommendation: null,
      };
    },
    computed: {
      // Фильтрация рекомендаций по поиску и хэштегам
      filteredRecommendations() {
        let filtered = this.recommendations;
  
        // Фильтр по поисковому запросу
        if (this.recommendationSearch) {
          const search = this.recommendationSearch.toLowerCase();
          filtered = filtered.filter(rec => 
            rec.title.toLowerCase().includes(search) || 
            rec.description.toLowerCase().includes(search)
          );
        }
  
        // Фильтр по выбранным хэштегам
        if (this.selectedHashtags.length > 0) {
          filtered = filtered.filter(rec => {
            return this.selectedHashtags.every(tag => 
              rec.hashtags && rec.hashtags.includes(tag)
            );
          });
        }
  
        return filtered;
      },
  
      // Фильтрация друзей по поиску
      filteredFriends() {
        if (!this.friendSearch) {
          return this.friends;
        }
  
        const search = this.friendSearch.toLowerCase();
        return this.friends.filter(friend => 
          friend.username.toLowerCase().includes(search) || 
          friend.email.toLowerCase().includes(search)
        );
      },
  
      // Фильтрация пользователей для админ-панели
      filteredAdminUsers() {
        if (!this.adminUserSearch) {
          return this.allUsers;
        }
  
        const search = this.adminUserSearch.toLowerCase();
        return this.allUsers.filter(user => 
          user.username.toLowerCase().includes(search) || 
          user.email.toLowerCase().includes(search)
        );
      },
  
      // Фильтрация рекомендаций для админ-панели
      filteredAdminRecommendations() {
        if (!this.adminRecommendationSearch) {
          return this.allRecommendations;
        }
  
        const search = this.adminRecommendationSearch.toLowerCase();
        return this.allRecommendations.filter(rec => 
          rec.title.toLowerCase().includes(search) || 
          rec.username.toLowerCase().includes(search)
        );
      },
    },
    methods: {
      // Общие методы
      showNotification(message, type = 'success') {
        this.notification = {
          show: true,
          message,
          type
        };
  
        // Скрываем уведомление через 5 секунд
        setTimeout(() => {
          this.hideNotification();
        }, 5000);
      },
      
      hideNotification() {
        this.notification.show = false;
      },
      
      getNotificationIcon() {
        switch(this.notification.type) {
          case 'success': return 'bi-check-circle';
          case 'error': return 'bi-exclamation-circle';
          case 'info': return 'bi-info-circle';
          case 'warning': return 'bi-exclamation-triangle';
          default: return 'bi-bell';
        }
      },
  
      formatDate(dateString) {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ru-RU', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).format(date);
      },
      
      changeTab(tab) {
        this.currentTab = tab;
        // Прокручиваем к началу страницы при изменении вкладки
        window.scrollTo(0, 0);
        
        // Сбрасываем активную рекомендацию при смене вкладки
        if (tab !== 'recommendations') {
          this.activeRecommendation = null;
        }
      },
  
      // Методы авторизации
      async login() {
        if (!this.email || !this.password) {
          this.authError = 'Пожалуйста, заполните все поля';
          return;
        }
  
        const { data, error } = await signIn(this.email, this.password);
        
        if (error) {
          this.authError = error.message || 'Ошибка входа';
          return;
        }
  
        await this.fetchUserData();
        this.resetAuthForm();
      },
  
      async register() {
        if (!this.username || !this.email || !this.password) {
          this.authError = 'Пожалуйста, заполните все поля';
          return;
        }
  
        const { data, error, emailSent } = await signUp(this.email, this.password, this.username);
        
        if (error) {
          this.authError = error.message || 'Ошибка регистрации';
          return;
        }
  
        this.authSuccess = 'Регистрация успешна! На ваш email отправлено письмо для подтверждения.';
        this.authMode = 'login';
        this.resetAuthForm();
      },
      
      async resetPassword() {
        if (!this.email) {
          this.authError = 'Пожалуйста, введите email';
          return;
        }
        
        const { error, emailSent } = await resetPassword(this.email);
        
        if (error) {
          this.authError = error.message || 'Ошибка восстановления пароля';
          return;
        }
        
        this.authSuccess = 'На ваш email отправлено письмо для восстановления пароля.';
        this.authMode = 'login';
        this.resetAuthForm();
      },
  
      async logout() {
        await signOut();
        this.user = null;
        this.resetAllData();
      },
  
      resetAuthForm() {
        this.email = '';
        this.password = '';
        this.username = '';
        this.authError = null;
        
        // Автоматически скрываем сообщение об успехе через 5 секунд
        if (this.authSuccess) {
          setTimeout(() => {
            this.authSuccess = null;
          }, 5000);
        }
      },
  
      resetAllData() {
        this.profile = {};
        this.recommendations = [];
        this.friends = [];
        this.friendRequests = [];
        this.sentRequests = [];
        this.myGifts = [];
        this.popularHashtags = [];
        this.notifications = [];
        this.currentTab = 'recommendations';
        this.isAdmin = false;
        this.allUsers = [];
        this.allRecommendations = [];
        this.page = 0;
        this.totalRecommendations = 0;
        this.hasMoreRecommendations = true;
      },
  
      // Методы для рекомендаций (TikTok-style)
      async fetchRecommendations(refresh = false) {
        if (refresh) {
          this.page = 0;
          this.recommendations = [];
          this.hasMoreRecommendations = true;
        }
        
        if (!this.hasMoreRecommendations || this.loading) return;
        
        this.loading = true;
        
        const { recommendations, totalCount, hasMore } = await getRecommendations(this.page);
        
        // Получаем информацию о лайках для каждой рекомендации
        for (const rec of recommendations) {
          const { count } = await getRecommendationLikes(rec.id);
          rec.likes = count;
          // TODO: Добавить проверку, лайкнул ли текущий пользователь
          rec.isLiked = false; // Заглушка для примера
        }
        
        this.recommendations = refresh ? recommendations : [...this.recommendations, ...recommendations];
        this.totalRecommendations = totalCount;
        this.hasMoreRecommendations = hasMore;
        this.page++;
        this.loading = false;
        
        if (refresh) {
          this.popularHashtags = await getPopularHashtags();
        }
      },
      
      handleRecommendationScroll(event) {
        const { scrollTop, scrollHeight, clientHeight } = event.target;
        
        // Когда пользователь проскроллил до 70% контента, загружаем еще
        if (scrollTop + clientHeight > scrollHeight * 0.7 && !this.loading && this.hasMoreRecommendations) {
          this.fetchRecommendations();
        }
      },
      
      isVideoUrl(url) {
        if (!url) return false;
        return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg') || 
               url.includes('video') || url.includes('mp4');
      },
      
      isVideoFile(file) {
        if (!file) return false;
        return file.type.startsWith('video/');
      },
      
      setActiveRecommendation(id) {
        this.activeRecommendation = id;
      },
      
      handleMediaUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.mediaFile = file;
        this.mediaPreview = URL.createObjectURL(file);
      },
      
      removeMedia() {
        this.mediaFile = null;
        this.mediaPreview = null;
        
        // Сбрасываем input
        const input = document.getElementById('media-upload');
        if (input) input.value = '';
      },
  
      async addRecommendation() {
        if (!this.newRecommendation.title) {
          this.showNotification('Название обязательно для заполнения', 'error');
          return;
        }
  
        this.addingRecommendation = true;
        
        const { data, error } = await addRecommendation(this.newRecommendation, this.mediaFile);
        
        this.addingRecommendation = false;
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при добавлении рекомендации', 'error');
          return;
        }
  
        this.showNotification('Рекомендация успешно добавлена');
        this.showAddRecommendationModal = false;
        this.newRecommendation = {
          title: '',
          description: '',
          media_url: '',
          link: '',
          article_number: '',
          hashtags: ''
        };
        this.mediaFile = null;
        this.mediaPreview = null;
        
        // Обновляем список рекомендаций
        this.fetchRecommendations(true);
      },
  
      async deleteRecommendation(id) {
        if (!confirm('Вы уверены, что хотите удалить эту рекомендацию?')) {
          return;
        }
  
        const { error } = await deleteRecommendation(id);
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при удалении рекомендации', 'error');
          return;
        }
  
        this.showNotification('Рекомендация успешно удалена');
        // Обновляем локальный список рекомендаций
        this.recommendations = this.recommendations.filter(rec => rec.id !== id);
        
        if (this.isAdmin) {
          this.fetchAdminRecommendations();
        }
      },
      
      async likeRecommendation(recommendation) {
        const { action, error } = await likeRecommendation(recommendation.id);
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при взаимодействии с рекомендацией', 'error');
          return;
        }
        
        if (action === 'liked') {
          recommendation.likes = (recommendation.likes || 0) + 1;
          recommendation.isLiked = true;
        } else if (action === 'unliked') {
          recommendation.likes = Math.max(0, (recommendation.likes || 0) - 1);
          recommendation.isLiked = false;
        }
      },
  
      toggleHashtag(tag) {
        const index = this.selectedHashtags.indexOf(tag);
        if (index === -1) {
          this.selectedHashtags.push(tag);
        } else {
          this.selectedHashtags.splice(index, 1);
        }
      },
  
      selectHashtag(tag) {
        if (!this.selectedHashtags.includes(tag)) {
          this.selectedHashtags.push(tag);
        }
      },
  
      // Методы для друзей
      async fetchFriends() {
        this.friends = await getFriends();
        this.friendRequests = await getFriendRequests();
        this.sentRequests = await getSentRequests();
      },
  
      async searchFriends() {
        if (!this.friendUsername || this.friendUsername.length < 3) {
          this.friendError = 'Введите не менее 3 символов для поиска';
          this.searchResults = [];
          return;
        }
  
        this.searching = true;
        this.searchResults = await searchUsers(this.friendUsername);
        this.searching = false;
        
        if (this.searchResults.length === 0) {
          this.friendError = 'Пользователи не найдены';
        } else {
          this.friendError = null;
        }
      },
  
      async sendRequest(user) {
        const { error } = await sendFriendRequest(user.id);
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при отправке запроса', 'error');
          return;
        }
  
        this.showNotification(`Запрос дружбы отправлен пользователю ${user.username}`);
        this.showAddFriendModal = false;
        this.friendUsername = '';
        this.searchResults = [];
        
        // Обновляем список отправленных запросов
        this.fetchFriends();
      },
      
      async acceptFriendRequest(requestId) {
        const { error } = await acceptFriendRequest(requestId);
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при принятии запроса', 'error');
          return;
        }
  
        this.showNotification('Запрос дружбы принят');
        
        // Обновляем списки друзей и запросов
        this.fetchFriends();
      },
      
      async rejectFriendRequest(requestId) {
        const { error } = await rejectFriendRequest(requestId);
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при отклонении запроса', 'error');
          return;
        }
  
        this.showNotification('Запрос дружбы отклонен');
        
        // Обновляем список запросов
        this.fetchFriends();
      },
      
      async cancelFriendRequest(requestId) {
        const { error } = await cancelFriendRequest(requestId);
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при отмене запроса', 'error');
          return;
        }
  
        this.showNotification('Запрос дружбы отменен');
        
        // Обновляем список отправленных запросов
        this.fetchFriends();
      },
  
      async acceptFriendRequestFromNotification(notification) {
        // Получаем ID запроса из метаданных уведомления или из другого источника
        // В этом примере предполагается, что есть какая-то связь с запросом
        const requestId = notification.data?.request_id;
        
        if (!requestId) {
          this.showNotification('Не удалось найти запрос на дружбу', 'error');
          return;
        }
        
        await this.acceptFriendRequest(requestId);
        
        // Отмечаем уведомление как прочитанное
        await this.markNotificationAsRead(notification.id);
      },
      
      async rejectFriendRequestFromNotification(notification) {
        const requestId = notification.data?.request_id;
        
        if (!requestId) {
          this.showNotification('Не удалось найти запрос на дружбу', 'error');
          return;
        }
        
        await this.rejectFriendRequest(requestId);
        
        // Отмечаем уведомление как прочитанное
        await this.markNotificationAsRead(notification.id);
      },
  
      async removeFriend(friendId) {
        if (!confirm('Вы уверены, что хотите удалить этого друга?')) {
          return;
        }
  
        const { error } = await removeFriend(friendId);
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при удалении друга', 'error');
          return;
        }
  
        this.showNotification('Друг успешно удален');
        this.fetchFriends();
      },
  
      async viewFriendGifts(friend) {
        this.selectedFriend = friend;
        this.friendGifts = await getFriendGifts(friend.id);
        this.showFriendGiftsModal = true;
      },
  
      async bookGift(giftId) {
        const { error } = await bookGift(giftId);
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при бронировании подарка', 'error');
          return;
        }
  
        this.showNotification('Подарок успешно забронирован');
        this.friendGifts = await getFriendGifts(this.selectedFriend.id);
      },
  
      async unbookGift(giftId) {
        const { error } = await unbookGift(giftId);
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при отмене бронирования', 'error');
          return;
        }
  
        this.showNotification('Бронирование отменено');
        this.friendGifts = await getFriendGifts(this.selectedFriend.id);
      },
  
      async copyGiftToMyWishlist(gift) {
        const { error } = await copyGiftToMyWishlist(gift);
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при копировании подарка', 'error');
          return;
        }
  
        this.showNotification('Подарок скопирован в ваш список желаний');
        this.fetchMyGifts();
      },
      
      // Методы для уведомлений
      async fetchNotifications() {
        this.notifications = await getMyNotifications();
      },
      
      async markNotificationAsRead(notificationId) {
        const { error } = await markNotificationAsRead(notificationId);
        
        if (error) {
          console.error('Error marking notification as read:', error);
          return;
        }
        
        // Обновляем статус уведомления локально
        const index = this.notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
          this.notifications[index].is_read = true;
        }
        
        // Обновляем информацию о пользователе, чтобы скрыть индикатор непрочитанных уведомлений
        this.fetchUserData();
      },
      
      async markAllNotificationsAsRead() {
        const { error } = await markAllNotificationsAsRead();
        
        if (error) {
          this.showNotification('Ошибка при отметке уведомлений', 'error');
          return;
        }
        
        // Обновляем статус всех уведомлений локально
        this.notifications.forEach(notification => {
          notification.is_read = true;
        });
        
        // Обновляем информацию о пользователе
        this.fetchUserData();
      },
      
      async deleteNotification(notificationId) {
        const { error } = await deleteNotification(notificationId);
        
        if (error) {
          console.error('Error deleting notification:', error);
          return;
        }
        
        // Удаляем уведомление из локального списка
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
      },
  
      // Методы для профиля
      async fetchUserData() {
        this.user = await getCurrentUser();
        
        if (this.user) {
          this.profile = {
            username: this.user.username,
            email: this.user.email,
            avatar_url: this.user.avatar_url,
            theme: this.user.theme || 'light'
          };
          
          this.isAdmin = this.user.is_admin || false;
          
          // Загружаем данные для всех вкладок
          this.fetchRecommendations(true);
          this.fetchFriends();
          this.fetchMyGifts();
          this.fetchNotifications();
          
          // Если пользователь админ, загружаем админские данные
          if (this.isAdmin) {
            this.fetchAdminData();
          }
          
          // Применяем тему
          document.body.className = this.user.theme === 'dark' ? 'dark-theme' : '';
        }
      },
  
      async fetchMyGifts() {
        this.myGifts = await getMyGifts();
      },
      
      handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.avatarFile = file;
        this.avatarPreview = URL.createObjectURL(file);
      },
      
      removeAvatarPreview() {
        this.avatarFile = null;
        this.avatarPreview = null;
        
        // Сбрасываем input
        const input = document.getElementById('avatar-upload');
        if (input) input.value = '';
      },
  
      async updateAvatar() {
        if (!this.avatarFile && !this.newAvatarUrl) {
          this.showNotification('Пожалуйста, выберите или укажите изображение', 'error');
          return;
        }
  
        let result;
        
        if (this.avatarFile) {
          result = await uploadAvatar(this.avatarFile);
        } else {
          result = await updateAvatar(this.newAvatarUrl);
        }
        
        if (result.error) {
          this.showNotification(result.error.message || 'Ошибка при обновлении аватара', 'error');
          return;
        }
  
        this.showNotification('Аватар успешно обновлен');
        this.profile.avatar_url = result.url || this.newAvatarUrl;
        this.showChangeAvatarModal = false;
        this.avatarFile = null;
        this.avatarPreview = null;
        this.newAvatarUrl = '';
        this.fetchUserData();
      },
      
      async changeTheme(theme) {
        const { error } = await setTheme(theme);
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при изменении темы', 'error');
          return;
        }
        
        this.profile.theme = theme;
        this.user.theme = theme;
        
        // Применяем тему
        document.body.className = theme === 'dark' ? 'dark-theme' : '';
        
        this.showNotification(`Тема изменена на ${theme === 'dark' ? 'темную' : 'светлую'}`);
      },
  
      async updateProfile() {
        if (!this.editedProfile.username) {
          this.showNotification('Имя пользователя не может быть пустым', 'error');
          return;
        }
  
        const { error } = await updateProfile({ username: this.editedProfile.username });
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при обновлении профиля', 'error');
          return;
        }
  
        this.showNotification('Профиль успешно обновлен');
        this.profile.username = this.editedProfile.username;
        this.showEditProfileModal = false;
        this.fetchUserData();
      },
      
      handleGiftImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.giftImageFile = file;
        this.giftImagePreview = URL.createObjectURL(file);
      },
      
      removeGiftImagePreview() {
        this.giftImageFile = null;
        this.giftImagePreview = null;
        
        // Сбрасываем input
        const input = document.getElementById('gift-image-upload');
        if (input) input.value = '';
      },
  
      editGift(gift) {
        this.newGift = { ...gift };
        this.editingGift = true;
        this.editingGiftId = gift.id;
        this.giftImagePreview = gift.image_url || null;
        this.showAddGiftModal = true;
      },
  
      cancelAddGift() {
        this.newGift = {
          title: '',
          description: '',
          image_url: '',
          link: '',
          article_number: '',
          additional_info: ''
        };
        this.editingGift = false;
        this.editingGiftId = null;
        this.giftImageFile = null;
        this.giftImagePreview = null;
        this.showAddGiftModal = false;
      },
  
      async saveGift() {
        if (!this.newGift.title) {
          this.showNotification('Название подарка обязательно для заполнения', 'error');
          return;
        }
        
        this.savingGift = true;
        
        // Если есть новое изображение, сначала загружаем его
        if (this.giftImageFile) {
          const { url, error: uploadError } = await uploadGiftImage(this.giftImageFile);
          
          if (uploadError) {
            this.savingGift = false;
            this.showNotification(uploadError.message || 'Ошибка при загрузке изображения', 'error');
            return;
          }
          
          this.newGift.image_url = url;
        }
  
        let result;
        
        if (this.editingGift) {
          result = await updateGift(this.editingGiftId, this.newGift);
        } else {
          result = await addGift(this.newGift);
        }
        
        this.savingGift = false;
        
        if (result.error) {
          this.showNotification(result.error.message || 'Ошибка при сохранении подарка', 'error');
          return;
        }
  
        this.showNotification(this.editingGift ? 'Подарок успешно обновлен' : 'Подарок успешно добавлен');
        this.cancelAddGift();
        this.fetchMyGifts();
      },
  
      async deleteGift(giftId) {
        if (!confirm('Вы уверены, что хотите удалить этот подарок?')) {
          return;
        }
  
        const { error } = await deleteGift(giftId);
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при удалении подарка', 'error');
          return;
        }
  
        this.showNotification('Подарок успешно удален');
        this.fetchMyGifts();
      },
  
      // Методы для админ-панели
      async fetchAdminData() {
        if (!this.isAdmin) {
          return;
        }
        
        this.fetchAdminUsers();
        this.fetchAdminRecommendations();
      },
  
      async fetchAdminUsers() {
        this.allUsers = await getAllUsers();
      },
  
      async fetchAdminRecommendations() {
        this.allRecommendations = await getAllRecommendationsWithUserDetails();
      },
  
      async toggleAdminStatus(user) {
        const newStatus = !user.is_admin;
        const { error } = await toggleAdminStatus(user.id, newStatus);
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при изменении статуса администратора', 'error');
          return;
        }
  
        this.showNotification(`Пользователь ${user.username} ${newStatus ? 'теперь администратор' : 'больше не администратор'}`);
        this.fetchAdminUsers();
      },
  
      async deleteUser(userId) {
        if (!confirm('Вы уверены, что хотите удалить этого пользователя? Это действие необратимо!')) {
          return;
        }
  
        const { error } = await deleteUser(userId);
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при удалении пользователя', 'error');
          return;
        }
  
        this.showNotification('Пользователь успешно удален');
        this.fetchAdminUsers();
      },
  
      viewRecommendationDetails(recommendation) {
        this.selectedRecommendation = recommendation;
        this.showRecommendationDetailsModal = true;
      },
    },
    async mounted() {
      await this.fetchUserData();
      
      // Слушаем изменения поля поиска для друзей
      this.$watch('friendUsername', (newValue) => {
        if (newValue && newValue.length >= 3) {
          this.searchFriends();
        } else {
          this.searchResults = [];
        }
      });
      
      // Вешаем слушатель на изменение размера окна для адаптивности
      window.addEventListener('resize', this.handleResize);
      
      // Проверяем размер окна при загрузке
      this.handleResize();
      
      // Прокрутка рекомендаций для мобильных устройств
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        this.navCollapsed = true;
      }
    },
    beforeUnmount() {
      // Удаляем слушатель при уничтожении компонента
      window.removeEventListener('resize', this.handleResize);
    },
    methods: {
      // Добавляем этот метод для адаптивности интерфейса
      handleResize() {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
          this.navCollapsed = true;
        }
      }
    }
  });
  
  // Запускаем приложение
  app.mount('#app');