export interface GameItemConfig {
	key: string
	label: string
	type: number
	gameId: number
	apiList: string
	apiImport: string
	itemType: 'food' | 'toy'
	effectField: 'energy_add' | 'mood_add'
	effectLabel: string
	icon: string
}

export const GAME_ITEM_CONFIGS: GameItemConfig[] = [
	{
		key: 'pet_food',
		label: '宠物食品',
		type: 3,
		gameId: 1, // 宠物游戏
		apiList: '/stu/gamePet/getFoodList',
		apiImport: '/stu/gamePet/importFoodToReward',
		itemType: 'food',
		effectField: 'energy_add',
		effectLabel: '能量',
		icon: '🍖',
	},
	{
		key: 'pet_toy',
		label: '宠物玩具',
		type: 4,
		gameId: 1, // 宠物游戏
		apiList: '/stu/gamePet/getToyList',
		apiImport: '/stu/gamePet/importToyToReward',
		itemType: 'toy',
		effectField: 'mood_add',
		effectLabel: '心情',
		icon: '🎾',
	},
]

export function getGameItemConfig(key: string): GameItemConfig | undefined {
	return GAME_ITEM_CONFIGS.find(c => c.key === key)
}

export function isGameRewardType(type: number): boolean {
	return GAME_ITEM_CONFIGS.some(c => c.type === type)
}

export function getGameConfigByType(type: number): GameItemConfig | undefined {
	return GAME_ITEM_CONFIGS.find(c => c.type === type)
}
