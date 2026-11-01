# VRCAL 1.4.1 正式版

2026-11-01

Prefab 只读组合预览与百度下载提示

- 新增 Prefab 层级、网格和近似材质预览，支持已登记目录、ZIP、Unitypackage 与 Unity 工程，也可用于角色和衣服静态组合。

- 保留关闭物体的子树隐藏、静态骨骼与祖先变换；修正 GUID、长 fileID、依赖范围和组合资源预算处理。

- 百度下载启动统一使用 45 秒总等待上限，失败提示更具体，并可主动打开应用内下载页面查看登录或验证要求。

- Prefab 仅为静态外观参考，不执行脚本，不还原 Unity 着色器、动画、MA 或物理；嵌套 Prefab 与内置几何等未显示内容会提示，不保证适配。

- 读取保持只读并受授权目录与资源预算限制；真实角色工程、真实账号下载及平台验证仍需分别验收，不承诺所有百度分享均可下载。

- 继续使用原资料库，升级前备份并退出旧版；单文件版检查最新稳定发布，解压目录版从发布页手动更新。

[GitHub Release](https://github.com/NecoAya/VRCAL-VRChat-Asset-Library/releases/tag/v1.4.1)

`VRC-Asset-Library-1.4.1-x64.exe` / `VRC-Asset-Library-1.4.1-x64-Folder.zip`

[Prefab guide / 预览说明 / プレビューガイド](MODEL_PREVIEW.zh-CN.md) · [Downloads / 下载说明 / ダウンロード](DOWNLOADS.zh-CN.md)

保留 KelierAndes 的 Prefab 贡献、原作者历史与全部许可；合并后补充边界修复与回归验证。
