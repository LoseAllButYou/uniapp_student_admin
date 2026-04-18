import { TreeRenderData, BannerData, BANNER_COLORS } from './types'
import { IMG_BASE, TREE_MATERIALS } from './materialConfig'
export { IMG_BASE } from './materialConfig'

export const WATER_COOLING_MS = 30 * 60 * 1000

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
const imageLoadCallbacks: (() => void)[] = []

export function preloadAllImages(): Promise<void> {
	if (imagesLoaded) return Promise.resolve()
	if (imagesLoading) {
		return new Promise(resolve => imageLoadCallbacks.push(resolve))
	}

	imagesLoading = true
	const toLoad: string[] = [`${IMG_BASE}/bg.svg`]
	for (const type in TREE_MATERIALS) {
		const mat = TREE_MATERIALS[type]
		toLoad.push(mat.trunk, mat.branch, mat.leaf, mat.treeIcon)
	}

	const uniquePaths = [...new Set(toLoad.filter(p => p))]
	let loaded = 0

	return new Promise(resolve => {
		const checkDone = () => {
			loaded++
			if (loaded >= uniquePaths.length) {
				imagesLoaded = true
				imagesLoading = false
				imageLoadCallbacks.forEach(cb => cb())
				imageLoadCallbacks.length = 0
				resolve()
			}
		}

		for (const path of uniquePaths) {
			const img = new Image()
			img.onload = () => {
				console.log(`素材加载成功: ${path}`)
				checkDone()
			}
			img.onerror = () => {
				console.warn(`素材加载失败: ${path}`)
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
	return 80 + level * 30
}

export function getTrunkThickness(level: number): number {
	return 10 + level * 4
}

export function getCanopyRadius(level: number): number {
	return 60 + level * 35
}

const TREE_CONFIG = {
	maxDepth: 12,
	lengthDecay: 0.72,
	widthDecay: 0.65,
	branchAngle: 0.4,
	leafThreshold: 3,
	baseTrunkLength: 80,
	baseTrunkWidth: 14,
	baseLeafSize: 10,
}

function seededRandom(seed: number): () => number {
	let s = seed
	return () => {
		s = (s * 16807) % 2147483647
		return (s - 1) / 2147483646
	}
}

function getBranchStartRatio(level: number): number {
	if (level <= 3) return 1 / 3
	if (level <= 6) return 1 / 2
	return 2 / 3
}

function getMaxDepth(level: number): number {
	if (level <= 3) return level + 2
	if (level <= 6) return level + 3
	return Math.min(level + 4, TREE_CONFIG.maxDepth)
}

function getInitialBranchCount(level: number, rng: () => number): number {
	if (level <= 3) return 2
	if (level <= 6) return 2 + Math.floor(rng() * 2)
	return 3 + Math.floor(rng() * 2)
}

function getSubBranchCount(depth: number, level: number, rng: () => number): number {
	if (level <= 3) return 2
	if (depth < 4) return rng() > 0.5 ? 3 : 2
	return 2
}

function getLeafCount(level: number, rng: () => number): number {
	if (level <= 3) return 2 + Math.floor(rng() * 2)
	return 3 + Math.floor(rng() * 4)
}

function generateTreeBranchesFractal(level: number, trunkHeight: number): TreeBranch[] {
	const branches: TreeBranch[] = []
	const maxDepth = getMaxDepth(level)
	const rng = seededRandom(level * 137 + 42)
	const startRatio = getBranchStartRatio(level)

	const branchStartY = -trunkHeight * startRatio

	const initialBranchCount = getInitialBranchCount(level, rng)
	for (let i = 0; i < initialBranchCount; i++) {
		const spreadAngle = initialBranchCount <= 2
			? (i === 0 ? -1 : 1) * (TREE_CONFIG.branchAngle + rng() * 0.1)
			: (i - (initialBranchCount - 1) / 2) * 0.35
		const baseAngle = -Math.PI / 2 + spreadAngle
		const length = TREE_CONFIG.baseTrunkLength * (0.8 + rng() * 0.4) * (1 + level * 0.1)
		const thickness = TREE_CONFIG.baseTrunkWidth * (0.7 + rng() * 0.3) * (1 + level * 0.06)

		generateBranchRecursive(
			0, branchStartY,
			baseAngle + (rng() - 0.5) * 0.15,
			length, thickness,
			1, maxDepth, branches, rng, level
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
	treeLevel: number
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

	if (depth >= maxDepth - TREE_CONFIG.leafThreshold) {
		const leafCount = getLeafCount(treeLevel, rng)
		for (let i = 0; i < leafCount; i++) {
			const t = 0.3 + rng() * 0.7
			const lx = startX + (endX - startX) * t
			const ly = startY + (endY - startY) * t
			const leafAngle = angle + (rng() - 0.5) * Math.PI * 0.8
			const leafSize = TREE_CONFIG.baseLeafSize * (0.8 + rng() * 0.5) * (1 + treeLevel * 0.05)
			branch.leaves.push({ x: lx, y: ly, angle: leafAngle, size: leafSize })
		}
	}

	if (depth === maxDepth - TREE_CONFIG.leafThreshold) {
		const clusterCount = treeLevel <= 3 ? 2 : 3 + Math.floor(rng() * 3)
		for (let i = 0; i < clusterCount; i++) {
			const t = 0.4 + rng() * 0.6
			const cx = startX + (endX - startX) * t
			const cy = startY + (endY - startY) * t
			const leafAngle = angle + (rng() - 0.5) * Math.PI * 0.6
			const leafSize = TREE_CONFIG.baseLeafSize * (0.6 + rng() * 0.4) * (1 + treeLevel * 0.04)
			branch.leaves.push({ x: cx, y: cy, angle: leafAngle, size: leafSize })
		}
	}

	branches.push(branch)

	const branchCount = getSubBranchCount(depth, treeLevel, rng)
	const newLength = length * (TREE_CONFIG.lengthDecay + rng() * 0.1)
	const newThickness = thickness * TREE_CONFIG.widthDecay

	for (let i = 0; i < branchCount; i++) {
		let newAngle: number
		if (branchCount === 2) {
			newAngle = angle + (i === 0 ? -1 : 1) * (TREE_CONFIG.branchAngle + rng() * 0.15)
		} else {
			const offsets = [-TREE_CONFIG.branchAngle * 1.2, 0, TREE_CONFIG.branchAngle * 1.2]
			newAngle = angle + offsets[i] + (rng() - 0.5) * 0.1
		}

		generateBranchRecursive(
			endX, endY,
			newAngle,
			newLength, newThickness,
			depth + 1, maxDepth,
			branches, rng, treeLevel
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

export function drawTreeOnCanvas(
	ctx: CanvasRenderingContext2D,
	tree: TreeRenderData,
	cameraX: number,
	cameraY: number,
	zoom: number,
	selected: boolean,
	dpr: number = 1
): void {
	const sx = (tree.worldX - cameraX) * zoom * dpr
	const sy = (tree.worldY - cameraY) * zoom * dpr
	const scale = zoom * dpr

	const colors = getTreeColors(tree.treeType)
	const trunkImg = getImageByType(tree.treeType, 'trunk')
	const branchImg = getImageByType(tree.treeType, 'branch')
	const leafImg = getImageByType(tree.treeType, 'leaf')

	ctx.save()
	ctx.translate(sx, sy)
	ctx.scale(scale, scale)

	if (selected) {
		ctx.shadowColor = 'rgba(76, 175, 80, 0.6)'
		ctx.shadowBlur = 15
	}

	drawTrunk(ctx, tree.trunkHeight, tree.trunkThickness, colors.trunk, trunkImg)

	const branches = tree.branches as any as TreeBranch[]
	drawAllBranches(ctx, branches, colors, tree.treeType, branchImg, leafImg)

	if (selected) {
		ctx.shadowBlur = 0
	}

	drawTreeInfo(ctx, tree, 0, 0, 1)
	ctx.restore()
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
	leafImg: HTMLImageElement | null
): void {
	const sorted = [...branches].sort((a, b) => a.depth - b.depth)

	for (const branch of sorted) {
		if (branchImg && branchImg.complete && branchImg.naturalWidth > 0) {
			const dx = branch.endX - branch.startX
			const dy = branch.endY - branch.startY
			const len = Math.sqrt(dx * dx + dy * dy)
			const angle = Math.atan2(dy, dx)

			ctx.save()
			ctx.translate(branch.startX, branch.startY)
			ctx.rotate(angle)

			const drawW = len
			const drawH = branch.thickness * 2
			ctx.drawImage(branchImg, 0, -drawH / 2, drawW, drawH)
			ctx.restore()
		} else {
			ctx.save()
			ctx.beginPath()
			ctx.moveTo(branch.startX, branch.startY)
			ctx.lineTo(branch.endX, branch.endY)
			ctx.strokeStyle = branch.depth > 5 ? colors.trunk : colors.canopy
			ctx.lineWidth = branch.thickness
			ctx.lineCap = 'round'
			ctx.stroke()
			ctx.restore()
		}

		for (const leaf of branch.leaves) {
			ctx.save()
			ctx.translate(leaf.x, leaf.y)
			ctx.rotate(leaf.angle)
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
	cameraX: number,
	cameraY: number,
	zoom: number,
	canvasWidth: number,
	canvasHeight: number,
	dpr: number = 1
): void {
	const bgImg = getImage(`${IMG_BASE}/bg.svg`)

	if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
		const imgW = bgImg.naturalWidth
		const imgH = bgImg.naturalHeight

		const viewLeft = cameraX
		const viewTop = cameraY
		const viewRight = cameraX + canvasWidth / zoom
		const viewBottom = cameraY + canvasHeight / zoom

		const startCol = Math.floor(viewLeft / imgW)
		const startRow = Math.floor(viewTop / imgH)
		const endCol = Math.ceil(viewRight / imgW)
		const endRow = Math.ceil(viewBottom / imgH)

		ctx.save()
		for (let row = startRow; row < endRow; row++) {
			for (let col = startCol; col < endCol; col++) {
				const worldX = col * imgW
				const worldY = row * imgH
				const screenX = (worldX - cameraX) * zoom * dpr
				const screenY = (worldY - cameraY) * zoom * dpr
				const drawW = imgW * zoom * dpr
				const drawH = imgH * zoom * dpr
				ctx.drawImage(bgImg, screenX, screenY, drawW, drawH)
			}
		}
		ctx.restore()
	} else {
		ctx.save()
		ctx.scale(dpr, dpr)
		const grd = ctx.createLinearGradient(0, 0, 0, canvasHeight)
		grd.addColorStop(0, '#87CEEB')
		grd.addColorStop(0.4, '#B8D4E3')
		grd.addColorStop(0.7, '#F4E4C1')
		grd.addColorStop(1, '#D4A373')
		ctx.fillStyle = grd
		ctx.fillRect(0, 0, canvasWidth, canvasHeight)
		ctx.restore()
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
	const bgImg = getImage(`${IMG_BASE}/bg.svg`)
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
