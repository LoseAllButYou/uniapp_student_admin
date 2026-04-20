import { TreeRenderData, BannerData, BANNER_COLORS } from './types'
import { IMG_BASE, TREE_MATERIALS, BG_MATERIALS, BG_CONFIG, getBgMaterialPath } from './materialConfig'
export { IMG_BASE, BG_CONFIG } from './materialConfig'

export const WATER_COOLING_MS = 30 * 60 * 1000

// 种树最小X轴距离（像素）- 350px
export const MIN_TREE_DISTANCE_X = 350

/**
 * 检查指定X坐标是否可以种树（与现有树的X轴距离是否足够）
 * @param x 要检查的X坐标
 * @param existingTrees 现有树木数组
 * @returns { canPlant: boolean, nearestTree?: TreeRenderData }
 */
export function checkCanPlantAtX(
	x: number,
	existingTrees: TreeRenderData[]
): { canPlant: boolean; nearestTree?: TreeRenderData; distance?: number } {
	for (const tree of existingTrees) {
		const distance = Math.abs(x - tree.worldX)
		if (distance < MIN_TREE_DISTANCE_X) {
			return { canPlant: false, nearestTree: tree, distance }
		}
	}
	return { canPlant: true }
}

export interface BranchLeaf {
	x: number
	y: number
	angle: number
	size: number
}

export interface TreeBranch {
	startX: number
	startY: number
	endX: number
	endY: number
	angle: number
	length: number
	thickness: number
	depth: number
	leaves: BranchLeaf[]
	children: TreeBranch[]
}

const imageCache: Record<string, HTMLImageElement> = {}
let imagesLoaded = false
let imagesLoading = false
const imageLoadCallbacks: ((progress: number) => void)[] = []

