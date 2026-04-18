# 班级小组互动植树小游戏开发文档

> **开发状态**: 开发中
> **最后更新**: 2026-04-18

## 一、项目概述

### 1.1 项目名称

「班级绿洲」——班级小组互动植树游戏

### 1.2 项目定位

这是一款面向中小学班级的多人协作养成类网页游戏，通过小组积分兑换肥料、共同培育树木的机制，将班级日常表现量化积分转化为可视化的植树成果，激发学生的集体荣誉感和协作意识。游戏以可拖动的荒漠画布为核心场景，班级各小组通过积分兑换肥料浇灌树木，每棵树木从1级逐步生长至10级满级，满级后班级可解锁新的树苗继续种植，最终将一片荒漠变成绿洲。

### 1.3 核心理念

将班级管理中的积分评价机制与虚拟植树游戏深度融合。参考国内学校的实践案例，将虚拟养成机制引入班级管理，通过小组共育树木强化团队协作意识。

## ✅ 开发进度

> **开发状态**: ✅ Canvas重构完成
> **最后更新**: 2026-04-18

| 阶段 | 状态 | 说明 |
|------|------|------|
| ✅ 需求文档优化 | ✅ 完成 | 明确技术架构和实现方案 |
| ✅ 数据库设计 | ✅ 完成 | 生成 SQL 文件 `student_admin_tree_game.sql`，待用户导入 |
| ✅ 后端模型 | ✅ 完成 | 创建 6 个 Model 文件 |
| ✅ 后端控制器 | ✅ 完成 | 创建 TreeGame.php 控制器，包含13个API接口 |
| ✅ 前端 API | ✅ 完成 | 添加 13 个 API 请求方法到 request.ts |
| ✅ Canvas渲染引擎 | ✅ 完成 | 使用原生Canvas API实现，摄像机+世界坐标系+缩放 |
| ✅ 树木绘制算法 | ✅ 完成 | 动态分支+条幅挂载+4种树种差异化渲染 |
| ✅ 前端界面 | ✅ 完成 | Canvas主界面+侧边栏+弹窗交互 |
| ✅ 样式文件 | ✅ 完成 | TreeGame.scss 样式文件 |
| ✅ 类型定义 | ✅ 完成 | types.ts 和 treeResources.ts |
| ✅ 组合式函数 | ✅ 完成 | useCanvasEngine.ts 和 useTreeActions.ts |
| ✅ 接口适配 | ✅ 完成 | 支持 enterGame() 和 restoreGame() 方法 |
| ⏳ 测试验证 | 待开始 | 功能测试 |

## 📋 开发清单

### 数据库（SQL文件：`fastadmin_student_admin/student_admin_tree_game.sql`）
- [x] fa_stu_game 游戏配置扩展
- [x] fa_stu_tree_config 树种配置表 + 初始数据
- [x] fa_stu_tree 树木主表
- [x] fa_stu_tree_fertilizer 肥料配置表 + 初始数据
- [x] fa_stu_tree_group_bag 小组肥料背包表
- [x] fa_stu_tree_grow_log 树木成长记录表
- [x] fa_stu_tree_banner 祝福条幅表 + 模板数据
- [x] fa_stu_tree_daily_reward 每日奖励记录表
- [x] fa_stu_tree_level_config 树木等级经验配置表 + 初始数据

### 后端模型（目录：`fastadmin_student_admin/application/admin/model/stu/`）
- [x] TreeConfig.php 树种配置模型
- [x] Tree.php 树木主表模型
- [x] TreeFertilizer.php 肥料配置模型
- [x] TreeGroupBag.php 小组肥料背包模型
- [x] TreeGrowLog.php 树木成长记录模型
- [x] TreeBanner.php 祝福条幅模型

### 后端控制器（目录：`fastadmin_student_admin/application/api/controller/stu/`）
- [x] TreeGame.php 植树游戏控制器
  - [x] getTreeConfigs() 获取树种配置列表
  - [x] getTreeList() 获取班级树木列表
  - [x] plantTree() 种植树木
  - [x] waterTree() 浇水（带冷却）
  - [x] fertilizeTree() 单个施肥
  - [x] batchFertilize() 一键批量施肥
  - [x] getBag() 获取小组肥料背包
  - [x] getFertilizerList() 获取肥料配置列表
  - [x] getTreeBanners() 获取树木条幅列表
  - [x] addBanner() 添加祝福条幅
  - [x] getBannerTemplates() 获取条幅模板
  - [x] grantToBag() 发放肥料到背包
  - [x] batchGrantToBag() 批量发放肥料到背包

