export const BUBBLE_EMOJIS = ['❤️','🐾','⭐','🎵','😊','💤','🍖','🎾','✨','🥰','💕','🌟']

export const DECAY_CONFIG = {
	energyDecaySecsPerPoint: 120,
	moodDecaySecsPerPoint: 120,
	decayCheckSec: 30,
	syncToServerSec: 60,
}

export const IS_DEBUG = import.meta.env.DEV

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
	return Math.min(2, Math.pow(1.25, Math.min(stage, 4) - 1))
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
	const w = Math.round(120 * s)
	return `<img src="${getPetImgSrc(type)}" style="max-width:${w}px; height:auto; object-fit:contain; image-rendering:auto;" />`
}

export function getEggImgHTML(size: number = 70): string {
	return `<img src="${getEggImgSrc()}" style="width:${size}px; height:auto; object-fit:contain; image-rendering:auto;" />`
}
