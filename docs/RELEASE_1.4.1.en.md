# VRCAL 1.4.1 stable release

2026-11-01

Read-only Prefab composition previews and Baidu download guidance

- Preview Prefab hierarchies, meshes and approximate materials from registered folders, ZIPs, Unitypackages and Unity projects, including static avatar and clothing combinations.

- Preserve hidden inactive subtrees, static skeletons and ancestor transforms; correct GUIDs, long fileIDs, dependency boundaries and shared resource budgets.

- Baidu download startup uses one 45-second deadline, with more specific errors and an explicit in-app download-page action for login or verification requirements.

- Prefab previews are static appearance references: scripts are not executed and Unity shaders, animation, MA and physics are not reproduced. Missing nested Prefabs or built-in geometry are reported; fitting is not guaranteed.

- Reading remains read-only within authorized locations and resource budgets. Real avatar projects, account downloads and platform verification still require separate acceptance checks; not all Baidu shares are guaranteed to download.

- Keep the existing library; back it up and close the old app before upgrading. The single-file edition checks stable releases; update the folder edition manually from the release page.

[GitHub Release](https://github.com/NecoAya/VRCAL-VRChat-Asset-Library/releases/tag/v1.4.1)

`VRC-Asset-Library-1.4.1-x64.exe` / `VRC-Asset-Library-1.4.1-x64-Folder.zip`

[Prefab guide / 预览说明 / プレビューガイド](MODEL_PREVIEW.zh-CN.md) · [Downloads / 下载说明 / ダウンロード](DOWNLOADS.zh-CN.md)

KelierAndes' Prefab contribution, author history and all licenses are preserved, with additional boundary fixes and regression verification after integration.
