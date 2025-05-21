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
  
        // Основной интерфейс
        currentTab: 'recommendations',
        notification: {
          show: false,
          message: '',
          type: 'success'
        },
        // Для TikTok-режима
    showTikTokView: false,
    activeVideoIndex: null,
    isVideoPlaying: false,
    intersectionObserver: null,

        // Для загрузки файлов
    selectedAvatarFile: null,
    avatarPreview: null,
    selectedRecommendationFile: null,
    recommendationPreview: null,
    selectedGiftImageFile: null,
    giftImagePreview: null,

        // Профиль
        profile: {},
        showChangeAvatarModal: false,
        newAvatarUrl: '',
        showEditProfileModal: false,
        editedProfile: { username: '' },
        myGifts: [],
        showAddGiftModal: false,
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
  
        // Рекомендации
        recommendations: [],
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
  
        // Друзья
        friendsSubTab: 'all',
        friendRequests: [],
        friends: [],
        friendSearch: '',
        showAddFriendModal: false,
        friendUsername: '',
        friendError: null,
        searchResults: [],
        showFriendGiftsModal: false,
        selectedFriend: {},
        friendGifts: [],
  
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
      
      // Методы для работы с файлами
handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  this.selectedAvatarFile = file;
  this.avatarPreview = URL.createObjectURL(file);
},
playVideoIfVisible(index) {
  if (this.activeVideoIndex === index) {
    const video = this.$refs[`video-${index}`][0];
    if (video) {
      video.play();
      this.isVideoPlaying = true;
    }
  }
},

toggleVideoPlayback(index) {
  const video = this.$refs[`video-${index}`][0];
  if (!video) return;
  
  if (video.paused) {
    video.play();
    this.isVideoPlaying = true;
  } else {
    video.pause();
    this.isVideoPlaying = false;
  }
},

openLink(link) {
  window.open(link, '_blank');
},

setupTikTokScroll() {
  // Настраиваем IntersectionObserver для отслеживания видимости видео
  if ('IntersectionObserver' in window) {
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // Находим индекс видео из id элемента
        const id = entry.target.id;
        const index = parseInt(id.split('-')[1]);
        
        if (entry.isIntersecting) {
          this.activeVideoIndex = index;
          this.playVideoIfVisible(index);
        } else {
          // Если видео больше не видно, останавливаем его
          const video = this.$refs[`video-${index}`][0];
          if (video) {
            video.pause();
          }
        }
      });
    }, { threshold: 0.7 }); // Видео считается видимым, если 70% его в области просмотра
  }
},

// Обновите метод mounted
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
  
  // Наблюдаем за изменением showTikTokView
  this.$watch('showTikTokView', (newValue) => {
    if (newValue) {
      // Если открыли TikTok-режим, настраиваем прокрутку
      this.$nextTick(() => {
        this.setupTikTokScroll();
        
        // Добавляем все видео в наблюдение
        this.filteredRecommendations.forEach((_, index) => {
          const videoContainer = document.getElementById(`video-container-${index}`);
          if (videoContainer && this.intersectionObserver) {
            this.intersectionObserver.observe(videoContainer);
          }
        });
        
        // Запускаем первое видимое видео
        this.activeVideoIndex = 0;
        this.playVideoIfVisible(0);
      });
    } else {
      // Если закрыли TikTok-режим, останавливаем все видео
      this.filteredRecommendations.forEach((_, index) => {
        const video = this.$refs[`video-${index}`]?.[0];
        if (video) {
          video.pause();
        }
        
        // Удаляем наблюдение
        const videoContainer = document.getElementById(`video-container-${index}`);
        if (videoContainer && this.intersectionObserver) {
          this.intersectionObserver.unobserve(videoContainer);
        }
      });
      
      // Очищаем наблюдатель
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect();
      }
    }
  });
},
async updateAvatar() {
  if (!this.selectedAvatarFile) {
    this.showNotification('Выберите изображение', 'error');
    return;
  }

  const { url, error } = await uploadFile(this.selectedAvatarFile, 'avatars');
  
  if (error) {
    this.showNotification(error.message || 'Ошибка при загрузке аватара', 'error');
    return;
  }

  const updateResult = await updateAvatar(url);
  
  if (updateResult.error) {
    this.showNotification(updateResult.error.message || 'Ошибка при обновлении аватара', 'error');
    return;
  }

  this.showNotification('Аватар успешно обновлен');
  this.profile.avatar_url = url;
  this.showChangeAvatarModal = false;
  this.selectedAvatarFile = null;
  this.avatarPreview = null;
  this.fetchUserData();
},

handleRecommendationMediaUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  this.selectedRecommendationFile = file;
  this.recommendationPreview = URL.createObjectURL(file);
},

isImageFile(file) {
  return file && file.type.startsWith('image/');
},

isVideoFile(file) {
  return file && file.type.startsWith('video/');
},

setupLazyLoading() {
  if ('IntersectionObserver' in window) {
    const lazyImageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const lazyImage = entry.target;
          lazyImage.src = lazyImage.dataset.src;
          lazyImage.classList.add('loaded');
          lazyImageObserver.unobserve(lazyImage);
        }
      });
    });

    const lazyImages = document.querySelectorAll('.lazy-image');
    lazyImages.forEach(image => {
      lazyImageObserver.observe(image);
    });
  } else {
    // Запасной вариант для браузеров без IntersectionObserver
    document.querySelectorAll('.lazy-image').forEach(img => {
      img.src = img.dataset.src;
      img.classList.add('loaded');
    });
  }
},

