/**
 * 背景素材配置文件
 *
 * 目录结构：
 * /web/static/game/tree/bg/
 * ├── ground.png          地面素材（水平平铺）
 * ├── sky.png             天空素材（水平平铺）
 * ├── sun.png             太阳素材
 * ├── cloud.png           云朵素材
 * ├── stone.png           石块素材
 * └── weed.png            杂草素材
 */

export const BG_IMG_BASE = '/web/static/game/tree/bg'

/**
 * 背景素材配置
 */
export const BG_MATERIALS = {
	ground: {
		name: '地面',
		path: `${BG_IMG_BASE}/ground.svg`,
	},
	sky: {
		name: '天空',
		path: `${BG_IMG_BASE}/sky.svg`,
	},
	sun: {
		name: '太阳',
		path: `${BG_IMG_BASE}/sun.svg`,
	},
	cloud: {
		name: '云朵',
		path: `${BG_IMG_BASE}/cloud.svg`,
	},
	stone: {
		name: '石块',
		path: `${BG_IMG_BASE}/stone.svg`,
	},
	weed: {
		name: '杂草',
		path: `${BG_IMG_BASE}/weed.svg`,
	},
} as const

/**
 * Canvas 背景配置
 */
export const BG_CONFIG = {
	/** Canvas世界尺寸 */
	worldWidth: 4000,
	worldHeight: 2500,
	/** 天空占画布比例（2:3 = 天空40%地面60%） */
	skyRatio: 0.4,
	/** 初始画布大小（可调整供调试） */
	canvasWidth: 4000,
	canvasHeight: 2500,
	/** 云朵数量范围 */
	cloudCountMin: 5,
	cloudCountMax: 8,
	/** 石块数量范围 */
	stoneCountMin: 8,
	stoneCountMax: 15,
	/** 杂草数量范围 */
	weedCountMin: 15,
	weedCountMax: 25,
	/** 石块和杂草的绘制尺寸 */
	decorationSize: 200,
} as const

/**
 * 树木素材配置文件
 * 集中管理所有树干、树枝、树叶的 SVG/PNG 素材路径
 *
 * 目录结构建议：
 * /web/static/game/tree/
 * ├── bg/
 * │   ├── ground.png          地面
 * │   ├── sky.png             天空
 * │   ├── sun.png             太阳
 * │   ├── cloud.png           云
 * │   ├── stone.png           石块
 * │   └── weed.png            杂草
 * ├── trunk/
 * │   ├── poplar-trunk.svg      杨树树干
 * │   ├── maple-trunk.svg       枫树树干
 * │   ├── cherry-trunk.svg      樱花树树干
 * │   └── ginkgo-trunk.svg      银杏树树干
 * ├── branch/
 * │   ├── poplar-branch.svg     杨树树枝
 * │   ├── maple-branch.svg      枫树树枝
 * │   ├── cherry-branch.svg     樱花树树枝
 * │   └── ginkgo-branch.svg     银杏树树枝
 * ├── leaf/
 * │   ├── poplar-leaf.svg       杨树叶子
 * │   ├── maple-leaf.svg        枫树叶子
 * │   ├── cherry-leaf.svg       樱花叶子
 * │   └── ginkgo-leaf.svg       银杏叶子
 * └── tree/
 *     ├── poplay.svg            杨树完整图标
 *     ├── maple.svg             枫树完整图标
 *     ├── cherry.svg            樱花树完整图标
 *     └── ginkgo.svg            银杏树完整图标
 */

export const IMG_BASE = '/web/static/game/tree'

/**
 * 每种树的完整素材配置
 * 
 * 替换说明：
 * 1. 将素材文件放入对应目录
 * 2. 修改下面的路径即可
 * 3. 如果某个素材为 null，将使用 Canvas fallback 绘制
 */
export const TREE_MATERIALS: Record<string, {
	name: string
	description: string
	/** 树干素材路径 */
	trunk: string
	/** 树枝素材路径 */
	branch: string
	/** 树叶素材路径 */
	leaf: string
	/** 完整树图标（种树面板展示用） */
	treeIcon: string
	/** 树干颜色（Canvas fallback） */
	trunkColor: string
	/** 树叶颜色（Canvas fallback） */
	leafColor: string
	/** 树叶高光色（Canvas fallback） */
	leafHighlight: string
}> = {
	poplar: {
		name: '杨树',
		description: '挺拔的杨树，象征着坚韧不拔的精神',
		trunk: `${IMG_BASE}/trunk/poplar.svg`,
		branch: `${IMG_BASE}/branch/poplar.svg`,
		leaf: `${IMG_BASE}/leaf/poplar.svg`,
		treeIcon: `${IMG_BASE}/tree/poplar.svg`,
		trunkColor: '#8B6914',
		leafColor: '#2E7D32',
		leafHighlight: '#81C784',
	},
	maple: {
		name: '枫树',
		description: '火红的枫叶，代表着热情和希望',
		trunk: `${IMG_BASE}/trunk/maple.svg`,
		branch: `${IMG_BASE}/branch/maple.svg`,
		leaf: `${IMG_BASE}/leaf/maple.svg`,
		treeIcon: `${IMG_BASE}/tree/maple.svg`,
		trunkColor: '#6D4C41',
		leafColor: '#C62828',
		leafHighlight: '#EF5350',
	},
	cherry: {
		name: '樱花树',
		description: '浪漫的樱花，传递着美好和温柔',
		trunk: `${IMG_BASE}/trunk/cherry.svg`,
		branch: `${IMG_BASE}/branch/cherry.svg`,
		leaf: `${IMG_BASE}/leaf/cherry.svg`,
		treeIcon: `${IMG_BASE}/tree/cherry.svg`,
		trunkColor: '#5D4037',
		leafColor: '#F48FB1',
		leafHighlight: '#FCE4EC',
	},
	ginkgo: {
		name: '银杏树',
		description: '古老的银杏，象征着长寿和智慧',
		trunk: `${IMG_BASE}/trunk/ginkgo.svg`,
		branch: `${IMG_BASE}/branch/ginkgo.svg`,
		leaf: `${IMG_BASE}/leaf/ginkgo.svg`,
		treeIcon: `${IMG_BASE}/tree/ginkgo.svg`,
		trunkColor: '#795548',
		leafColor: '#F9A825',
		leafHighlight: '#FFF176',
	},
}

