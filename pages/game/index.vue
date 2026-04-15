<template>
	<div class="game-container">
		<div class="game-header">
			<h2 class="game-title">小组互动游戏库</h2>
			<p class="game-desc">选择下方游戏，与小组同学一起互动吧！</p>
		</div>

		<div class="game-cards">
			<div v-for="game in gameList" :key="game.key" class="game-card" :class="{ active: activeGame === game.key }">
				<div class="game-card-icon">{{ game.icon }}</div>
				<div class="game-card-name">{{ game.name }}</div>
				<div class="game-card-desc">{{ game.desc }}</div>
				<div class="game-card-actions">
					<el-button type="primary" @click="enterGame(game.key)">
						进入游戏
					</el-button>
					<el-button @click="openGameConfig(game.key)">
						<el-icon><Setting /></el-icon> 配置
					</el-button>
				</div>
			</div>
		</div>

		<div v-if="activeGame" class="game-content">
			<el-card class="game-panel">
				<div class="game-panel-header">
					<span class="game-panel-title">{{ currentGameName }}</span>
					<el-button size="small" @click="activeGame = ''">返回游戏库</el-button>
				</div>
				<PetGame v-if="activeGame === 'pet'" />
				<TreeGame v-else-if="activeGame === 'tree'" />
			</el-card>
		</div>

		<!-- 游戏配置弹窗 -->
		<el-dialog v-model="configDialogVisible" :title="configGameName + ' - 游戏配置'" width="900px">
			<PetGameConfig v-if="configGameKey === 'pet'" />
			<el-empty v-else description="该游戏暂未开放配置" />
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Setting } from '@element-plus/icons-vue'
import PetGame from './petgame/PetGame.vue'
import TreeGame from './TreeGame.vue'
import PetGameConfig from './petgame/PetGameConfig.vue'

const activeGame = ref('')
const configDialogVisible = ref(false)
const configGameKey = ref('')

const gameList = [
	{ key: 'pet', name: '宠物小游戏', icon: '🐾', desc: '领养宠物，喂养互动，陪伴成长' },
	{ key: 'tree', name: '班级树', icon: '🌳', desc: '共同浇灌，见证班级成长' },
]

const currentGameName = computed(() => {
	const g = gameList.find(g => g.key === activeGame.value)
	return g ? g.name : ''
})

const configGameName = computed(() => {
	const g = gameList.find(g => g.key === configGameKey.value)
	return g ? g.name : ''
})

const enterGame = (key: string) => {
	activeGame.value = key
}

const openGameConfig = (key: string) => {
	configGameKey.value = key
	configDialogVisible.value = true
}
</script>

<style scoped>
.game-container {
	height: 100%;
	display: flex;
	flex-direction: column;
	background: #fff;
	border-radius: 8px;
	padding: 20px;
}

.game-header {
	text-align: center;
	margin-bottom: 24px;
}

.game-title {
	font-size: 24px;
	font-weight: 600;
	color: #303133;
	margin: 0 0 8px 0;
}

.game-desc {
	font-size: 14px;
	color: #909399;
	margin: 0;
}

.game-cards {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
	gap: 20px;
	margin-bottom: 20px;
}

.game-card {
	background: #f8fafc;
	border: 2px solid #e2e8f0;
	border-radius: 16px;
	padding: 28px 20px;
	text-align: center;
	transition: all 0.3s;
	cursor: default;
}

.game-card:hover {
	border-color: #409eff;
	box-shadow: 0 4px 16px rgba(64, 158, 255, 0.15);
	transform: translateY(-2px);
}

.game-card.active {
	border-color: #409eff;
	background: #f0f7ff;
}

.game-card-icon {
	font-size: 48px;
	margin-bottom: 12px;
}

.game-card-name {
	font-size: 18px;
	font-weight: 600;
	color: #1e293b;
	margin-bottom: 8px;
}

.game-card-desc {
	font-size: 13px;
	color: #94a3b8;
	margin-bottom: 20px;
}

.game-card-actions {
	display: flex;
	justify-content: center;
	gap: 10px;
}

.game-content {
	flex: 1;
	overflow: hidden;
}

.game-panel {
	height: 100%;
	overflow-y: auto;
}

.game-panel-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
}

.game-panel-title {
	font-size: 16px;
	font-weight: 600;
	color: #303133;
}
</style>