### 前端 API（文件：`api/request.ts`）
- [x] getTreeConfigs() 获取树种配置
- [x] getTreeList() 获取树木列表
- [x] plantTree() 种植树木
- [x] waterTree() 浇水
- [x] fertilizeTree() 施肥
- [x] batchFertilize() 一键施肥
- [x] getTreeBag() 获取背包
- [x] getFertilizerList() 获取肥料列表
- [x] getTreeBanners() 获取条幅
- [x] addBanner() 添加条幅
- [x] getBannerTemplates() 获取条幅模板
- [x] grantToTreeBag() 发放肥料
- [x] batchGrantToTreeBag() 批量发放肥料

### 前端目录结构（目录：`pages/game/treegame/`）
```
treegame/
├── TreeGame.vue              # 主游戏组件
├── styles/
│   └── TreeGame.scss         # 游戏样式
├── scripts/
│   ├── index.ts              # 导出文件
│   ├── types.ts              # TypeScript 类型定义
│   └── treeResources.ts      # 游戏配置和资源
└── composables/
    ├── useGameState.ts       # 游戏状态管理
    └── useTreeActions.ts     # 树木操作逻辑
```

### 前端功能
- [x] 加载动画和进度条
- [x] 荒漠画布场景
- [x] 树木显示（点击查看详情）
- [x] 树木详情面板（经验条、等级、浇水、施肥、条幅）
- [x] 种植树木弹窗（选择树种）
- [x] 浇水弹窗（显示冷却）
- [x] 施肥弹窗（肥料列表 + 一键施肥）
- [x] 条幅弹窗（预设模板 + 自定义）
- [x] 最小化/恢复游戏
- [x] 经验进度条颜色变化
- [x] 树木经验计算和显示

## 二、核心玩法设计

### 2.1 游戏流程总览

班级创建 → 教师分配小组 → 选择第1棵树苗和种植位置 →
日常获取小组积分 → 兑换肥料 → 施肥浇水升级 →
树木成长（1\~10级）→ 达到10级解锁新树苗 → 选择新树种和位置 → 循环

### 2.2 小组积分系统

#### 2.2.1 积分来源

教师可根据班级实际表现规则，通过后台为各小组手动或批量增加积分。常见积分场景包括：

- 课堂积极发言、回答优质问题
- 小组协作完成任务
- 作业质量优秀
- 卫生/纪律表现良好
- 课间文明行为等

#### 2.2.2 积分排行榜

游戏主界面右侧固定显示小组贡献榜，展示以下信息：

- 小组排名（1\~N名）
- 小组名称/组号
- 当前积分总额
- 小组累计种植树木数量
- 小组当前最高等级树木
- 小组成员头像/姓名列表（可折叠/展开）

#### 2.2.3 每日排名奖励

系统每日零点结算小组积分排名，自动发放对应数量的肥料到各小组背包：

| 排名    | 奖励肥料数量 |
| ----- | ------ |
| 第1名   | 5袋     |
| 第2名   | 4袋     |
| 第3名   | 3袋     |
| 第4-6名 | 2袋     |
| 其余小组  | 1袋     |

### 2.3 肥料与浇水机制

#### 2.3.1 肥料系统

- 肥料获取方式：积分兑换（建议10积分=1袋肥料）、每日排名奖励、教师手动赠送。
- 肥料背包：每个小组独立背包，组员可见共享。
- 一键施肥：在树木详情面板点击“一键施肥”，批量消耗肥料增加经验。

#### 2.3.2 浇水系统

- 浇水免费，每次增加50%当前等级所需总经验进度。
- 浇水冷却：每次浇水后30分钟冷却时间。
- 浇水与施肥可并行使用。

### 2.4 树木成长与升级系统

#### 2.4.1 等级设计（1\~10级）

树木共10个等级，等级越高视觉越茂盛。

