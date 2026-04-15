<template>
	<div class="tree-game-container">
		<div class="game-placeholder">
			<div class="placeholder-icon">
				<el-icon :size="80"><Sunrise /></el-icon>
			</div>
			<h3 class="placeholder-title">植树小游戏</h3>
			<p class="placeholder-desc">小组合作种植虚拟树木，通过积分兑换水滴和阳光，看谁的小树长得最高！</p>
			<div class="feature-list">
				<el-tag type="success" effect="plain">种植树木</el-tag>
				<el-tag type="warning" effect="plain">浇水施肥</el-tag>
				<el-tag type="info" effect="plain">成长记录</el-tag>
				<el-tag type="primary" effect="plain">环保教育</el-tag>
			</div>
			<el-button type="primary" size="large" class="start-btn" disabled>
				即将上线，敬请期待
			</el-button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { Sunrise } from '@element-plus/icons-vue'
</script>

<style scoped>
.tree-game-container {
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
	border-radius: 8px;
}

.game-placeholder {
	text-align: center;
	padding: 40px;
	color: #fff;
}

.placeholder-icon {
	margin-bottom: 20px;
	opacity: 0.9;
}

.placeholder-title {
	font-size: 28px;
	font-weight: 600;
	margin: 0 0 12px 0;
}

.placeholder-desc {
	font-size: 16px;
	opacity: 0.85;
	margin: 0 0 24px 0;
	max-width: 400px;
}

.feature-list {
	display: flex;
	justify-content: center;
	gap: 10px;
	flex-wrap: wrap;
	margin-bottom: 30px;
}

.feature-list .el-tag {
	font-size: 14px;
	padding: 8px 16px;
}

.start-btn {
	padding: 12px 40px;
	font-size: 16px;
}
</style>
