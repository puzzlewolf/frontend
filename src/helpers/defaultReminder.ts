const DEFAULT_REMINDER_KEY = 'defaultReminder'

interface DefaultReminderSettings {
	enabled: boolean,
	amount: number,
}

interface SavedReminderSettings {
	enabled: boolean,
	amount?: number,
	type?: 'minutes' | 'hours' | 'days' | 'months',
}

function calculateDefaultReminderSeconds(type: string, amount: number): number {
	switch (type) {
		case 'minutes':
			return amount * 60
		case 'hours':
			return amount * 60 * 60
		case 'days':
			return amount * 60 * 60 * 24
		case 'months':
			return amount * 60 * 60 * 24 * 30
	}

	return 0
}

export function saveDefaultReminder(enabled: boolean, type: string, amount: number) {
	const defaultReminderSeconds = calculateDefaultReminderSeconds(type, amount)
	localStorage.setItem(DEFAULT_REMINDER_KEY, JSON.stringify(<DefaultReminderSettings>{
		enabled,
		amount: defaultReminderSeconds,
	}))
}

export function getDefaultReminderAmount(): number | null {
	const settings = getDefaultReminderSettings()

	return settings?.enabled
		? settings.amount
		: null
}

export function getDefaultReminderSettings(): DefaultReminderSettings | null {
	const s: string | null = window.localStorage.getItem(DEFAULT_REMINDER_KEY)
	if (s === null) {
		return null
	}

	return JSON.parse(s)
}

export function parseSavedReminderAmount(amountSeconds: number): SavedReminderSettings {
	const amountMinutes = amountSeconds / 60
	const settings: SavedReminderSettings = {
		enabled: true, // We're assuming the caller to have checked this properly
		amount: amountMinutes,
		type: 'minutes',
	}

	if ((amountMinutes / 60 / 24) % 30 === 0) {
		settings.amount = amountMinutes / 60 / 24 / 30
		settings.type = 'months'
	} else if ((amountMinutes / 60) % 24 === 0) {
		settings.amount = amountMinutes / 60 / 24
		settings.type = 'days'
	} else if (amountMinutes % 60 === 0) {
		settings.amount = amountMinutes / 60
		settings.type = 'hours'
	}

	return settings
}

export function getSavedReminderSettings(): SavedReminderSettings | null {
	const s = getDefaultReminderSettings()
	if (s === null) {
		return null
	}

	if (!s.enabled) {
		return {
			enabled: false,
		}
	}
	
	return parseSavedReminderAmount(s.amount)
}
