export interface GameItemConfig {
	key: string
	label: string
	itemCategory: number
	gameId: number
	apiList: string
	apiImport: string
	itemType: 'food' | 'toy' | 'fertilizer'
	effectField: 'energy_add' | 'mood_add' | 'exp_add'
	effectLabel: string
	icon: string
}

export const GAME_ITEM_CONFIGS: GameItemConfig[] = [
	{
		key: 'pet_food',
		label: '宠物食品',
		itemCategory: 3,
		gameId: 1,
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
		itemCategory: 4,
		gameId: 1,
		apiList: '/stu/gamePet/getToyList',
		apiImport: '/stu/gamePet/importToyToReward',
		itemType: 'toy',
		effectField: 'mood_add',
		effectLabel: '心情',
		icon: '🎾',
	},
	{
		key: 'tree_fertilizer',
		label: '种树肥料',
		itemCategory: 5,
		gameId: 2,
		apiList: '/stu/treeGame/getFertilizerList',
		apiImport: '',
		itemType: 'fertilizer',
		effectField: 'exp_add',
		effectLabel: '经验',
		icon: '🌱',
	},
]

export function getGameItemConfig(key: string): GameItemConfig | undefined {
	return GAME_ITEM_CONFIGS.find(c => c.key === key)
}

export function isGameRewardType(itemCategory: number): boolean {
	return GAME_ITEM_CONFIGS.some(c => c.itemCategory === itemCategory)
}

export function getGameConfigByType(itemCategory: number, gameId?: number): GameItemConfig | undefined {
	if (gameId !== undefined) {
		return GAME_ITEM_CONFIGS.find(c => c.itemCategory === itemCategory && c.gameId === gameId)
	}
	return GAME_ITEM_CONFIGS.find(c => c.itemCategory === itemCategory)
}

export function getGameConfigByItemType(itemType: string, gameId?: number): GameItemConfig | undefined {
	if (gameId !== undefined) {
		return GAME_ITEM_CONFIGS.find(c => c.itemType === itemType && c.gameId === gameId)
	}
	return GAME_ITEM_CONFIGS.find(c => c.itemType === itemType)
}

export function getGameConfigByKey(key: string): GameItemConfig | undefined {
	return GAME_ITEM_CONFIGS.find(c => c.key === key)
}
