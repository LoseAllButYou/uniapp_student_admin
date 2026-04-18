export interface Sprite {
	groupId: number
	groupName: string
	hasPet: boolean
	petId?: number
	petType?: string
	petName?: string
	lifeStage?: number
	energy: number
	mood: number
	growthFeedCount?: number
	lastFeedAt?: number
	lastInteractAt?: number
	x: number
	y: number
	targetX: number
	targetY: number
	direction: 'left' | 'right'
	state: 'idle' | 'walking'
	bubble: string | null
	bubbleTimer: number | null
	moveTimer: number
	idleDuration: number
	idleTarget: number
}

export interface BagItem {
	id: number
	item_code: string
	item_name: string
	quantity: number
	energy_add?: number
	mood_add?: number
}
