# 追分台球 · 计分器

朋友之间打追分台球时用的记分页面：打开链接 → 选人数 → 填昵称 → 点按钮加分/减分。分享链接后，同一局可以在多台手机上实时同步记分。

## 计分规则

2 人按单人加减分：

| 操作 | 分值 | 操作 | 分值 |
| --- | --- | --- | --- |
| 大金 | +10 | 犯规 | -1 |
| 小金 | +7 | 普黑金 | -4 |
| 黄金9 | +4 | 小黑金 | -7 |
| 普胜 | +4 | 大黑金 | -10 |

2 人让杆项（各自加减分，点谁的卡片就只改谁的分）：

| 情况 | 分值 |
| --- | --- |
| 让杆后解球失败 | -1 |
| 让杆解成普胜 | +8 |
| 让杆解成小金 | +14 |
| 让杆解成大金 | +20 |

3 人追分按座次（上家 = 前一位，下家 = 后一位）多人结算，点击任意一位玩家的按钮即按「点击者视角」记账。首页选 3 人后要先选结算方式：

- **通赔**（默认）：大金 / 黄金9 / 大黑金 / 黄金9黑金由另外两家各赔一份。
- **只赔上家**：这四项只由上一家赔单人份，下家不参与结算。

通赔模式：

| 情况 | 结算 |
| --- | --- |
| 大金 | 点击者 +20，另外两家各 -10 |
| 小金 | 点击者 +7，上家 -7 |
| 黄金9 | 点击者 +8，另外两家各 -4 |
| 普胜 | 点击者 +4，上家 -4 |
| 普通犯规 | 点击者 -1，上家 +1，下家自由 |
| 大黑金 | 点击者 -20，另外两家各 +10 |
| 小黑金 | 点击者 -7，上家 +7 |
| 普黑金 | 点击者 -4，上家 +4 |
| 黄金9黑金 | 点击者 -8，另外两家各 +4 |
| 自由球传 9 进袋黑金 | 点击者 -4，上家 +4 |
| 让杆后上家解球失败 | 点击者（解球方）-1，下家（让杆方）+1 |
| 让杆解成普胜 | 点击者（解球方）+8，下家（让杆方）-8 |
| 让杆解成小金 | 点击者（解球方）+14，下家（让杆方）-14 |
| 让杆解成大金 | 点击者（解球方）+20，上家 +20，下家（让杆方）-40 |

只赔上家模式只改上面四个「通赔」项和让杆大金，其余相同：

| 情况 | 结算 |
| --- | --- |
| 大金 | 点击者 +10，上家 -10 |
| 黄金9 | 点击者 +4，上家 -4 |
| 大黑金 | 点击者 -10，上家 +10 |
| 黄金9黑金 | 点击者 -4，上家 +4 |
| 让杆解成大金 | 点击者（解球方）+20，下家（让杆方）-20 |

- 统一操作：点**当事人**的卡片。比如玩家2 普黑金，就点玩家2 的「普黑金」，玩家2 -4、上家玩家1 +4。
- 让杆类按钮点在解球方（当事人）的卡片上；让杆方固定是解球方的下家。
- 结算方式在开局时选定，记分页顶部会显示当前模式；要换模式请另开一局。
- 3 人时特例项单独一行，共 14 个按钮；2 人共 12 个按钮（8 常规 + 4 让杆）。
- 一笔记录整体生效：「撤销」会连同这次联动加减的所有玩家一起回退，「重置」清空全部。
- 分数不可直接编辑，只能通过按钮加减，可减到负数。
- 支持 2 / 3 人，每人一组自己的按钮。
- 「统计」分两页：比分差（胜负判断 + 台球建议）与每位玩家每个计分项的点击次数。
- 3 人时「比分差」按两两对账：`W_A = (S_A−S_B) + (S_A−S_C)`，依次类推，三人合计恒为 0；2 人仍按本人分数与其他人平均分比较。
- 「重置」清空整局分数和统计，确认后从 0 开始。
- 「撤销」回退全局最后一笔；玩家名可直接点改。
- 对局地址形如 `https://xxx.pages.dev/?match=<uuid>`，右上角「分享」一键复制。

## 本地运行

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 产出 dist/
npm run preview  # 本地预览构建产物
```

没有配置 Supabase 时自动进入**本地模式**：分数只存在这台设备的 localStorage 里，首页会显示「本地模式」徽标。配置之后自动切换为**云端模式**，出现分享按钮和实时同步状态点。

## 配置 Supabase（云端模式）

1. 在 [supabase.com](https://supabase.com) 建一个项目（免费档足够）。
2. 打开 **SQL Editor**，把 `supabase/schema.sql` 整段粘贴执行。脚本可重复执行，包含：
   - `matches` / `match_players` / `match_actions` 三张表；
   - anon 角色的 RLS 放行策略；
   - Realtime publication 与 `replica identity full`（否则撤销的 DELETE 事件同步不到其他设备）；
   - `match_scores` 比分视图（给后续统计用）。
3. 在 **Project Settings → API** 复制 `Project URL` 和 `anon public` key。
4. 本地写入 `.env.local`：

```bash
cp .env.example .env.local
# 填 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY
```

> anon key 本来就是给前端用的公开 key，可以放进构建环境；真正要保护的是 `service_role` key，永远不要写进前端。

### 权限模型

当前采用「**链接即权限**」：拿到带 match uuid 链接的人都能看分、记分、撤销。uuid 不可枚举，适合朋友局；不要把链接发到公开群。需要「只有房主能改」或「进房口令」时，再在 RLS 上叠加 Supabase Auth / 口令校验函数。

### 数据结构

- `matches`：一局，主键就是分享链接里的 uuid。
- `match_players`：局内玩家（`seat` 决定左右顺序），名字可改。
- `match_actions`：每一笔记分流水，分数由流水累加得出，撤销 = 删除最后一条。

客户端逻辑收敛在 `src/hooks/useMatch.ts`（乐观更新 + Realtime 重拉），存储实现收敛在 `src/storage/`。

## 部署到 GitHub Pages

`.github/workflows/deploy.yml` 已配好：推到 `main` 后自动构建并发布，地址形如 `https://<用户名>.github.io/<仓库名>/`。

