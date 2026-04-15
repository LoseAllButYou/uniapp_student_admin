import { Ref } from 'vue'
import { Sprite } from './types'

const MOVE_RANGE_X_MIN = 5
const MOVE_RANGE_X_MAX = 90
const MOVE_RANGE_Y_MIN = 35
const MOVE_RANGE_Y_MAX = 70
const COLLISION_MIN_DIST = 10
const IDLE_FRAMES_MIN = 40
const IDLE_FRAMES_MAX = 80

const generateUniformPositions = (count: number) => {
	if (count === 0) return []
	const positions: { x: number; y: number }[] = []
	const rangeW = MOVE_RANGE_X_MAX - MOVE_RANGE_X_MIN
	const rangeH = MOVE_RANGE_Y_MAX - MOVE_RANGE_Y_MIN
	const cols = Math.ceil(Math.sqrt(count * rangeW / rangeH))
	const rows = Math.ceil(count / cols)
	const cellW = rangeW / cols
	const cellH = rangeH / rows
	for (let i = 0; i < count; i++) {
		const col = i % cols
		const row = Math.floor(i / cols)
		const cx = MOVE_RANGE_X_MIN + cellW * (col + 0.5)
		const cy = MOVE_RANGE_Y_MIN + cellH * (row + 0.5)
		const jitterX = (Math.random() - 0.5) * cellW * 0.6
		const jitterY = (Math.random() - 0.5) * cellH * 0.6
		positions.push({
			x: Math.max(MOVE_RANGE_X_MIN, Math.min(MOVE_RANGE_X_MAX, cx + jitterX)),
			y: Math.max(MOVE_RANGE_Y_MIN, Math.min(MOVE_RANGE_Y_MAX, cy + jitterY))
		})
	}
	return positions
}

const pickRandomEdgeTarget = (sp: Sprite) => {
	const side = Math.floor(Math.random() * 4)
	switch (side) {
		case 0: sp.targetX = MOVE_RANGE_X_MIN + Math.random() * 5; sp.targetY = MOVE_RANGE_Y_MIN + Math.random() * (MOVE_RANGE_Y_MAX - MOVE_RANGE_Y_MIN); break
		case 1: sp.targetX = MOVE_RANGE_X_MAX - Math.random() * 5; sp.targetY = MOVE_RANGE_Y_MIN + Math.random() * (MOVE_RANGE_Y_MAX - MOVE_RANGE_Y_MIN); break
		case 2: sp.targetX = MOVE_RANGE_X_MIN + Math.random() * (MOVE_RANGE_X_MAX - MOVE_RANGE_X_MIN); sp.targetY = MOVE_RANGE_Y_MIN + Math.random() * 5; break
		default: sp.targetX = MOVE_RANGE_X_MIN + Math.random() * (MOVE_RANGE_X_MAX - MOVE_RANGE_X_MIN); sp.targetY = MOVE_RANGE_Y_MAX - Math.random() * 5; break
	}
}

const pickNewTarget = (sp: Sprite) => {
	sp.targetX = MOVE_RANGE_X_MIN + Math.random() * (MOVE_RANGE_X_MAX - MOVE_RANGE_X_MIN)
	sp.targetY = MOVE_RANGE_Y_MIN + Math.random() * (MOVE_RANGE_Y_MAX - MOVE_RANGE_Y_MIN)
	sp.state = 'walking'
	sp.direction = sp.targetX > sp.x ? 'right' : 'left'
	sp.idleDuration = 0
}

const getEdgeDist = (sp: Sprite) => {
	return Math.min(
		sp.x - MOVE_RANGE_X_MIN,
		MOVE_RANGE_X_MAX - sp.x,
		sp.y - MOVE_RANGE_Y_MIN,
		MOVE_RANGE_Y_MAX - sp.y
	)
}

const findClearDirection = (sp: Sprite, others: Sprite[]) => {
	const dirs = [
		{ name: 'left', dx: -1, dy: 0 },
		{ name: 'right', dx: 1, dy: 0 },
		{ name: 'up', dx: 0, dy: -1 },
		{ name: 'down', dx: 0, dy: 1 }
	]
	let bestDir = dirs[0]
	let bestScore = -Infinity
	for (const d of dirs) {
		let clearDist = 0
		for (let step = 1; step <= 30; step++) {
			const nx = sp.x + d.dx * step
			const ny = sp.y + d.dy * step
			if (nx < MOVE_RANGE_X_MIN || nx > MOVE_RANGE_X_MAX || ny < MOVE_RANGE_Y_MIN || ny > MOVE_RANGE_Y_MAX) break
			let blocked = false
			for (const o of others) {
				const ddx = nx - o.x
				const ddy = ny - o.y
				if (Math.sqrt(ddx * ddx + ddy * ddy) < COLLISION_MIN_DIST) { blocked = true; break }
			}
			if (blocked) break
			clearDist = step
		}
		if (clearDist > bestScore) {
			bestScore = clearDist
			bestDir = d
		}
	}
	return bestDir
}

