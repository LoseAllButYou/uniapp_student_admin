export const BUBBLE_EMOJIS = ['❤️','🐾','⭐','🎵','😊','💤','🍖','🎾','✨','🥰','💕','🌟']

export const DECAY_CONFIG = {
	energyDecayPerSec: 0.5,
	moodDecayPerSec: 0.5,
	decayCheckSec: 5,
	syncToServerSec: 30,
}

export const PET_TYPES = [
	{ code: 'pig', name: '小猪' },
	{ code: 'dog', name: '小狗' },
	{ code: 'chicken', name: '小鸡' },
	{ code: 'duck', name: '小鸭' },
	{ code: 'sheep', name: '小羊' },
	{ code: 'cat', name: '小猫' },
	{ code: 'rabbit', name: '小兔' },
	{ code: 'cow', name: '小牛' },
	{ code: 'horse', name: '小马' },
	{ code: 'panda', name: '熊猫' },
]

export const DEFAULT_PET_NAMES: Record<string, string> = {
	pig: '小猪猪', dog: '旺财', chicken: '小叽叽',
	duck: '嘎嘎', sheep: '绵绵', cat: '咪咪',
	rabbit: '跳跳', cow: '哞哞', horse: '小马驹', panda: '圆圆'
}

export function getProgressColor(v: number): string {
	if (v >= 75) return '#67c23a'
	if (v >= 50) return '#409eff'
	if (v >= 25) return '#e6a23c'
	return '#f56c6c'
}

export function getStageScale(stage: number): number {
	return [0.8, 1, 1.2, 1.4][Math.min(stage, 4) - 1] || 1
}

const PET_SVG_BASE = '/web/static/game/pet'

export function getPetImgSrc(type: string): string {
	return `${PET_SVG_BASE}/${type}.svg`
}

export function getEggImgSrc(): string {
	return `${PET_SVG_BASE}/egg.svg`
}

export function getPetImgHTML(type: string, stage: number): string {
	const s = getStageScale(stage)
	const w = 160 * s
	return `<img src="${getPetImgSrc(type)}" width="${w}" height="${w}" style="image-rendering:auto;" />`
}

export function getEggImgHTML(size: number = 70): string {
	return `<img src="${getEggImgSrc()}" width="${size}" height="${Math.round(size * 1.37)}" style="image-rendering:auto;" />`
}