#### 2.4.2 经验值与升级曲线（建议配置）

总累计经验约4,430，约14天可满级。

| 等级   | 所需经验  | 累计经验  | 预计耗时   |
| ---- | ----- | ----- | ------ |
| 1→2  | 100   | 100   | \~0.5天 |
| 2→3  | 150   | 250   | \~0.8天 |
| 3→4  | 220   | 470   | \~1.1天 |
| 4→5  | 310   | 780   | \~1.5天 |
| 5→6  | 420   | 1,200 | \~2天   |
| 6→7  | 550   | 1,750 | \~2.5天 |
| 7→8  | 700   | 2,450 | \~3天   |
| 8→9  | 880   | 3,330 | \~3.5天 |
| 9→10 | 1,100 | 4,430 | \~4天   |

#### 2.4.3 升级进度展示

每棵树木上方显示进度条和等级标识。

### 2.5 解锁新树机制

班级任意树木达到10级后，解锁新种植槽位，可自由选择新树种和种植坐标。

### 2.6 祝福条幅系统

#### 2.6.1 条幅挂载

树木从3级开始，每升一级增加1\~2个分支，可挂祝福条幅。

#### 2.6.2 条幅内容模板

- 励志类：“志当存高远，无愧梦少年”等
- 班级友谊类：“携手同行，共赴山海”等
- 成长祝福类：“像树一样，向下扎根，向上生长”等

#### 2.6.3 条幅交互

悬停显示全文，点击查看发布人，教师可审核内容。

## 三、树种设计

### 3.1 树种选择原则

兼具观赏性和教育意义，不同生长等级视觉变化明显。

### 3.2 推荐树种（方案一：经典组合4种）

| 树种  | 特征          | 推荐理由          | 视觉特色      |
| --- | ----------- | ------------- | --------- |
| 胡杨  | 耐旱乔木，秋叶金黄   | 胡杨精神，荒漠变绿洲的标志 | 树干挺拔，秋季金黄 |
| 枫树  | 落叶乔木，秋叶红艳   | 秋季红叶极具视觉冲击    | 五角星形叶片，绚烂 |
| 樱花树 | 春季开花，粉白花海   | 深受喜爱，寓意美好     | 满树繁花，唯美   |
| 银杏  | 古老树种，秋叶金黄扇形 | 活化石，象征坚韧智慧    | 扇形叶，金黄璀璨  |

（也可选用胡杨、沙棘、樟子松组成的3种耐旱主题组合）

### 3.3 树种解锁规则

初始解锁胡杨，每满级一棵树解锁一种新树种。

## 四、技术架构设计

### 4.1 技术栈选型

- 前端框架：Vue 3 / React 18
- UI组件库：Element Plus / Ant Design
- Canvas渲染：原生Canvas API + Konva.js
- 状态管理：Pinia / Zustand
- 后端框架：Node.js + Express / Python + FastAPI
- 数据库：MySQL / PostgreSQL
- 实时通信：WebSocket (Socket.io)
- 部署：Nginx + Docker

### 4.2 Canvas渲染方案

#### 4.2.1 可拖动画布设计

- 世界地图尺寸：3000×2000像素
- 摄像机：通过拖拽移动视口
- 支持鼠标和触摸事件

#### 4.2.2 树木坐标系统

- 记录世界坐标(x, y)
- 点击选择位置，校验不重叠（最小间距80px）
- 坐标实时保存后端

#### 4.2.3 缩放功能

支持滚轮缩放0.5x\~2.0x，以鼠标位置为中心。

#### 4.2.4 性能优化

- 多层画布分离渲染
- 树木预渲染
- 适配设备像素比

## 五、数据结构设计

### 5.1 班级表（class）

id, name, teacher\_id, created\_at

### 5.2 小组表（team）

id, class\_id, name, points, total\_points, fertilizer, created\_at

### 5.3 学生表（student）

id, team\_id, name, avatar

### 5.4 树木表（tree）

id, class\_id, tree\_type, level, exp, pos\_x, pos\_y, planted\_at, is\_max\_level, max\_level\_at

### 5.5 成长记录表（grow\_log）

id, tree\_id, team\_id, action\_type, exp\_gain, created\_at

### 5.6 祝福条幅表（banner）

