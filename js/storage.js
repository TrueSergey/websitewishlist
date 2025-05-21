// Функции для работы с хранилищем файлов
async function uploadFile(file, bucket = 'media', folder = '') {
    try {
      if (!file) {
        throw new Error('Файл не выбран');
      }
  
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
  
      // Создаем уникальное имя файла, чтобы избежать конфликтов
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${user.id}_${Date.now()}.${fileExt}`;
  
      // Загружаем файл
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);
  
      if (error) {
        throw error;
      }
  
      // Получаем публичную ссылку на файл
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);
  
      return { url: urlData.publicUrl };
    } catch (error) {
      console.error('Error uploading file:', error);
      return { error };
    }
  }
  
  async function deleteFile(url, bucket = 'media') {
    try {
      // Извлекаем путь к файлу из URL
      const path = url.split(`${bucket}/`)[1];
      
      if (!path) {
        throw new Error('Неверный формат URL');
      }
  
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);
  
      if (error) {
        throw error;
      }
  
      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      return { error };
    }
  }