export function preloadAllImages(onProgress?: (progress: number) => void): Promise<void> {
	if (imagesLoaded) {
		onProgress?.(100)
		return Promise.resolve()
	}
	if (imagesLoading) {
		if (onProgress) imageLoadCallbacks.push(onProgress)
		return new Promise(resolve => {
			imageLoadCallbacks.push(() => { resolve() })
		})
	}

	imagesLoading = true
	const toLoad: string[] = []
	// 背景素材
	for (const key in BG_MATERIALS) {
		toLoad.push(BG_MATERIALS[key as keyof typeof BG_MATERIALS].path)
	}
	// 树木素材
	for (const type in TREE_MATERIALS) {
		const mat = TREE_MATERIALS[type]
		toLoad.push(mat.trunk, mat.branch, mat.leaf, mat.treeIcon)
	}

	const uniquePaths = [...new Set(toLoad.filter(p => p))]
	const total = uniquePaths.length
	let loaded = 0

	const notifyProgress = (path: string) => {
		loaded++
		const progress = Math.round((loaded / total) * 100)
		onProgress?.(progress)
		imageLoadCallbacks.forEach(cb => cb(progress))
	}

	return new Promise(resolve => {
		const checkDone = () => {
			if (loaded >= total) {
				imagesLoaded = true
				imagesLoading = false
				imageLoadCallbacks.length = 0
				resolve()
			}
		}

		for (const path of uniquePaths) {
			const img = new Image()
			img.onload = () => {
				console.log(`素材加载成功: ${path}`)
				notifyProgress(path)
				checkDone()
			}
			img.onerror = () => {
				console.warn(`素材加载失败: ${path}`)
				notifyProgress(path)
				checkDone()
			}
			img.src = path
			const cacheKey = path.replace(IMG_BASE + '/', '').replace('.svg', '').replace(/\//g, '_')
			imageCache[cacheKey] = img
		}
	})
}

export function getImage(path: string): HTMLImageElement | null {
	const cacheKey = path.replace(IMG_BASE + '/', '').replace('.svg', '').replace(/\//g, '_')
	const img = imageCache[cacheKey]
	if (img && img.complete && img.naturalWidth > 0) {
		return img
	}
	return null
}

export function getImageByType(treeType: string, part: 'trunk' | 'branch' | 'leaf' | 'treeIcon'): HTMLImageElement | null {
	const mat = TREE_MATERIALS[treeType]
	if (!mat) return null
	const path = mat[part]
	return getImage(path)
}

export function getImgSrc(treeType: string): string {
	const mat = TREE_MATERIALS[treeType]
	if (!mat) return treeType
	const path = mat.treeIcon
	const cacheKey = path.replace(IMG_BASE + '/', '').replace('.svg', '').replace(/\//g, '_')
	return cacheKey
}

export function getImgPath(treeType: string): string {
	const mat = TREE_MATERIALS[treeType]
	if (!mat) return `${IMG_BASE}/${treeType}.svg`
	return mat.treeIcon
}

export function getTreeColors(treeType: string): { trunk: string; canopy: string; highlight: string } {
	const mat = TREE_MATERIALS[treeType]
	if (!mat) return { trunk: '#8B6914', canopy: '#2E7D32', highlight: '#81C784' }
	return { trunk: mat.trunkColor, canopy: mat.leafColor, highlight: mat.leafHighlight }
}

/**
 * 绘制平铺背景素材（用于地面和天空的平铺绘制）
 * @param ctx Canvas上下文
 * @param img 素材图片
 * @param screenX 屏幕X坐标
 * @param screenY 屏幕Y坐标
 * @param tileWidth 单个平铺的宽度
 * @param tileHeight 单个平铺的高度
 * @param totalWidth 总绘制宽度
 * @param totalHeight 总绘制高度
 */
function drawTiledBackground(
	ctx: CanvasRenderingContext2D,
	img: HTMLImageElement,
	screenX: number,
	screenY: number,
	tileWidth: number,
	tileHeight: number,
	totalWidth: number,
	totalHeight: number
) {
	if (!img || !img.complete || img.naturalWidth === 0) return

	let x = screenX
	while (x < screenX + totalWidth) {
		let y = screenY
		while (y < screenY + totalHeight) {
			ctx.drawImage(img, x, y, tileWidth, tileHeight)
			y += tileHeight
		}
		x += tileWidth
	}
}

/**
 * 背景元素随机数据
 */
export interface BgElements {
	clouds: Array<{ x: number; y: number; scale: number }>
	stones: Array<{ x: number; y: number; scale: number; rotation: number }>
	weeds: Array<{ x: number; y: number; scale: number; rotation: number }>
}

let bgElements: BgElements | null = null

/**
 * 种子随机数生成器（用于背景元素）
 */
function seededRandomBg(seed: number): () => number {
	let s = seed
	return () => {
		s = Math.sin(s * 9999) * 10000
		return s - Math.floor(s)
	}
}

/**
 * 初始化背景元素（随机生成云、石块、杂草的位置）
 */
export function initBackgroundElements(seed?: number) {
	const random = seed !== undefined ? seededRandomBg(seed) : Math.random
	const { worldWidth, worldHeight, skyRatio, cloudCountMin, cloudCountMax, stoneCountMin, stoneCountMax, weedCountMin, weedCountMax } = BG_CONFIG
	const groundY = Math.floor(worldHeight * skyRatio)

	bgElements = {
		clouds: [],
		stones: [],
		weeds: [],
	}

	// 生成云朵（在天空中随机分布）
	const skyHeight = groundY
	const cloudCount = Math.floor(random() * (cloudCountMax - cloudCountMin + 1)) + cloudCountMin
	for (let i = 0; i < cloudCount; i++) {
		bgElements.clouds.push({
			x: random() * worldWidth,
			y: random() * skyHeight,
			scale: 0.5 + random() * 0.8,
		})
	}

	// 生成石块（在地面上随机分布）
	const groundHeight = worldHeight - groundY
	const stoneCount = Math.floor(random() * (stoneCountMax - stoneCountMin + 1)) + stoneCountMin
	for (let i = 0; i < stoneCount; i++) {
		bgElements.stones.push({
			x: random() * worldWidth,
			y: groundY + random() * groundHeight,
			scale: 0.6 + random() * 0.6,
			rotation: (random() - 0.5) * 0.3,
		})
	}

	// 生成杂草（在地面上随机分布）
	const weedCount = Math.floor(random() * (weedCountMax - weedCountMin + 1)) + weedCountMin
	for (let i = 0; i < weedCount; i++) {
		bgElements.weeds.push({
			x: random() * worldWidth,
			y: groundY + random() * groundHeight,
			scale: 0.4 + random() * 0.5,
			rotation: (random() - 0.5) * 0.2,
		})
	}
}

/**
 * 获取背景元素数据
 */
export function getBackgroundElements(): BgElements {
	if (!bgElements) {
		initBackgroundElements()
	}
	return bgElements!
}

/**
 * 绘制背景
 * @param ctx Canvas上下文
 * @param cameraX 相机X偏移（世界坐标原点到屏幕的偏移）
 * @param cameraY 相机Y偏移
 * @param scale 缩放比例
 * @param canvasWidth Canvas宽度
 * @param canvasHeight Canvas高度
 */
export function drawBackground(
	ctx: CanvasRenderingContext2D,
	cameraX: number,
	cameraY: number,
	scale: number,
	canvasWidth: number,
	canvasHeight: number
) {
	const { worldWidth, worldHeight, groundY } = BG_CONFIG

	// 绘制天空（屏幕范围：0 到 groundY）
	const skyScreenHeight = groundY * scale
	if (skyScreenHeight > 0) {
		const skyImg = getImage(getBgMaterialPath('sky'))
		if (skyImg && skyImg.complete) {
			// 天空从屏幕顶部开始，宽度填满
			const tileWidth = skyImg.naturalWidth * scale
			const tileHeight = skyImg.naturalHeight * scale
			// 计算天空需要覆盖的屏幕区域
			const skyStartY = 0
			const skyEndY = Math.min(skyScreenHeight, canvasHeight)
			drawTiledBackground(
				ctx,
				skyImg,
				0,                    // screenX
				skyStartY,            // screenY
				tileWidth,            // 单个平铺宽度
				tileHeight,           // 单个平铺高度
				canvasWidth,          // 总宽度
				skyEndY - skyStartY   // 总高度
			)
		}
	}

	// 绘制地面（屏幕范围：groundY 到 worldHeight）
	const groundScreenY = groundY * scale
	if (groundScreenY < canvasHeight) {
		const groundImg = getImage(getBgMaterialPath('ground'))
		if (groundImg && groundImg.complete) {
			const tileWidth = groundImg.naturalWidth * scale
			const tileHeight = groundImg.naturalHeight * scale
			// 地面从 groundY * scale 开始
			const groundStartY = Math.max(0, groundScreenY)
			const groundEndY = canvasHeight
			drawTiledBackground(
				ctx,
				groundImg,
				0,                        // screenX
				groundStartY,              // screenY
				tileWidth,                // 单个平铺宽度
				tileHeight,               // 单个平铺高度
				canvasWidth,              // 总宽度
				groundEndY - groundStartY // 总高度
			)
		}
	}

	// 绘制太阳（世界坐标 80%, 15%，转换到屏幕坐标）
	const sunImg = getImage(getBgMaterialPath('sun'))
	if (sunImg && sunImg.complete) {
		const sunWorldX = worldWidth * 0.8
		const sunWorldY = worldHeight * 0.15
		const sunScreenX = (sunWorldX + cameraX) * scale
		const sunScreenY = (sunWorldY + cameraY) * scale
		const sunSize = Math.min(sunImg.naturalWidth, sunImg.naturalHeight) * 0.15 * scale
		ctx.drawImage(sunImg, sunScreenX - sunSize / 2, sunScreenY - sunSize / 2, sunSize, sunSize)
	}

	// 绘制云朵
	const cloudImg = getImage(getBgMaterialPath('cloud'))
	if (cloudImg && cloudImg.complete && bgElements) {
		for (const cloud of bgElements.clouds) {
			// 世界坐标转屏幕坐标：screenX = worldX + cameraX
			const screenX = (cloud.x + cameraX) * scale
			const screenY = (cloud.y + cameraY) * scale
			if (screenX < -200 || screenX > canvasWidth + 200) continue
			if (screenY < -200 || screenY > canvasHeight + 200) continue
			const cloudWidth = cloudImg.naturalWidth * cloud.scale * scale
			const cloudHeight = cloudImg.naturalHeight * cloud.scale * scale
			ctx.drawImage(cloudImg, screenX - cloudWidth / 2, screenY - cloudHeight / 2, cloudWidth, cloudHeight)
		}
	}

	// 绘制石块
	const stoneImg = getImage(getBgMaterialPath('stone'))
	if (stoneImg && stoneImg.complete && bgElements) {
		for (const stone of bgElements.stones) {
			const screenX = (stone.x + cameraX) * scale
			const screenY = (stone.y + cameraY) * scale
			if (screenX < -100 || screenX > canvasWidth + 100) continue
			if (screenY < -100 || screenY > canvasHeight + 100) continue
			ctx.save()
			ctx.translate(screenX, screenY)
			ctx.rotate(stone.rotation)
			const stoneSize = stoneImg.naturalWidth * stone.scale * scale
			ctx.drawImage(stoneImg, -stoneSize / 2, -stoneSize / 2, stoneSize, stoneSize * 0.7)
			ctx.restore()
		}
	}

	// 绘制杂草
	const weedImg = getImage(getBgMaterialPath('weed'))
	if (weedImg && weedImg.complete && bgElements) {
		for (const weed of bgElements.weeds) {
			const screenX = (weed.x + cameraX) * scale
			const screenY = (weed.y + cameraY) * scale
			if (screenX < -50 || screenX > canvasWidth + 50) continue
			if (screenY < -50 || screenY > canvasHeight + 50) continue
			ctx.save()
			ctx.translate(screenX, screenY)
			ctx.rotate(weed.rotation)
			const weedSize = weedImg.naturalWidth * weed.scale * scale * 0.8
			ctx.drawImage(weedImg, -weedSize / 2, -weedSize, weedSize, weedSize * 1.5)
			ctx.restore()
		}
	}
}

/**
 * 种子随机数生成器（用于树木绘制）
 */
function seededRandomForTree(seed: number): () => number {
	let s = seed
	return () => {
		s = (s * 16807) % 2147483647
		return (s - 1) / 2147483646
	}
}

export function getLevelExp(level: number): number {
	const expMap: Record<number, number> = { 1: 200, 2: 400, 3: 600, 4: 800, 5: 1000, 6: 1200, 7: 1400, 8: 1600, 9: 1800, 10: 2000 }
	return expMap[level] || 2000
}

export function getProgressColor(v: number): string {
	if (v >= 75) return '#67c23a'
	if (v >= 50) return '#409eff'
	if (v >= 25) return '#e6a23c'
	return '#f56c6c'
}

export function getExpPercent(level: number, exp: number): number {
	const required = getLevelExp(level)
	return Math.min(100, (exp / required) * 100)
}

export function getTrunkHeight(level: number): number {
	return 120 + level * 40
}

export function getTrunkThickness(level: number): number {
	return 10 + level * 4
}

export function getCanopyRadius(level: number): number {
	return 60 + level * 35
}

const TREE_CONFIG = {
	maxDepth: 12,
	widthDecay: 0.7,
	// 前两层级（depth 1-2）倾斜角度：30-60度
	branchAngleMinEarly: 0.52,  // 30°
	branchAngleMaxEarly: 1.05,  // 60°
	// 后面层级（depth >= 3）倾斜角度：45-75度
	branchAngleMinLate: 0.79,   // 45°
	branchAngleMaxLate: 1.31,   // 75°
	leafThreshold: 3,
	baseTrunkLength: 80,
	baseTrunkWidth: 14,
	baseLeafSize: 10,
}

function getBranchStartRatio(level: number): number {
	return 1 / 2
}

function getMaxDepth(level: number): number {
	// 减少1级
	if (level <= 3) return 2
	if (level <= 6) return 3
	return 4
}

function getInitialBranchCount(level: number, rng: () => number): number {
	// 减少到原来的2/3
	return Math.floor((4 + level * 2) * 2 / 3)
}

function getSubBranchCount(depth: number, level: number, rng: () => number): number {
	if (level <= 3) return 2
	if (depth < 4) return rng() > 0.5 ? 3 : 2
	return 2
}

function getLeafCount(level: number, depth: number, maxDepth: number, rng: () => number): number {
	const levelBonus = Math.floor(level * 0.3)
	if (depth <= 2) {
		return (8 + levelBonus * 2) + Math.floor(rng() * 4)
	} else if (depth === 3) {
		return (4 + levelBonus) + Math.floor(rng() * 2)
	} else if (depth === 4) {
		return Math.max(0, (4 + levelBonus - 4) + Math.floor(rng() * 2))
	}
	return 0
}

function generateTreeBranchesFractal(level: number, trunkHeight: number): TreeBranch[] {
	const branches: TreeBranch[] = []
	const maxDepth = getMaxDepth(level)
	// 使用随机种子，让每次生成的树样式不同
	const randomSeed = Math.floor(Math.random() * 10000)
	const rng = seededRandomForTree(level * 137 + 42 + randomSeed)

	const mainBranchLength = trunkHeight * (2 / 3) * (0.8 + level * 0.05)
	const mainBranchThickness = TREE_CONFIG.baseTrunkWidth * (1 + level * 0.1)

	const initialBranchCount = getInitialBranchCount(level, rng)
	// 修改Y轴分布：从树干9/10到1/2均匀分布
	const branchYMin = -trunkHeight * (9 / 10)
	const branchYMax = -trunkHeight * (1 / 2)
	// 获取树干粗细用于计算x轴偏移范围
	const trunkThickness = getTrunkThickness(level)
	for (let i = 0; i < initialBranchCount; i++) {
		const branchY = branchYMin + (branchYMax - branchYMin) * (i / Math.max(1, initialBranchCount - 1))
		const side = i % 2 === 0 ? -1 : 1
		const order = Math.floor(i / 2)
		// 主枝使用15-45度角度范围，确保不超过45度
		const maxAngle = TREE_CONFIG.branchAngleMaxEarly
		const minAngle = TREE_CONFIG.branchAngleMinEarly
		// 均匀分布：根据order计算基础角度，确保整体分布在15-45度范围内
		const angleStep = (maxAngle - minAngle) / Math.max(2, initialBranchCount / 2)
		const baseAngleOffset = minAngle + order * angleStep + rng() * (angleStep * 0.5)
		// 限制在45度以内
		const clampedAngle = Math.min(baseAngleOffset, maxAngle)
		const spreadAngle = side * clampedAngle
		const baseAngle = -Math.PI / 2 + spreadAngle
		const length = mainBranchLength * (0.85 + rng() * 0.3)
		const thickness = mainBranchThickness * (0.7 + rng() * 0.3)

		// 主枝与树干连接位置的x轴偏移
		// 根据Y轴位置计算树干在该高度的宽度（锥形树干，越往上越细）
		const normalizedY = Math.abs(branchY) / trunkHeight  // 0-1范围，越靠近顶端越小
		const currentThickness = trunkThickness * (0.3 + normalizedY * 0.7)  // 顶端最细30%，底部最粗100%
		const halfThickness = currentThickness * 0.5
		
		// 左侧偏移稍大（树干向左偏），右侧偏移稍小
		// 基础偏移：左侧-0.5，右侧0.4，让左侧更靠外
		const baseOffsetRatio = side === -1 ? -0.5 : 0.4
		const offsetRange = halfThickness * 0.25
		const xOffset = baseOffsetRatio * halfThickness + (rng() - 0.5) * offsetRange

		generateBranchRecursive(
			xOffset, branchY,
			baseAngle + (rng() - 0.5) * 0.2,
			length, thickness,
			1, maxDepth, branches, rng, level, trunkHeight
		)
	}

	return branches
}

function generateBranchRecursive(
	startX: number, startY: number,
	angle: number,
	length: number,
	thickness: number,
	depth: number,
	maxDepth: number,
	branches: TreeBranch[],
	rng: () => number,
	treeLevel: number,
	trunkHeight: number
): void {
	if (depth > maxDepth || length < 2 || thickness < 1) return

	const endX = startX + length * Math.cos(angle)
	const endY = startY + length * Math.sin(angle)

	const branch: TreeBranch = {
		startX, startY, endX, endY,
		angle, length, thickness, depth,
		leaves: [],
		children: []
	}

	// 叶子只长在第二级往下的枝上（depth >= 2），第一级（主枝）不长叶子
	if (depth >= 2) {
		const depthRatio = depth / maxDepth
		const leafProbability = 0.3 + depthRatio * 0.7

		const leafCount = getLeafCount(treeLevel, depth, maxDepth, rng)
		for (let i = 0; i < leafCount; i++) {
			const t = rng()
			const lx = startX + (endX - startX) * t
			const ly = startY + (endY - startY) * t
			const leafAngle = rng() * Math.PI * 2
			const leafSize = TREE_CONFIG.baseLeafSize * (0.8 + rng() * 0.5) * (1 + treeLevel * 0.05)
			branch.leaves.push({ x: lx, y: ly, angle: leafAngle, size: leafSize })
		}

		if (depthRatio >= 0.3 && rng() < leafProbability * 0.8) {
			const clusterCount = treeLevel <= 3 ? 2 : 3 + Math.floor(rng() * 3)
			for (let i = 0; i < clusterCount; i++) {
				const t = rng()
				const cx = startX + (endX - startX) * t
				const cy = startY + (endY - startY) * t
				const leafAngle = rng() * Math.PI * 2
				const leafSize = TREE_CONFIG.baseLeafSize * (0.6 + rng() * 0.4) * (1 + treeLevel * 0.04)
				branch.leaves.push({ x: cx, y: cy, angle: leafAngle, size: leafSize })
			}
		}
	}

	branches.push(branch)

	const branchCount = getSubBranchCount(depth, treeLevel, rng)
	const parentLength = length
	// 下级树枝长度为父级的2/3
	const newLength = parentLength * (2 / 3) * (0.85 + rng() * 0.15)
	const newThickness = thickness * TREE_CONFIG.widthDecay

	for (let i = 0; i < branchCount; i++) {
		const side = i % 2 === 0 ? -1 : 1
		const order = Math.floor(i / 2)

		// 连接位置：
		// - 2级分支（父级是1级，depth=1）从1级分支根部（0）开始分布
		// - 3级及以上分支从父分支1/5到顶端分布
		let branchStartT: number
		if (depth === 1) {
			// 生成2级分支，从1级分支根部开始（0 ~ 0.6）
			branchStartT = rng() * 0.6
		} else {
			// 3级及以上，从父分支1/5到顶端
			branchStartT = 0.2 + rng() * 0.8
		}
		let bx = startX + (endX - startX) * branchStartT
		let by = startY + (endY - startY) * branchStartT

		// 树木3级及以上（treeLevel >= 3）在连接上级分支时开启偏移
		if (treeLevel >= 3) {
			// 垂直于父分支的方向
			const perpAngle = angle + Math.PI / 2
			// 左半边树枝连接在父分支左半边（-thickness/2 ~ 0），右半边连接在右半边（0 ~ thickness/2）
			const halfThickness = thickness * 0.5
			const offsetBase = side === -1 ? -halfThickness * 0.5 : halfThickness * 0.5
			const offsetRange = halfThickness * 0.5  // 在半宽范围内随机
			const randomOffset = offsetBase + (rng() - 0.5) * offsetRange
			bx = bx + Math.cos(perpAngle) * randomOffset
			by = by + Math.sin(perpAngle) * randomOffset
		}

		// 根据层级选择角度范围：前两层级30-60度，后面层级45-75度
		const isEarlyLevel = depth <= 2
		const angleMin = isEarlyLevel ? TREE_CONFIG.branchAngleMinEarly : TREE_CONFIG.branchAngleMinLate
		const angleMax = isEarlyLevel ? TREE_CONFIG.branchAngleMaxEarly : TREE_CONFIG.branchAngleMaxLate
		// 均匀分布，确保不超过最大角度
		const angleStep = (angleMax - angleMin) / Math.max(2, branchCount / 2)
		const baseAngleOffset = angleMin + order * angleStep + rng() * (angleStep * 0.5)
		const clampedAngle = Math.min(baseAngleOffset, angleMax)
		const newAngle = angle + side * clampedAngle

		generateBranchRecursive(
			bx, by,
			newAngle,
			newLength, newThickness,
			depth + 1, maxDepth,
			branches, rng, treeLevel, trunkHeight
		)
	}
}

export function buildTreeRenderData(
	worldX: number,
	worldY: number,
	treeType: string,
	level: number,
	banners: BannerData[] = []
): TreeRenderData {
	const trunkHeight = getTrunkHeight(level)
	const trunkThickness = getTrunkThickness(level)
	const canopyRadius = getCanopyRadius(level)
	const branches = generateTreeBranchesFractal(level, trunkHeight)

	return {
		worldX, worldY, treeType, level,
		branches: branches as any,
		trunkHeight, trunkThickness, canopyRadius,
		banners,
	}
}

function getTreeBoundingBox(tree: TreeRenderData): { minX: number; maxX: number; minY: number; maxY: number } {
	const trunkTop = -tree.trunkHeight
	const branches = tree.branches as any as TreeBranch[]
	
	let minX = -tree.trunkThickness
	let maxX = tree.trunkThickness
	let minY = trunkTop - tree.canopyRadius
	let maxY = 10
	
	for (const branch of branches) {
		minX = Math.min(minX, branch.startX - branch.thickness, branch.endX - branch.thickness)
		maxX = Math.max(maxX, branch.startX + branch.thickness, branch.endX + branch.thickness)
		minY = Math.min(minY, branch.startY - branch.thickness, branch.endY - branch.thickness)
		maxY = Math.max(maxY, branch.startY + branch.thickness, branch.endY + branch.thickness)
		
		for (const leaf of branch.leaves) {
			minX = Math.min(minX, leaf.x - leaf.size)
			maxX = Math.max(maxX, leaf.x + leaf.size)
			minY = Math.min(minY, leaf.y - leaf.size)
			maxY = Math.max(maxY, leaf.y + leaf.size)
		}
	}
	
	return { minX, maxX, minY, maxY }
}

// 全局摇摆时间偏移
let windTime = 0

export function updateWindTime(delta: number = 0.016): void {
	windTime += delta
}

export function getWindTime(): number {
	return windTime
}

export function drawTreeOnCanvas(
	ctx: CanvasRenderingContext2D,
	tree: TreeRenderData,
	selected: boolean,
	dpr: number = 1,
	windOffset: number = 0
): void {
	// 树木在世界坐标系中的位置
	const sx = tree.worldX
	const sy = tree.worldY
	const scale = 1 // 缩放由外部ctx.scale控制

	const colors = getTreeColors(tree.treeType)
	const trunkImg = getImageByType(tree.treeType, 'trunk')
	const branchImg = getImageByType(tree.treeType, 'branch')
	const leafImg = getImageByType(tree.treeType, 'leaf')

	ctx.save()
	ctx.translate(sx, sy)
	ctx.scale(scale, scale)

	// 应用随风摇摆效果（树干轻微摇摆）
	if (windOffset !== 0) {
		const swayAngle = windOffset * 0.02  // 最大摇摆角度
		ctx.rotate(swayAngle)
	}

	drawTrunk(ctx, tree.trunkHeight, tree.trunkThickness, colors.trunk, trunkImg)

	const branches = tree.branches as any as TreeBranch[]
	drawAllBranches(ctx, branches, colors, tree.treeType, branchImg, leafImg, windOffset)

	// 选中时绘制绿色实线轮廓，加粗显眼
	if (selected) {
		const bbox = getTreeBoundingBox(tree)
		ctx.save()
		// 外发光效果
		ctx.shadowColor = 'rgba(76, 175, 80, 0.6)'
		ctx.shadowBlur = 15
		ctx.shadowOffsetX = 0
		ctx.shadowOffsetY = 0
		// 实线加粗
		ctx.strokeStyle = '#4CAF50'
		ctx.lineWidth = 5
		ctx.setLineDash([])  // 实线
		ctx.beginPath()
		ctx.roundRect(bbox.minX - 15, bbox.minY - 15, bbox.maxX - bbox.minX + 30, bbox.maxY - bbox.minY + 30, 15)
		ctx.stroke()
		// 内部细线
		ctx.strokeStyle = '#81C784'
		ctx.lineWidth = 2
		ctx.beginPath()
		ctx.roundRect(bbox.minX - 12, bbox.minY - 12, bbox.maxX - bbox.minX + 24, bbox.maxY - bbox.minY + 24, 12)
		ctx.stroke()
		ctx.restore()
	}

	drawTreeInfo(ctx, tree, 0, 0, 1)

	// 绘制条幅（位置相对于树木）
	if (tree.banners && tree.banners.length > 0) {
		drawBanners(ctx, tree.banners, tree.worldX, tree.worldY, dpr)
	}

	ctx.restore()
}

export function drawBanners(
	ctx: CanvasRenderingContext2D,
	banners: BannerData[],
	treeWorldX: number = 0,
	treeWorldY: number = 0,
	dpr: number = 1
): void {
	const BANNER_COLORS: Record<string, string> = {
		red: '#FF6B6B',
		orange: '#FFA500',
		yellow: '#FFD93D',
		green: '#6BCB77',
		blue: '#4D96FF',
		purple: '#9B59B6',
		pink: '#FF69B4',
	}

	const scale = dpr
	const windTime = getWindTime()

	banners.forEach((banner, index) => {
		const color = BANNER_COLORS[banner.color] || BANNER_COLORS.red
		// 条幅在世界坐标系中的位置（已应用外部scale）
		const bannerWorldX = banner.pos_x !== undefined ? banner.pos_x : treeWorldX - 80 + index * 60
		const bannerWorldY = banner.pos_y !== undefined ? banner.pos_y : treeWorldY - 200

		const sx = bannerWorldX * dpr
		const sy = bannerWorldY * dpr

		ctx.save()
		ctx.translate(sx, sy)

		// 条幅晃动特效
		const swayAngle = Math.sin(windTime * 2 + index * 0.5) * 0.05
		ctx.rotate(swayAngle)

		// 条幅大小随dpr调整
		const bannerScale = dpr
		ctx.scale(bannerScale, bannerScale)

		// 绘制条幅背景（竖向条幅）
		const bannerWidth = 60
		const bannerHeight = 160
		ctx.fillStyle = color
		ctx.beginPath()
		ctx.moveTo(-bannerWidth / 2, 0)
		ctx.lineTo(bannerWidth / 2, 0)
		ctx.lineTo(bannerWidth / 2, bannerHeight)
		ctx.lineTo(0, bannerHeight + 20) // 燕尾
		ctx.lineTo(-bannerWidth / 2, bannerHeight)
		ctx.closePath()
		ctx.fill()

		// 绘制边框
		ctx.strokeStyle = 'rgba(255,255,255,0.5)'
		ctx.lineWidth = 2
		ctx.stroke()

		// 绘制文字（竖向排列，从上往下）
		ctx.fillStyle = banner.text_color || '#fff'
		ctx.font = `${banner.text_bold ? 'bold' : 'normal'} 24px sans-serif`
		ctx.textAlign = 'center'
		ctx.textBaseline = 'top'
		const text = banner.content.length > 6 ? banner.content.slice(0, 6) + '…' : banner.content
		const charSpacing = 26 // 字间距
		const startY = 15 // 起始Y位置
		for (let i = 0; i < text.length; i++) {
			ctx.fillText(text[i], 0, startY + i * charSpacing)
		}

		ctx.restore()
	})
}

function drawTrunk(
	ctx: CanvasRenderingContext2D,
	height: number,
	thickness: number,
	color: string,
	trunkImg: HTMLImageElement | null
): void {
	if (trunkImg && trunkImg.complete && trunkImg.naturalWidth > 0) {
		const imgRatio = trunkImg.naturalWidth / trunkImg.naturalHeight
		const drawH = height * 1.2
		const drawW = drawH * imgRatio
		const scale = thickness / (trunkImg.naturalWidth * 0.3)
		const finalW = drawW * Math.max(scale, 0.8)
		const finalH = drawH
		ctx.drawImage(trunkImg, -finalW / 2, -height, finalW, finalH)
	} else {
		ctx.beginPath()
		ctx.moveTo(-thickness / 2, 0)
		ctx.lineTo(-thickness / 3, -height)
		ctx.lineTo(thickness / 3, -height)
		ctx.lineTo(thickness / 2, 0)
		ctx.closePath()
		ctx.fillStyle = color
		ctx.fill()
		ctx.strokeStyle = darkenColor(color, 30)
		ctx.lineWidth = 2
		ctx.stroke()
	}
}

function drawAllBranches(
	ctx: CanvasRenderingContext2D,
	branches: TreeBranch[],
	colors: { trunk: string; canopy: string; highlight: string },
	treeType: string,
	branchImg: HTMLImageElement | null,
	leafImg: HTMLImageElement | null,
	windOffset: number = 0
): void {
	const sorted = [...branches].sort((a, b) => a.depth - b.depth)

	for (const branch of sorted) {
		// 计算摇摆偏移（越深层的树枝摇摆越大）
		const branchSway = windOffset * (0.01 + branch.depth * 0.005)

		if (branchImg && branchImg.complete && branchImg.naturalWidth > 0) {
			const dx = branch.endX - branch.startX
			const dy = branch.endY - branch.startY
			const len = Math.sqrt(dx * dx + dy * dy)
			const angle = Math.atan2(dy, dx)

			ctx.save()
			ctx.translate(branch.startX, branch.startY)
			ctx.rotate(angle + branchSway)

			const drawW = len
			const drawH = branch.thickness * 2
			ctx.drawImage(branchImg, 0, -drawH / 2, drawW, drawH)
			ctx.restore()
		} else {
			ctx.save()
			ctx.beginPath()
			// 应用摇摆到终点坐标
			const swayedEndX = branch.endX + branchSway * 20
			ctx.moveTo(branch.startX, branch.startY)
			ctx.lineTo(swayedEndX, branch.endY)
			ctx.strokeStyle = branch.depth > 5 ? colors.trunk : colors.canopy
			ctx.lineWidth = branch.thickness
			ctx.lineCap = 'round'
			ctx.stroke()
			ctx.restore()
		}

		for (const leaf of branch.leaves) {
			ctx.save()
			ctx.translate(leaf.x, leaf.y)
			// 叶子有更明显的摇摆效果
			const leafSway = windOffset * 0.3 + Math.sin(windTime * 2 + leaf.x * 0.1) * 0.1
			ctx.rotate(leaf.angle + leafSway)
			drawLeaf(ctx, leaf.size, colors, treeType, leafImg)
			ctx.restore()
		}
	}
}

function drawLeaf(
	ctx: CanvasRenderingContext2D,
	size: number,
	colors: { canopy: string; highlight: string },
	treeType: string,
	leafImg: HTMLImageElement | null
): void {
	if (leafImg && leafImg.complete && leafImg.naturalWidth > 0) {
		ctx.drawImage(leafImg, -size, -size, size * 2, size * 2)
		return
	}

	ctx.save()

	if (treeType === 'cherry') {
		ctx.beginPath()
		ctx.moveTo(0, -size)
		ctx.bezierCurveTo(size * 0.8, -size * 0.6, size * 0.8, size * 0.3, 0, size)
		ctx.bezierCurveTo(-size * 0.8, size * 0.3, -size * 0.8, -size * 0.6, 0, -size)
		ctx.fillStyle = colors.canopy
		ctx.fill()
	} else if (treeType === 'maple') {
		const points = 5
		ctx.beginPath()
		for (let i = 0; i < points * 2; i++) {
			const a = (i / (points * 2)) * Math.PI * 2
			const r = i % 2 === 0 ? size : size * 0.5
			const px = Math.cos(a) * r
			const py = Math.sin(a) * r
			if (i === 0) ctx.moveTo(px, py)
			else ctx.lineTo(px, py)
		}
		ctx.closePath()
		ctx.fillStyle = colors.canopy
		ctx.fill()
	} else if (treeType === 'ginkgo') {
		ctx.beginPath()
		ctx.moveTo(0, -size)
		ctx.bezierCurveTo(-size * 0.8, -size * 0.5, -size * 0.6, size * 0.8, 0, size)
		ctx.bezierCurveTo(size * 0.6, size * 0.8, size * 0.8, -size * 0.5, 0, -size)
		ctx.closePath()
		ctx.fillStyle = colors.canopy
		ctx.fill()
	} else {
		ctx.beginPath()
		ctx.ellipse(0, 0, size * 0.5, size, 0, 0, Math.PI * 2)
		ctx.fillStyle = colors.canopy
		ctx.fill()
	}

	ctx.restore()
}

function drawTreeInfo(ctx: CanvasRenderingContext2D, tree: TreeRenderData, sx: number, sy: number, scale: number): void {
	const infoY = sy + 10 * scale
	ctx.save()
	ctx.font = `bold ${14 * scale}px sans-serif`
	ctx.textAlign = 'center'
	ctx.textBaseline = 'top'

	const text = `Lv.${tree.level}`
	const nameWidth = ctx.measureText(text).width + 20 * scale

	ctx.fillStyle = 'rgba(0,0,0,0.6)'
	ctx.beginPath()
	ctx.roundRect(sx - nameWidth / 2, infoY, nameWidth, 22 * scale, 11 * scale)
	ctx.fill()

	ctx.fillStyle = '#fff'
	ctx.fillText(text, sx, infoY + 4 * scale)
	ctx.restore()
}

function darkenColor(hex: string, amount: number): string {
	const num = parseInt(hex.replace('#', ''), 16)
	const r = Math.max(0, (num >> 16) - amount)
	const g = Math.max(0, ((num >> 8) & 0x00FF) - amount)
	const b = Math.max(0, (num & 0x0000FF) - amount)
	return `rgb(${r},${g},${b})`
}

export function drawBackgroundOnCanvas(
	ctx: CanvasRenderingContext2D,
	canvasWidth: number,
	canvasHeight: number,
	dpr: number = 1
): void {
	const { worldWidth, worldHeight, skyRatio, decorationSize } = BG_CONFIG
	const groundY = worldHeight * skyRatio

	// 1. 绘制天空和地面（拉伸填满整个世界画面，比例3:2）
	const skyImg = getImage(getBgMaterialPath('sky'))
	const groundImg = getImage(getBgMaterialPath('ground'))

	if (skyImg && skyImg.complete) {
		ctx.drawImage(skyImg, 0, 0, worldWidth, groundY)
	}

	if (groundImg && groundImg.complete) {
		ctx.drawImage(groundImg, 0, groundY, worldWidth, worldHeight - groundY)
	}

	// 备用渐变
	if ((!skyImg || !skyImg.complete) && (!groundImg || !groundImg.complete)) {
		const grd = ctx.createLinearGradient(0, 0, 0, worldHeight)
		grd.addColorStop(0, '#87CEEB')
		grd.addColorStop(skyRatio, '#B8D4E3')
		grd.addColorStop(skyRatio, '#D4A373')
		grd.addColorStop(1, '#C4A484')
		ctx.fillStyle = grd
		ctx.fillRect(0, 0, worldWidth, worldHeight)
	}

	// 2. 绘制太阳（固定在世界坐标右上角）
	const sunImg = getImage(getBgMaterialPath('sun'))
	if (sunImg && sunImg.complete) {
		const sunSize = Math.min(sunImg.naturalWidth, sunImg.naturalHeight) * 0.15
		const sunX = worldWidth * 0.8 - sunSize / 2
		const sunY = groundY * 0.3
		ctx.drawImage(sunImg, sunX, sunY, sunSize, sunSize)
	}

	// 3. 绘制云朵（均匀分布在天空区域）
	getBackgroundElements()
	const cloudImg = getImage(getBgMaterialPath('cloud'))
	if (cloudImg && cloudImg.complete && bgElements) {
		const cloudCount = bgElements.clouds.length
		const spacing = worldWidth / (cloudCount + 1)
		for (let i = 0; i < cloudCount; i++) {
			const cloud = bgElements.clouds[i]
			const x = spacing * (i + 1)
			const y = cloud.y
			const cloudW = cloudImg.naturalWidth * 0.5
			const cloudH = cloudImg.naturalHeight * 0.5
			ctx.drawImage(cloudImg, x - cloudW / 2, y - cloudH / 2, cloudW, cloudH)
		}
	}

	// 4. 绘制石块（均匀分布在地面区域，200x200）
	const stoneImg = getImage(getBgMaterialPath('stone'))
	if (stoneImg && stoneImg.complete && bgElements) {
		const stoneCount = bgElements.stones.length
		const spacing = worldWidth / (stoneCount + 1)
		const size = decorationSize
		for (let i = 0; i < stoneCount; i++) {
			const stone = bgElements.stones[i]
			const x = spacing * (i + 1)
			const y = stone.y
			ctx.save()
			ctx.translate(x, y)
			ctx.rotate(stone.rotation)
			ctx.drawImage(stoneImg, -size / 2, -size / 2, size, size)
			ctx.restore()
		}
	}

	// 5. 绘制杂草（均匀分布在地面区域，200x200）
	const weedImg = getImage(getBgMaterialPath('weed'))
	if (weedImg && weedImg.complete && bgElements) {
		const weedCount = bgElements.weeds.length
		const spacing = worldWidth / (weedCount + 1)
		const size = decorationSize
		for (let i = 0; i < weedCount; i++) {
			const weed = bgElements.weeds[i]
			const x = spacing * (i + 1) + spacing * 0.5
			const y = weed.y
			ctx.save()
			ctx.translate(x, y)
			ctx.rotate(weed.rotation)
			ctx.drawImage(weedImg, -size / 2, -size, size, size * 1.5)
			ctx.restore()
		}
	}
}

export function isPointNearTree(
	worldX: number,
	worldY: number,
	tree: TreeRenderData,
	threshold: number = 60
): boolean {
	const dx = worldX - tree.worldX
	const dy = worldY - (tree.worldY - tree.trunkHeight / 2)
	return Math.sqrt(dx * dx + dy * dy) < threshold + tree.canopyRadius
}

export function formatCoolingTime(ms: number): string {
	if (ms <= 0) return '可浇水'
	const minutes = Math.ceil(ms / (60 * 1000))
	return `${minutes} 分钟后可浇水`
}

export function calculateInitialZoom(canvasW: number, canvasH: number): number {
	const bgImg = getImage(`${IMG_BASE}/bg.png`)
	if (!bgImg || !bgImg.complete || bgImg.naturalWidth <= 0) {
		return 1
	}

	const imgW = bgImg.naturalWidth
	const imgH = bgImg.naturalHeight

	const scaleX = canvasW / imgW
	const scaleY = canvasH / imgH

	const minScale = Math.max(scaleX, scaleY)

	const roundedZoom = Math.ceil(minScale * 10) / 10

	return Math.max(roundedZoom, 0.5)
}

// 小组贡献数据类型
export interface GroupContribution {
	group_id: number
	group_name: string
	group_avatar?: string
	total_exp: number
	action_count: number
	rank: number
}

// 绘制小组贡献榜到Canvas（画面最左侧居中）
export function drawGroupContributionPanel(
	ctx: CanvasRenderingContext2D,
	contributions: GroupContribution[],
	canvasWidth: number,
	canvasHeight: number,
	dpr: number = 1
): void {
	const panelWidth = 200 * dpr
	const panelX = 10 * dpr
	const rowHeight = 45 * dpr

	ctx.save()

	// 绘制面板背景
	ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
	ctx.strokeStyle = '#4CAF50'
	ctx.lineWidth = 2 * dpr
	// 高度动态计算，确保能显示所有小组
	const panelHeight = Math.min(contributions.length * rowHeight + 60 * dpr, 500 * dpr)
	const panelY = canvasHeight / 2 - panelHeight / 2

	// 绘制圆角矩形背景
	ctx.beginPath()
	ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 12 * dpr)
	ctx.fill()
	ctx.stroke()

	// 绘制标题
	ctx.fillStyle = '#4CAF50'
	ctx.font = `bold ${14 * dpr}px sans-serif`
	ctx.textAlign = 'center'
	ctx.textBaseline = 'top'
	ctx.fillText('🏆 小组贡献榜', panelX + panelWidth / 2, panelY + 10 * dpr)

	// 绘制分割线
	ctx.strokeStyle = '#e0e0e0'
	ctx.lineWidth = 1 * dpr
	ctx.beginPath()
	ctx.moveTo(panelX + 10 * dpr, panelY + 35 * dpr)
	ctx.lineTo(panelX + panelWidth - 10 * dpr, panelY + 35 * dpr)
	ctx.stroke()

	// 绘制各小组数据
	const startY = panelY + 45 * dpr
	const maxItems = contributions.length

	contributions.slice(0, maxItems).forEach((group, index) => {
		const y = startY + index * rowHeight
		const centerY = y + rowHeight / 2

		// 前三名特殊背景
		if (index < 3) {
			ctx.fillStyle = index === 0 ? 'rgba(255, 215, 0, 0.15)' : index === 1 ? 'rgba(192, 192, 192, 0.15)' : 'rgba(205, 127, 50, 0.15)'
			ctx.beginPath()
			ctx.roundRect(panelX + 5 * dpr, y, panelWidth - 10 * dpr, rowHeight - 3 * dpr, 6 * dpr)
			ctx.fill()
		}

		// 绘制排名图标
		ctx.font = `${14 * dpr}px sans-serif`
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		if (index === 0) {
			ctx.fillText('🥇', panelX + 18 * dpr, centerY)
		} else if (index === 1) {
			ctx.fillText('🥈', panelX + 18 * dpr, centerY)
		} else if (index === 2) {
			ctx.fillText('🥉', panelX + 18 * dpr, centerY)
		} else {
			ctx.fillStyle = '#666'
			ctx.font = `bold ${11 * dpr}px sans-serif`
			ctx.fillText(String(index + 1), panelX + 18 * dpr, centerY)
		}

		// 绘制小组名称
		ctx.fillStyle = '#333'
		ctx.font = `bold ${12 * dpr}px sans-serif`
		ctx.textAlign = 'left'
		ctx.textBaseline = 'middle'
		const name = group.group_name.length > 6 ? group.group_name.slice(0, 6) + '..' : group.group_name
		ctx.fillText(name, panelX + 35 * dpr, centerY)

		// 绘制贡献值（合并显示：+50贡献值）
		ctx.fillStyle = '#4CAF50'
		ctx.font = `bold ${12 * dpr}px sans-serif`
		ctx.textAlign = 'right'
		const expText = `+${group.total_exp}`
		const labelText = '贡献值'
		const expWidth = ctx.measureText(expText).width
		ctx.fillText(expText, panelX + panelWidth - 50 * dpr, centerY)
		ctx.fillStyle = '#999'
		ctx.font = `${10 * dpr}px sans-serif`
		ctx.fillText(labelText, panelX + panelWidth - 10 * dpr, centerY)

		// 绘制次数
		ctx.fillStyle = '#999'
		ctx.font = `${9 * dpr}px sans-serif`
		ctx.textAlign = 'left'
		ctx.fillText(`${group.action_count}次`, panelX + 35 * dpr, centerY + 14 * dpr)
	})

	ctx.restore()
}
