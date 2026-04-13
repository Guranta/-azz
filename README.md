# 爱赵赵 — BSC Meme 代币喜爱度平台

网站地址：https://azz.886668.shop

## OpenClaw Skill 安装

复制以下内容到 OpenClaw：

```text
repo: https://github.com/Guranta/-azz.git
path: skills/meme-affinity-query
skill: azz
```

可用指令：`分析` · `绑定` · `授权` · `买` · `卖`

---

BSC meme 代币喜爱度分析与交易平台：
- 公开网站：代币评分、地址画像、创建托管钱包、获取绑定码、充值
- OpenClaw Skill：绑定后执行交易（`授权`、`买`、`卖`）
- 平台托管钱包，通过绑定码管理

## 工作区结构

```text
apps/web          Next.js 网站与 API
packages/core     共享类型与服务接口
config            人物与追踪地址配置
skills            OpenClaw skill 资源
docs              项目文档
```

## 交易流程

1. 用户在网站点击"创建钱包"
2. 网站通过 AVE Bot API 创建平台托管钱包
3. 网站返回钱包地址和绑定码
4. 用户向钱包地址存入 BNB 或 USDT
5. 在 OpenClaw 中发送 `绑定 <绑定码>` 绑定 Skill 会话
6. Skill 绑定后可执行 `授权`、`买`、`卖` 操作

用户无需提供 API 密钥。平台管理所有 AVE Bot 凭证。

## 本地开发

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## 生产部署

### VPS 目录结构

所有部署文件位于 `/opt/meme-affinity/` 下：

```text
/opt/meme-affinity/
  app/                    # 本仓库的 git clone
  env/
    .env.production       # 生产环境变量
  runtime/                # AVE 指标、聪明钱快照、绑定数据库（持久化）
```

### VPS 前置要求

- Ubuntu 20.04+（推荐 8 GB 内存）
- Docker 和 Docker Compose 已安装
- Git 已安装
- 端口 80 和 443 已开放（nginx）
- 端口 3000 内部可用

### 初始化

```bash
# 1. 创建目录结构
sudo mkdir -p /opt/meme-affinity/{app,env,runtime}

# 2. 设置运行时目录权限（容器用户 UID/GID 1001）
sudo chown 1001:1001 /opt/meme-affinity/runtime

# 3. 克隆仓库
sudo git clone <PUBLIC_GITHUB_REPO_URL> /opt/meme-affinity/app

# 4. 创建生产环境文件
sudo cp /opt/meme-affinity/app/apps/web/.env.example /opt/meme-affinity/env/.env.production
sudo nano /opt/meme-affinity/env/.env.production
```

### 环境变量

编辑 `/opt/meme-affinity/env/.env.production` 填入实际值：

```bash
# 必填 — AVE 公开 API
AVE_API_KEY=<your_ave_api_key>
AVE_DATA_BASE_URL=https://prod.ave-api.com

# 必填 — MiniMax AI 评分
MINIMAX_API_KEY=<your_minimax_api_key>
MINIMAX_BASE_URL=https://api.minimaxi.com/anthropic
MINIMAX_API_STYLE=anthropic
MINIMAX_MODEL=MiniMax-M2.7

# 必填 — AVE Bot 钱包 API（启用交易功能）
AVE_BOT_API_KEY=<your_ave_bot_api_key>
AVE_BOT_API_SECRET=<your_ave_bot_api_secret>

# 必填 — 部署公开地址
PUBLIC_BASE_URL=https://azz.886668.shop
```

完整变量列表见 `apps/web/.env.example`。

### 构建与启动

```bash
cd /opt/meme-affinity/app
docker compose up -d --build
```

首次构建约 2-3 分钟，后续启动即时完成。

### 验证

```bash
# 检查容器状态
docker compose ps

# 查看日志
docker compose logs -f web

# 测试 API
curl -s http://localhost:3000/api/score-token \
  -X POST -H "Content-Type: application/json" \
  -d '{"tokenAddress":"0xb2acf3ae051c7f0b0b8de90cbb4ed99312574444","chain":"bsc"}' | head -c 200
```

### 日志

```bash
# 实时日志
docker compose -f /opt/meme-affinity/app/docker-compose.yml logs -f web

# 最近 100 行
docker compose -f /opt/meme-affinity/app/docker-compose.yml logs --tail 100 web
```

### 重启

```bash
cd /opt/meme-affinity/app && docker compose restart web
```

### 更新

```bash
cd /opt/meme-affinity/app
git pull origin main
docker compose up -d --build
```

### Nginx（推荐）

在容器前放置 nginx 配置用于 TLS 和域名路由：

```nginx
server {
    listen 80;
    server_name azz.886668.shop;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

HTTPS 请添加 SSL 证书（如 certbot/Let's Encrypt）并更新监听指令为 `listen 443 ssl`。

### 运行时数据

运行时目录 `/opt/meme-affinity/runtime` 存储 AVE 指标、聪明钱快照和钱包绑定数据库。它通过 bind mount 映射到容器的 `/app/apps/web/.runtime`，在容器重启和重建后持久保留。

```bash
ls -la /opt/meme-affinity/runtime/
```

## API 端点

### 代币评分

```
POST /api/score-token
Body: { "tokenAddress": "0x...", "chain": "bsc" }
```

### 地址画像

```
POST /api/score-address
Body: { "address": "0x...", "chain": "bsc" }
```

### 交易

```
POST /api/trade/wallet/generate          # 创建平台托管钱包
GET  /api/trade/wallet?bindingCode=...    # 钱包信息 + 余额
POST /api/trade/bind                      # 通过绑定码绑定
POST /api/trade/approve                   # 授权代币卖出
POST /api/trade/swap                      # 买入或卖出
GET  /api/trade/orders?ids=...            # 订单状态
```
