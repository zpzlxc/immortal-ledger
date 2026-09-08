# Cloudflare D1 云存档

项目现在包含一套可选的 Cloudflare Workers + D1 云存档后端。它不会改变游戏规则：本地存档仍然保留，云端只保存当前游戏 JSON、账号和最近约 30 个版本的历史。

## 你需要做的事

1. 安装依赖并登录 Cloudflare：

   ```bash
   npm install
   npx wrangler login
   ```

2. 如果使用已有的 `zpzlxc` 数据库，项目配置已经指向它：

   ```toml
   database_name = "zpzlxc"
   database_id = "19cece15-352b-47b5-85c5-ab539908b390"
   ```

   如果以后要新建数据库，才需要执行：

   ```bash
   npx wrangler d1 create immortal-ledger-db
   ```

   再把命令输出的名称和 `database_id` 填入 `worker/wrangler.toml`。

3. 在远端执行表结构迁移：

   ```bash
   npm run worker:migrate:remote
   ```

4. 构建并部署 Worker。它会同时托管 Vite 前端和 `/api`：

   ```bash
   npm run worker:deploy
   ```

   部署完成后打开 Wrangler 输出的 `https://<你的名称>.<你的子域>.workers.dev` 地址，在初页注册或登录云存档账号即可。

## 本地联调

如果希望本地和线上游戏共用账号与进度，使用已部署的 Worker API。先在项目根目录创建 `.env.local`（只包含 API 地址，不包含任何密钥）：

```bash
VITE_CLOUD_SAVE_API_URL=https://immortal-ledger.zpzlxc.workers.dev/api
```

然后运行：

```bash
npm run dev
```

打开 `http://localhost:5173` 后，在页面中登录云存档。Worker 已允许 `localhost:5173` 和 `127.0.0.1:5173` 访问，因此本地页面与部署版共用线上 D1。

如果只是测试本地后端、刻意使用独立的本地数据库，才需要另外运行 `npm run worker:migrate:local` 和 `npm run worker:dev`；那套数据不会与线上云存档互通。

## 如果前端单独部署

如果前端不由这个 Worker 托管，构建时把 API 地址指向 Worker，并把前端来源写入 `worker/wrangler.toml` 的 `ALLOWED_ORIGIN`：

```bash
VITE_CLOUD_SAVE_API_URL=https://<你的 Worker 地址>/api npm run build
```

`ALLOWED_ORIGIN` 要填前端的完整来源，例如 `https://example.pages.dev`，不要填路径、末尾 `/` 或 `*`。当前仓库的 GitHub Pages 来源已配置为 `https://zpzlxc.github.io`。

## 使用 GitHub Pages 自动部署

当前仓库已有 GitHub Pages 工作流，并新增了 Cloudflare Worker 工作流。建议把 Cloudflare Token 只放在 GitHub Actions 的加密 Secret 中：

1. 先在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中创建 Secret：

   ```text
   CLOUDFLARE_API_TOKEN = 具有 D1 Read、D1 Write、Workers Scripts Edit 的 Token
   ```

2. 在同一页面的 **Variables** 中创建：

   ```text
   VITE_CLOUD_SAVE_API_URL = https://<你的 Worker 地址>/api
   CLOUDFLARE_ACCOUNT_ID = fd05e0f222e36e163feb663cb3b4bafa
   ```

   `VITE_CLOUD_SAVE_API_URL` 不是密码，只是前端 API 地址；如果不设置，当前 Pages 工作流默认使用 `https://immortal-ledger.zpzlxc.workers.dev/api`。`CLOUDFLARE_API_TOKEN` 必须放在 Secrets，不能放 Variables。

3. 先在 Actions 手动运行 **Deploy Cloudflare Worker**，或者推送一次包含 Worker 配置的提交。Worker 成功部署后，把 Wrangler 输出的 Worker URL 填回 `VITE_CLOUD_SAVE_API_URL`。

4. 再运行或重新触发 **Build and deploy to GitHub Pages**。之后推送 `main` 会分别更新 Worker API 和 GitHub Pages 前端。

当前仓库对应的 Pages 来源是 `https://zpzlxc.github.io`，已经写入 `ALLOWED_ORIGIN`；如果以后绑定自定义域名，需要同步修改 `worker/wrangler.toml`。

## 使用方式和边界

- 新设备打开页面后，在“初页”先登录；有云端记录会自动拉取，没有记录则可开始新的一世。
- 同一账号默认使用 `default` 存档槽。每次成功保存都会增加版本号；两台设备同时保存时，客户端会提示并采用云端较新的记录，本地旧版本仍在本地备份链和导出文件中。
- 页面仍提供导入/导出。云端不是独立备份系统，重要节点建议点击“导出”保存 JSON 到自己的位置。
- 账号密码不会写入存档；Worker 使用 PBKDF2 派生密码哈希，只在浏览器本地保存登录令牌。正式公开运营前仍建议增加登录限流、邮箱找回或第三方身份认证。
- 当前 Worker 校验存档结构和资源数量，但它不是防作弊服务器；如果未来需要排行榜或可信经济，需要把关键游戏动作改为由 Worker 结算。

Cloudflare 官方当前说明 D1 免费额度包括每天 500 万行读取、10 万行写入和 5 GB 存储，并且 Workers Free 持续包含用于原型/实验的 D1 能力；超过每日免费额度的请求会报错，因此仍要避免高频整档写入。详见 [D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/)。

## 开源前的安全边界

- D1 的 `database_id`、数据库名称、Worker 名称和 `ALLOWED_ORIGIN` 是标识或配置，不等于数据库密码；公开源码本身不会凭这些值直接获得 D1 读写权限。
- 绝不能提交 Cloudflare API Token、`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_API_KEY`、`.dev.vars`、`.env.local` 或其他真实密钥。项目的 `.gitignore` 已默认忽略这些本地配置文件。
- `ALLOWED_ORIGIN` 只是浏览器 CORS 限制，不是鉴权。真正保护存档的是 Worker 的 Bearer 会话认证。
- 当前账号接口是个人游戏 MVP，公开运行前建议再加 Cloudflare Rate Limiting/Turnstile、登录失败限流和过期会话清理，避免机器人刷注册、登录和 D1 免费额度。

## 注册接口故障回归

2026-09-08 的注册 500 已定位为线上 Workers 的 PBKDF2 上限：120,000 次会抛出 `NotSupportedError`，现改为 100,000 次。修复前线上账号数为 0，不涉及旧密码迁移。注册账号与会话现在通过 D1 事务批量写入，失败整体回滚；数据库写入故障返回 503，用户名重复返回 409。JSON 非对象请求返回 400。

`npm test -- worker/tests/cloud-save.test.ts` 使用实际 workerd 和本地 D1，覆盖密码参数、注册登录退出、会话写入失败回滚、存档读写、账号隔离及并发版本冲突。独立核对 100,000 次派生结果，避免本地运行时未实施线上上限而漏报。Worker 部署工作流在迁移和部署前执行回归测试。

修复已部署至 `https://immortal-ledger.zpzlxc.workers.dev`，版本 `21fc4a42-442e-4ac1-8513-2fa5f6217ac7`。线上临时账号验证通过：注册 201、登录 200、存档上传下载 200、旧版本写入 409、注销后访问 401，以及 localhost CORS 预检 204。全量 66 项测试、Worker 类型检查和构建均通过。