/**
 * 生长规则配置
 */
export const GROWTH_RULES = {
	/** 初始树枝数量（2-3条） */
	initialBranchMin: 2,
	initialBranchMax: 3,
	/** 每根树枝的叶子数量（3-5片） */
	leafMinPerBranch: 3,
	leafMaxPerBranch: 5,
	/** 每升1级新增次级枝干数 */
	subBranchesPerLevel: 2,
	/** 最大生长等级（6级后只变粗变长） */
	maxGrowthLevel: 6,
	/** 树枝与上级夹角（弧度，斜向上） */
	branchAngleSpread: 0.45,
	/** 树枝长度基准（世界坐标） */
	baseBranchLength: 50,
	/** 每级长度增长系数 */
	lengthGrowthRate: 8,
	/** 树枝粗细基准 */
	baseBranchThickness: 5,
	/** 每级粗细增长系数 */
	thicknessGrowthRate: 1.5,
	/** 次级枝长度比例（相对于上级） */
	subBranchLengthRatio: 0.65,
	/** 次级枝粗细比例 */
	subBranchThicknessRatio: 0.7,
	/** 叶子基准大小 */
	baseLeafSize: 8,
	/** 每级叶子大小增长 */
	leafSizeGrowthRate: 0.5,
	/** 树干高度基准 */
	baseTrunkHeight: 120,
	/** 每级树干高度增长（1-6级） */
	trunkHeightGrowthRate: 35,
	/** 6级后每级高度增长 */
	trunkHeightPostGrowth: 20,
	/** 树干粗细基准 */
	baseTrunkThickness: 15,
	/** 每级树干粗细增长（1-3级） */
	trunkThicknessGrowthRate: 6,
	/** 3级后每级粗细增长 */
	trunkThicknessPostGrowth: 3,
} as const

/**
 * Canvas 面板配置
 */
export const TREE_PANEL_CONFIG = {
	bgColor: 'rgba(0,0,0,0.6)',
	borderRadius: 12,
	padding: 10,
	cardWidth: 80,
	cardHeight: 100,
	cardGap: 12,
	iconSize: 50,
	nameFontSize: 11,
	lockedOverlay: 'rgba(0,0,0,0.5)',
} as const

/**
 * 树木尺寸配置
 */
export const TREE_SIZE_CONFIG = {
	/** 初始缩放 */
	initialZoom: 1.2,
	/** 种植预览树大小：画布高度的 15% */
	plantPreviewHeightRatio: 0.15,
	/** 树木最小绘制高度 */
	minTreeHeight: 60,
	/** 树木最大绘制高度 */
	maxTreeHeight: 400,
} as const

/**
 * 便捷获取素材路径
 */
export function getMaterialPath(treeType: string, part: 'trunk' | 'branch' | 'leaf' | 'treeIcon'): string {
	const mat = TREE_MATERIALS[treeType]
	if (!mat) return ''
	return mat[part]
}

/**
 * 获取素材的 cache key（去掉路径前缀）
 */
export function getMaterialKey(treeType: string, part: 'trunk' | 'branch' | 'leaf' | 'treeIcon'): string {
	const mat = TREE_MATERIALS[treeType]
	if (!mat) return treeType
	const path = mat[part]
	return path.replace(IMG_BASE + '/', '').replace('.svg', '').replace(/\//g, '_')
}

/**
 * 获取所有需要预加载的素材路径（包含背景和树木）
 */
export function getAllMaterialPaths(): string[] {
	const paths: string[] = []
	// 背景素材
	for (const key in BG_MATERIALS) {
		paths.push(BG_MATERIALS[key as keyof typeof BG_MATERIALS].path)
	}

	// 每种树的素材
	for (const type in TREE_MATERIALS) {
		const mat = TREE_MATERIALS[type]
		if (mat.trunk) paths.push(mat.trunk)
		if (mat.branch) paths.push(mat.branch)
		if (mat.leaf) paths.push(mat.leaf)
		if (mat.treeIcon) paths.push(mat.treeIcon)
	}
	return [...new Set(paths)]
}

/**
 * 便捷获取背景素材路径
 */
export function getBgMaterialPath(part: keyof typeof BG_MATERIALS): string {
	return BG_MATERIALS[part].path
}