1. 在 GitHub 新建一个**公开**仓库（免费账号的 Pages 只对公开仓库开放）。
2. 本地关联并推送：

```bash
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
```

3. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。这一步必须先做：首次创建 Pages 站点需要仓库管理员权限，Actions 的令牌没有这个权限（`configure-pages` 会报 `Resource not accessible by integration`）。
4. 推送 `main` 触发部署，等 Actions 跑完，打开 `https://<用户名>.github.io/<仓库名>/`。

- `vite.config.ts` 里 `base: './'`，产物用相对路径，所以仓库名可以随便取，不需要改配置。
- 想用云端同步：**Settings → Secrets and variables → Actions → New repository secret**，加 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`，再点一次 **Re-run all jobs**。不加 Secret 时构建出来是本地模式（分数只存当前设备）。
- 分享链接是 `https://<用户名>.github.io/<仓库名>/?match=<uuid>`，查询参数在子路径下同样有效。

## 部署到 Cloudflare Pages

### 方式一：直接上传（推荐先跑通）

```bash
npx wrangler login     # 浏览器里授权一次
npm run deploy         # 构建 + 上传 dist，wrangler.toml 已指定项目名 zhuifen
```

- 构建时的 `.env.local` 会被打进产物，所以部署前确认里面是正式项目的 URL 和 anon key。
- 首次部署时如果 `zhuifen` 这个 pages.dev 子域名被占用，wrangler 会提示；换一个项目名并同步改 `wrangler.toml` 的 `name` 即可。
- 部署完拿到 `https://zhuifen.pages.dev`，打开 → 开一局 → 右上角「分享」复制带 `?match=` 的链接发微信。

### 方式二：Git 自动部署

1. 代码推到 GitHub。
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → 连接仓库。
3. 构建命令 `npm run build`，输出目录 `dist`。
4. 在 Pages 项目的 **Settings → Environment variables** 里加 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`（Production 和 Preview 都加），再重新部署。

### 其他平台

- **Vercel**：导入仓库即可，Vite 会被自动识别；环境变量在 Project Settings → Environment Variables 配置。
- **GitHub Pages**：见上文「部署到 GitHub Pages」，工作流已内置。

## 微信小程序（本地版）

`miniprogram/` 是原生小程序版本（无构建步骤、无后端），计分规则、按钮分组、统计口径与网页版完全一致，分数存在 `wx` 本地存储里。

1. 微信开发者工具 → **导入项目** → 目录选本仓库的 `miniprogram/`。
2. `project.config.json` 里的 AppID 是 `touristappid`（游客模式），真机预览和上传前换成自己的小程序 AppID。
3. 不需要配置域名、不需要服务器，因为不发任何网络请求。

能力边界和网页本地模式一样：一台手机只存一局，换设备打开看不到。要多人同步，需要另加微信云开发（同一套 `utils/` 逻辑，替换 `utils/store.js` 的实现即可）。

上线流程：完成**小程序备案**（免费，1–20 个工作日）→ 上传代码 → 提交审核 → 发布。个人主体可选「工具 → 效率」类目；不做微信认证也能发布，但搜不到、不能收款。

## 目录结构

```
src/
  types.ts                  计分项定义、Match / ScoreAction 数据模型
  rules.ts                  三人追分按上家 / 下家的联动结算规则
  supabase.ts               Supabase 客户端（读 VITE_ 环境变量，未配置则为 null）
  storage/
    types.ts                MatchRepository 接口（本地 / 云端共用）
    localRepo.ts            localStorage 降级实现
    supabaseRepo.ts         Supabase CRUD + Realtime 订阅
    index.ts                repo 选择、最近一局元信息
  hooks/useMatch.ts         加载、乐观更新、撤销、重置、改名、实时刷新
  pages/HomePage.tsx        欢迎页（人数、昵称、开始、继续上一局）
  pages/MatchPage.tsx       计分页（分数栏、按钮、统计、重置、撤销、分享、同步状态）
  styles.css                全部样式（浅色配色，移动端优先）
miniprogram/                微信小程序（本地存储版，独立于网页构建）
  utils/types.js            计分项定义
  utils/rules.js            三人上家 / 下家联动结算
  utils/store.js            wx 本地存储读写
  utils/summary.js          分数、统计、比分差、台球建议
  pages/home/               开局页（人数、结算方式、昵称、继续上一局）
  pages/match/              计分页（按钮、状态、统计、重置、撤销）
supabase/schema.sql         建表 + RLS + Realtime 配置
wrangler.toml               Cloudflare Pages 项目配置
```

## 后续可加

- 只读观战 / 房主制 / 进房口令（RLS + Supabase Auth）。
- 历史流水页与整局统计（`match_scores` 视图已经建好）。
- 小程序多人同步：接微信云开发，替换 `miniprogram/utils/store.js` 的实现，页面层不用动。