id, tree\_id, branch\_index, team\_id, student\_id, content, status, created\_at

### 5.7 每日奖励记录表（daily\_reward）

id, team\_id, date, rank, fertilizer\_awarded, created\_at

## 六、API接口设计

### 6.1 班级与小组相关

GET /api/class/:id
GET /api/class/:id/teams
POST /api/team/:id/points
GET /api/team/:id/fertilizer

### 6.2 树木相关

GET /api/class/:id/trees
POST /api/tree/plant
POST /api/tree/:id/water
POST /api/tree/:id/fertilize
POST /api/tree/:id/fertilize/batch
GET /api/tree/:id/grow-logs

### 6.3 商店与兑换相关

POST /api/shop/exchange
GET /api/shop/config

### 6.4 祝福条幅相关

GET /api/tree/:id/banners
POST /api/tree/:id/banner
PUT /api/banner/:id/approve
DELETE /api/banner/:id

### 6.5 排行榜与奖励相关

GET /api/class/:id/ranking
POST /api/daily-reward/trigger

## 七、前端核心模块

### 7.1 目录结构建议

src/
├── components/
│   ├── Canvas/ (GameCanvas, TreeRenderer, Camera, BannerLabel)
│   ├── Panel/ (TeamRanking, TreeDetail, FertilizerBag, PlantSelector)
│   ├── Modal/ (BannerModal, ConfirmModal)
├── views/ (GameView, AdminView)
├── stores/ (gameStore, teamStore, canvasStore)
├── api/
├── utils/ (canvasUtils, treeConfig, expCalculator)
└── assets/ (图片、样式)

### 7.2 核心功能实现要点

- 荒漠场景渲染：渐变+沙丘纹理
- 树木绘制：精灵图或程序化绘制，显示等级进度
- 重点是一定要树木可以随着增长增加枝干和树叶，此外可以挂条幅，挂条幅需要老师去操作，可以预设内容，也可以老师编辑内容
- 小组贡献榜：右侧固定，实时更新积分
- 一键施肥：计算剩余经验，批量调用API

## 八、后台管理功能

### 8.1 教师管理后台

- 班级设置、小组管理、学生管理
- 积分管理（手动加减）
- 树种配置、游戏参数配置（兑换比例、经验值、冷却时间等）
- 祝福条幅审核

### 8.2 数据统计

- 小组积分趋势图
- 树木成长总览
- 操作频率统计

## 九、开发计划

| 阶段             | 周期    | 交付内容                  |
| -------------- | ----- | --------------------- |
| Phase 1: 基础搭建  | 第1周   | 项目初始化、数据库设计、API框架     |
| Phase 2: 画布核心  | 第2-3周 | 荒漠画布、拖拽缩放、树木绘制        |
| Phase 3: 核心玩法  | 第4-5周 | 积分系统、肥料背包、浇水施肥、升级、贡献榜 |
| Phase 4: 进阶功能  | 第6-7周 | 新树解锁、祝福条幅、一键施肥、每日奖励   |
| Phase 5: 后台与优化 | 第8周   | 教师后台、数据统计、优化          |
| Phase 6: 测试上线  | 第9周   | 测试、部署                 |

## 十、配置参数表

| 参数项      | 默认值          | 说明       |
| -------- | ------------ | -------- |
| 积分兑换肥料比例 | 10积分=1袋      | 可配置      |
| 每袋肥料经验值  | 50 exp       | 可配置      |
| 浇水每次经验值  | 当前等级所需经验×50% | 百分比      |
| 浇水冷却时间   | 30分钟         | 可配置      |
| 等级总数     | 10级          | 固定       |
| 总升级时间目标  | 约14天         | 通过经验曲线调整 |
| 每日排名奖励   | 5/4/3/2/1袋   | 可自定义     |
| 树木最小间距   | 80px         | 防止重叠     |
| 祝福条幅字数限制 | 30字          | 可调整      |

## 十一、UI设计参考

整体布局示意：
![](data:image/png;base64,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)

色彩风格：沙漠暖色系（#E8C396、#D4A373）+清新绿色（#4CAF50、#2E7D32）
贡献榜：半透明毛玻璃效果
树木：鲜明色彩突出
条幅：红/黄色小旗帜样式
