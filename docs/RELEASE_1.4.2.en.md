# VRCAL 1.4.2 stable release

November 26, 2026

## Simpler interface

- Page headers focus on the title and available actions. Repeated introductions, decorative labels and fixed footers have been removed.
- Asset cards group categories, tags and status. Match review and asset details consolidate repeated messages.
- Spacing groups controls on the workbench, 3D preview, downloads and settings pages. Download progress, action results and messages that need your attention appear alongside the relevant controls.

## Custom AI providers

- In **Settings & backup**, open **AI classification and error explanations** (AI 分类与报错解释) and select **Custom** (自定义) under **Provider**. Choose OpenAI-compatible Chat Completions or Anthropic Messages, then enter the provider's HTTPS API Base URL, model ID and API key. Select the features you want to enable, confirm what will be sent and save.
- The API is off by default. When enabled, it sends the bounded text for the selected feature and the API credential to the address you enter. The app encrypts the key and binds it to that address and protocol. If you change either, enter the key again and confirm the sending scope.
- API behavior, model access, billing and data retention depend on the service you select. Verify compatibility with that service.

NoSetViolin contributed custom AI provider support. [PR #5](https://github.com/NecoAya/VRCAL-VRChat-Asset-Library/pull/5)

## Download and upgrade

Back up your library and close the old app before upgrading. You can reuse the existing library. If asked for a location, select the parent folder of your existing `VRChatAssetLibrary`.

- For the single-file edition, run `VRC-Asset-Library-1.4.2-x64.exe`. The official single-file edition can check for stable updates under **Settings & backup → App updates**.
- For the folder edition, fully extract `VRC-Asset-Library-1.4.2-x64-Folder.zip` and run `VRC素材库.exe` from the extracted folder. Download future updates from the release page.

[Downloads and checksums](https://github.com/NecoAya/VRCAL-VRChat-Asset-Library/releases/tag/v1.4.2) · [English quick start](QUICK_START.en.md) · [AI configuration guide (Chinese)](AI_BACKEND.md)
