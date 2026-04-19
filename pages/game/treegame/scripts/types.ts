export interface TreeData {
	id: number
	class_id: number
	class_name: string
	tree_type: string
	tree_name: string
	tree_code: string
	level: number
	exp: number
	total_exp: number
	pos_x: number
	pos_y: number
	last_water_at: number
	last_fertilize_at: number
	planted_at: number
	max_level_at: number | null
	is_max_level: number
	status: number
	banners?: BannerData[]
}

export interface BannerData {
	id: number
	tree_id: number
	branch_index: number
	content: string
	banner_type: string
	color: string
	status: number
	pos_x?: number
	pos_y?: number
	text_color?: string
	text_bold?: number
}

export interface FertilizerItem {
	id: number
	item_code: string
	item_name: string
	quantity: number
	exp_add?: number
	points_cost?: number
	rarity?: string
}

export interface TreeConfig {
	id: number
	tree_type: string
	tree_name: string
	description: string
	unlock_condition: string
	sort_order: number
	status: number
}

export interface Camera {
	x: number
	y: number
	zoom: number
}

export interface Branch {
	x: number
	y: number
	angle: number
	length: number
	thickness: number
	children: Branch[]
	banner?: BannerData | null
}

export interface TreeRenderData {
	worldX: number
	worldY: number
	treeType: string
	level: number
	branches: Branch[]
	trunkHeight: number
	trunkThickness: number
	canopyRadius: number
	banners: BannerData[]
}

export const WORLD_WIDTH = 2505
export const WORLD_HEIGHT = 1667
export const MIN_TREE_DISTANCE = 80
export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 2.0
export const LEVEL_EXP_MAP: Record<number, number> = {
	1: 100, 2: 150, 3: 220, 4: 310, 5: 420,
	6: 550, 7: 700, 8: 880, 9: 1100,
}
export const LEVEL_CUMULATIVE_EXP: Record<number, number> = {
	1: 0, 2: 100, 3: 250, 4: 470, 5: 780,
	6: 1200, 7: 1750, 8: 2450, 9: 3330, 10: 4430,
}

export const TREE_COLORS: Record<string, { trunk: string; canopy: string; highlight: string }> = {
	poplar:  { trunk: '#8B6914', canopy: '#228B22', highlight: '#90EE90' },
	maple:   { trunk: '#6B4226', canopy: '#DC143C', highlight: '#FF6B6B' },
	cherry:  { trunk: '#8B6914', canopy: '#FFB7C5', highlight: '#FFF0F5' },
	ginkgo:  { trunk: '#6B4226', canopy: '#FFD700', highlight: '#FFFACD' },
}

export const BANNER_COLORS: Record<string, string> = {
	red: '#e74c3c',
	yellow: '#f39c12',
	blue: '#3498db',
}