async addRecommendation() {
  if (!this.newRecommendation.title) {
    this.showNotification('Название обязательно для заполнения', 'error');
    return;
  }

  let mediaUrl = '';
  
  if (this.selectedRecommendationFile) {
    const bucket = this.isVideoFile(this.selectedRecommendationFile) ? 'videos' : 'images';
    const { url, error: uploadError } = await uploadFile(this.selectedRecommendationFile, bucket, 'recommendations');
    
    if (uploadError) {
      this.showNotification(uploadError.message || 'Ошибка при загрузке медиафайла', 'error');
      return;
    }
    
    mediaUrl = url;
  }

  const recommendation = {
    ...this.newRecommendation,
    media_url: mediaUrl
  };

  const { data, error } = await addRecommendation(recommendation);
  
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
  this.selectedRecommendationFile = null;
  this.recommendationPreview = null;
  this.fetchRecommendations();
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
  
        // Скрываем уведомление через 3 секунды
        setTimeout(() => {
          this.notification.show = false;
        }, 3000);
      },
  
      formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
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
      
        const { data, error, message } = await signUp(this.email, this.password, this.username);
        
        if (error) {
          this.authError = error.message || 'Ошибка регистрации';
          return;
        }
      
        this.showNotification(message || 'Регистрация успешна! Теперь вы можете войти в систему.');
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
      },
  
      resetAllData() {
        this.profile = {};
        this.recommendations = [];
        this.friends = [];
        this.myGifts = [];
        this.popularHashtags = [];
        this.currentTab = 'recommendations';
        this.isAdmin = false;
        this.allUsers = [];
        this.allRecommendations = [];
      },
  
      // Методы для рекомендаций
      async fetchRecommendations() {
        this.recommendations = await getRecommendations();
        this.popularHashtags = await getPopularHashtags();
      },
  
      async addRecommendation() {
        if (!this.newRecommendation.title) {
          this.showNotification('Название обязательно для заполнения', 'error');
          return;
        }
  
        const { data, error } = await addRecommendation(this.newRecommendation);
        
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
        this.fetchRecommendations();
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
        this.fetchRecommendations();
        if (this.isAdmin) {
          this.fetchAdminRecommendations();
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
      
      async fetchFriendRequests() {
        this.friendRequests = await getFriendRequests();
      },
      
      async acceptFriendRequest(friendId) {
        const { error } = await acceptFriendRequest(friendId);
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при принятии запроса', 'error');
          return;
        }
      
        this.showNotification('Запрос на дружбу принят');
        this.fetchFriendRequests();
        this.fetchFriends();
      },
      
      async rejectFriendRequest(friendId) {
        const { error } = await rejectFriendRequest(friendId);
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при отклонении запроса', 'error');
          return;
        }
      
        this.showNotification('Запрос на дружбу отклонен');
        this.fetchFriendRequests();
      },
      
      // Обновите существующий метод fetchFriends
      async fetchFriends() {
        this.friends = await getFriends();
        this.fetchFriendRequests();
      },

      // Методы для друзей
      async fetchFriends() {
        this.friends = await getFriends();
      },
  
      async searchFriends() {
        if (!this.friendUsername || this.friendUsername.length < 3) {
          this.friendError = 'Введите не менее 3 символов для поиска';
          this.searchResults = [];
          return;
        }
  
        this.searchResults = await searchUsers(this.friendUsername);
        
        if (this.searchResults.length === 0) {
          this.friendError = 'Пользователи не найдены';
        } else {
          this.friendError = null;
        }
      },
  
      async addFriend() {
        await this.searchFriends();
      },
  
      async selectFriend(friend) {
        const { error } = await addFriend(friend.id);
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при добавлении друга', 'error');
          return;
        }
  
        this.showNotification(`${friend.username} успешно добавлен в друзья`);
        this.showAddFriendModal = false;
        this.friendUsername = '';
        this.searchResults = [];
        this.friendError = null;
        this.fetchFriends();
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
  
      // Методы для профиля
      async fetchUserData() {
        this.user = await getCurrentUser();
        
        if (this.user) {
          this.profile = {
            username: this.user.username,
            email: this.user.email,
            avatar_url: this.user.avatar_url
          };
          
          this.isAdmin = this.user.is_admin || false;
          
          // Загружаем данные для всех вкладок
          this.fetchRecommendations();
          this.fetchFriends();
          this.fetchMyGifts();
          
          // Если пользователь админ, загружаем админские данные
          if (this.isAdmin) {
            this.fetchAdminData();
          }
        }
      },
  
      async fetchMyGifts() {
        this.myGifts = await getMyGifts();
      },
  
      async updateAvatar() {
        if (!this.newAvatarUrl) {
          this.showNotification('Укажите URL изображения', 'error');
          return;
        }
  
        const { error } = await updateAvatar(this.newAvatarUrl);
        
        if (error) {
          this.showNotification(error.message || 'Ошибка при обновлении аватара', 'error');
          return;
        }
  
        this.showNotification('Аватар успешно обновлен');
        this.profile.avatar_url = this.newAvatarUrl;
        this.showChangeAvatarModal = false;
        this.newAvatarUrl = '';
        this.fetchUserData();
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
  
      editGift(gift) {
        this.newGift = { ...gift };
        this.editingGift = true;
        this.editingGiftId = gift.id;
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
        this.showAddGiftModal = false;
      },
  
      async saveGift() {
        if (!this.newGift.title) {
          this.showNotification('Название подарка обязательно для заполнения', 'error');
          return;
        }
  
        let result;
        
        if (this.editingGift) {
          result = await updateGift(this.editingGiftId, this.newGift);
        } else {
          result = await addGift(this.newGift);
        }
        
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
    }
  });
  
  // Запускаем приложение
  app.mount('#app');