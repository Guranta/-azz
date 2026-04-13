# Meme Affinity Query

如果你的 OpenClaw 支持从 GitHub 安装 skill，请填写下面这组信息：

```text
repo: https://github.com/Guranta/-azz.git
path: skills/meme-affinity-query
skill: meme-affinity-query
```

安装后可用指令：`analyze` · `bind` · `approve` · `buy` · `sell`

## Instructions

| Command | Binding | Description |
|---|---|---|
| `analyze <token>` | no | Token scoring (CZ + smart money + risk) |
| `bind <bindingCode>` | — | Bind session to user's trading config |
| `approve <token>` | yes | Authorize token for sell |
| `buy <token> <amount> <base>` | yes | Swap BNB/USDT → token |
| `sell <token> <amount> <base>` | yes | Swap token → BNB/USDT |

## Onboarding

1. User configures their AVE API key/secret on the website → gets `bindingCode` (小龙虾 ID)
2. `bind <bindingCode>` in the skill → session is bound
3. `approve` / `buy` / `sell` work without further identity input

## Constraints

- BSC only
- No secrets held in skill
- All logic runs on website API
