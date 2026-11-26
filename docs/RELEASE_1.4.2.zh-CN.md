# VRCAL 1.4.2 正式版

2026-11-26

## 界面精简

- 页面顶部集中显示标题和操作，减少重复介绍、装饰标签和固定页脚。
- 素材卡片把分类、标签和状态放在一起，匹配确认与详情合并重复提示。
- 改模工作台、3D 预览、下载和设置等页面用留白分组。下载进度、操作结果和需要处理的提示继续在对应位置显示。

## 自定义 AI 服务商

- 在「设置与备份 → AI 分类与报错解释 → 服务商」选择「自定义」，按服务商文档选择 OpenAI 兼容（Chat Completions）或 Anthropic Messages，填写 HTTPS API Base URL、模型 ID 和 API 密钥。选择所需用途，确认发送范围后保存。
- API 默认关闭。启用后，所选用途的限长文本会随认证信息发送到你填写的地址。应用加密保存密钥，并将其与地址和协议绑定。更换接收方后需重新填写密钥、确认发送范围。
- 真实服务的接口、模型权限、费用与数据留存由服务商决定，兼容性需按实际服务核对。

感谢 NoSetViolin 贡献自定义 AI 服务商支持。[PR #5](https://github.com/NecoAya/VRCAL-VRChat-Asset-Library/pull/5)

## 下载与升级

升级前备份资料库并关闭旧版。新版可以沿用原资料库。若询问保存位置，选择原 `VRChatAssetLibrary` 文件夹的上级目录。

- 单文件版运行 `VRC-Asset-Library-1.4.2-x64.exe`。已有官方单文件版可在「设置与备份 → 应用更新」检查稳定更新。
- 目录版下载并完整解压 `VRC-Asset-Library-1.4.2-x64-Folder.zip`，从解压目录启动 `VRC素材库.exe`。以后从发布页手动更新。

[下载与校验清单](https://github.com/NecoAya/VRCAL-VRChat-Asset-Library/releases/tag/v1.4.2) · [中文使用指南](USER_GUIDE.md) · [AI 配置说明](AI_BACKEND.md)
