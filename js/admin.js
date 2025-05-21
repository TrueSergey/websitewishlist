// Функции для административной панели
async function getAllUsers() {
	try {
		const user = await getCurrentUser()
		if (!user || !user.is_admin) {
			throw new Error('Нет прав администратора')
		}
		const { data, error } = await supabase
			.from('users')
			.select('*')
			.order('created_at', { ascending: false })

		if (error) {
			throw error
		}

		return data
	} catch (error) {
		console.error('Error fetching all users:', error)
		return []
	}
}

async function toggleAdminStatus(userId, isAdmin) {
	try {
		const user = await getCurrentUser()
		if (!user || !user.is_admin) {
			throw new Error('Нет прав администратора')
		}

		// Нельзя снять админские права у самого себя
		if (userId === user.id && !isAdmin) {
			throw new Error('Нельзя снять права администратора у самого себя')
		}

		const { data, error } = await supabase
			.from('users')
			.update({ is_admin: isAdmin })
			.eq('id', userId)

		if (error) {
			throw error
		}

		return { data }
	} catch (error) {
		console.error('Error toggling admin status:', error)
		return { error }
	}
}

async function deleteUser(userId) {
	try {
		const user = await getCurrentUser()
		if (!user || !user.is_admin) {
			throw new Error('Нет прав администратора')
		}

		// Нельзя удалить самого себя
		if (userId === user.id) {
			throw new Error('Нельзя удалить собственный аккаунт')
		}

		// Удаляем всю связанную с пользователем информацию
		// (каскадное удаление настроено на уровне базы данных)
		const { error } = await supabase.from('users').delete().eq('id', userId)

		if (error) {
			throw error
		}

		return { success: true }
	} catch (error) {
		console.error('Error deleting user:', error)
		return { error }
	}
}

async function getAllRecommendationsWithUserDetails() {
	try {
		const user = await getCurrentUser()
		if (!user || !user.is_admin) {
			throw new Error('Нет прав администратора')
		}

		const { data, error } = await supabase
			.from('recommendations')
			.select(
				`
          *,
          users (id, username, email, avatar_url)
        `
			)
			.order('created_at', { ascending: false })

		if (error) {
			throw error
		}

		// Форматируем полученные данные
		return data.map(rec => ({
			...rec,
			username: rec.users.username,
			user_email: rec.users.email,
			avatar_url: rec.users.avatar_url,
		}))
	} catch (error) {
		console.error('Error fetching all recommendations:', error)
		return []
	}
}