export function useMovement(sprites: Ref<Sprite[]>) {
	let moveInterval: number | null = null

	const buildSpriteData = (pets: any[], existingSprites: Sprite[]) => {
		const activePets = pets.filter((p: any) => p.has_pet)
		const positions = generateUniformPositions(activePets.length)
		let petIdx = 0
		return pets.map((p: any) => {
			const existing = existingSprites.find(s => s.groupId === p.group_id)
			let initX: number, initY: number
			if (existing) {
				initX = existing.x
				initY = existing.y
			} else if (p.has_pet && petIdx < positions.length) {
				initX = positions[petIdx].x
				initY = positions[petIdx].y
				petIdx++
			} else {
				initX = MOVE_RANGE_X_MIN + Math.random() * (MOVE_RANGE_X_MAX - MOVE_RANGE_X_MIN)
				initY = MOVE_RANGE_Y_MIN + Math.random() * (MOVE_RANGE_Y_MAX - MOVE_RANGE_Y_MIN)
			}
			const initDir = Math.random() > 0.5 ? 'right' : 'left'
			const initState = existing?.state ?? 'idle'
			const initIdleDuration = existing?.idleDuration ?? Math.floor(Math.random() * IDLE_FRAMES_MAX)
			return {
				groupId: p.group_id,
				groupName: p.group_name,
				hasPet: p.has_pet,
				petId: p.id,
				petType: p.pet_type,
				petName: p.pet_name,
				lifeStage: p.life_stage || 1,
				energy: p.energy ?? 60,
				mood: p.mood ?? 60,
				growthFeedCount: p.growth_feed_count || 0,
				x: initX,
				y: initY,
				targetX: existing?.targetX ?? initX,
				targetY: existing?.targetY ?? initY,
				direction: existing?.direction ?? initDir,
				state: initState,
				bubble: null,
				bubbleTimer: null,
				moveTimer: Math.floor(Math.random() * 100),
				idleDuration: initIdleDuration,
				idleTarget: Math.floor(IDLE_FRAMES_MIN + Math.random() * (IDLE_FRAMES_MAX - IDLE_FRAMES_MIN))
			} as Sprite
		})
	}

	const startMoveLoop = () => {
		if (moveInterval) return
		moveInterval = window.setInterval(() => {
			const ordered = [...sprites.value]
				.filter(s => s.hasPet)
				.sort((a, b) => getEdgeDist(a) - getEdgeDist(b))
			for (const sp of ordered) {
				if (!sp.hasPet) continue
				sp.moveTimer++
				if (sp.state === 'idle') {
					sp.idleDuration = (sp.idleDuration || 0) + 1
					if (sp.idleDuration >= (sp.idleTarget || IDLE_FRAMES_MAX)) {
						pickNewTarget(sp)
					}
					continue
				}
				if (sp.state === 'walking') {
					const dx = sp.targetX - sp.x
					const dy = sp.targetY - sp.y
					const dist = Math.sqrt(dx * dx + dy * dy)
					if (dist < 2) {
						sp.state = 'idle'
						sp.idleDuration = 0
						sp.idleTarget = Math.floor(IDLE_FRAMES_MIN + Math.random() * (IDLE_FRAMES_MAX - IDLE_FRAMES_MIN))
						continue
					}
					const stepX = dx / dist * 0.2
					const stepY = dy / dist * 0.25
					const nextX = sp.x + stepX
					const nextY = sp.y + stepY
					if (dx !== 0) {
						sp.direction = stepX > 0 ? 'right' : 'left'
					}
					let blocked = false
					for (const other of sprites.value) {
						if (!other.hasPet || other.groupId === sp.groupId) continue
						const ddx = nextX - other.x
						const ddy = nextY - other.y
						if (Math.sqrt(ddx * ddx + ddy * ddy) < COLLISION_MIN_DIST) {
							blocked = true
							break
						}
					}
					if (!blocked) {
						sp.x = nextX
						sp.y = nextY
					} else {
						const others = sprites.value.filter(s => s.hasPet && s.groupId !== sp.groupId)
						const clearDir = findClearDirection(sp, others)
						if (clearDir.dx !== 0 || clearDir.dy !== 0) {
							sp.targetX = Math.max(MOVE_RANGE_X_MIN, Math.min(MOVE_RANGE_X_MAX, sp.x + clearDir.dx * 40))
							sp.targetY = Math.max(MOVE_RANGE_Y_MIN, Math.min(MOVE_RANGE_Y_MAX, sp.y + clearDir.dy * 30))
							sp.direction = sp.targetX > sp.x ? 'right' : 'left'
						} else {
							pickRandomEdgeTarget(sp)
							sp.direction = sp.targetX > sp.x ? 'right' : 'left'
						}
					}
				}
			}
		}, 50)
	}

	const stopMoveLoop = () => {
		if (moveInterval) { clearInterval(moveInterval); moveInterval = null }
	}

	return { buildSpriteData, startMoveLoop, stopMoveLoop }
}
