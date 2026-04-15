<template>
	<div class="game-container">
		<div class="game-header">
			<h2 class="game-title">小组互动游戏库</h2>
			<p class="game-desc">选择下方游戏，与小组同学一起互动吧！</p>
		</div>

		<div class="game-tabs">
			<el-radio-group v-model="activeGame" size="large">
				<el-radio-button label="pet">
					<el-icon><CaretRight /></el-icon>
					小组宠物系统
				</el-radio-button>
				<el-radio-button label="tree">
					<el-icon><Sunrise /></el-icon>
					植树小游戏
				</el-radio-button>
			</el-radio-group>
		</div>

		<div class="game-content">
			<div v-if="activeGame === 'pet'" class="game-panel">
				<PetGame />
			</div>
			<div v-else-if="activeGame === 'tree'" class="game-panel">
				<TreeGame />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CaretRight, Sunrise } from '@element-plus/icons-vue'
import PetGame from './PetGame.vue'
import TreeGame from './TreeGame.vue'

const activeGame = ref('pet')
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
	margin-bottom: 20px;
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

.game-tabs {
	display: flex;
	justify-content: center;
	margin-bottom: 20px;
}

.game-tabs :deep(.el-radio-button__inner) {
	display: flex;
	align-items: center;
	gap: 6px;
}

.game-content {
	flex: 1;
	overflow: hidden;
}

.game-panel {
	height: 100%;
	overflow-y: auto;
}
</style>
