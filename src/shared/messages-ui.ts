import {PREVIEW_AI_MESSAGES} from './messages-preview-ai';
import {PUBLIC_PLUGIN_MESSAGES} from './messages-public-plugins';
import {LINK_INBOX_MESSAGES} from './messages-link-inbox';
import {HIDDEN_REMATCH_MESSAGES} from './messages-hidden-rematch';
import {BAIDU_DOWNLOAD_MESSAGES} from './messages-baidu-download';
import {REVIEW_LOCAL_IMAGE_MESSAGES} from './messages-review-local-image';
import {CONTEXT_MENU_MESSAGES} from './messages-context-menu';
import {RECYCLE_MESSAGES} from './messages-recycle';
import {MANUAL_ADD_MESSAGES} from './messages-manual-add';
import {STAR_INVITE_MESSAGES} from './messages-star-invite';
import {ASSISTED_SEARCH_MESSAGES} from './messages-xianyu';
import {PROJECT_PRODUCT_MESSAGES} from './messages-project-products';
import {PROJECT_CHANGE_MESSAGES} from './messages-project-changes';
import {CLOUD_MA_MESSAGES} from './messages-cloud-ma';
import {RELEASE_MESSAGES} from './messages-releases';
import {BAIDU_SCAN_MESSAGES} from './messages-baidu-scan';
import {PROJECT_MESSAGES} from './messages-project';
// Offline UI copy. Keys are Chinese source text, values are [English, Japanese].
// Domain enums, file names and user content keep their original values.
export const UI_MESSAGES: Record<string, readonly [string, string]> = {
  "约": ["约", "约"], // New copy is deferred for translation by the maintainer.
  "看款式 · 可选角色组合查看": ["看款式 · 可选角色组合查看", "看款式 · 可选角色组合查看"],
  ...PUBLIC_PLUGIN_MESSAGES,
  ...PREVIEW_AI_MESSAGES,...LINK_INBOX_MESSAGES,
  ...BAIDU_DOWNLOAD_MESSAGES,
  ...CONTEXT_MENU_MESSAGES,
  ...RECYCLE_MESSAGES,
  ...HIDDEN_REMATCH_MESSAGES,
  ...REVIEW_LOCAL_IMAGE_MESSAGES,
  ...STAR_INVITE_MESSAGES,
  ...MANUAL_ADD_MESSAGES,
  ...ASSISTED_SEARCH_MESSAGES,
  ...PROJECT_MESSAGES,
  ...PROJECT_PRODUCT_MESSAGES,
  ...PROJECT_CHANGE_MESSAGES,
  ...CLOUD_MA_MESSAGES,
  ...RELEASE_MESSAGES,
  ...BAIDU_SCAN_MESSAGES,
  "加群聊天": ["Join the chat", "グループチャットに参加"],
  "QQ群 · 加群聊天": ["QQ group · Join the chat", "QQ グループ · チャットに参加"],
  "催更 / 反馈 Bug，也欢迎聊聊改模和素材整理。": ["Chat, request updates or report bugs. Avatar editing and asset organization are welcome too.", "アップデートのリクエストや不具合報告に。改変や素材整理のお話も歓迎です。"],
  "群号：": ["Group number: ", "グループ番号："],
  "复制群号": ["Copy group number", "グループ番号をコピー"],
  "群号已复制": ["Group number copied", "グループ番号をコピーしました"],
  "使用 QQ 扫描右侧二维码，或搜索群号加入。": ["Scan the QR code with QQ or search for the group number to join.", "QQ で QR コードを読み取るか、グループ番号を検索して参加してください。"],
  "QQ群二维码，群号 {number}": ["QQ group QR code, group number {number}", "QQ グループの QR コード、グループ番号 {number}"],
  "贡献者与社区": ["Contributors & community", "貢献者とコミュニティ"],
  "VRChat 本地素材管理器": ["VRChat Local Asset Manager", "VRChat ローカル素材マネージャー"],
  // New licensing copy stays in Chinese until the requested consolidated translation pass.
  "源码可见": ["源码可见", "源码可见"],
  "感谢让这个项目不断变好的每一个人。": ["Thank you to everyone helping this project grow.", "このプロジェクトをより良くしてくれる皆さんに感謝します。"],
  "源码仓库": ["Source repository", "ソースコード"],
  "参与贡献": ["Get involved", "開発に参加する"],
  "此版本的贡献者": ["Contributors to this release", "このバージョンの貢献者"],
  "BOOTH 下载关联": ["BOOTH 下载关联", "BOOTH 下载关联"],
  "BOOTH 下载记录": ["BOOTH 下载记录", "BOOTH 下载记录"],
  "下载来源": ["下载来源", "下载来源"],
  "来源取自内置 BOOTH 的实际下载，文件名不同无需再次确认。": ["来源取自内置 BOOTH 的实际下载，文件名不同无需再次确认。", "来源取自内置 BOOTH 的实际下载，文件名不同无需再次确认。"],
  "BOOTH 内置下载记录提供明确商品来源": ["BOOTH 内置下载记录提供明确商品来源", "BOOTH 内置下载记录提供明确商品来源"],
  "项目发起与维护": ["Project creator & maintainer", "プロジェクト発起人・メンテナー"],
  "GitHub 主页": ["GitHub profile", "GitHub プロフィール"],
  "Bilibili 主页": ["Bilibili profile", "Bilibili プロフィール"],
  "查看全部贡献者": ["View all contributors", "すべての貢献者を見る"],
  "从一个小改动开始": ["Start with a small change", "小さな改善から始めよう"],
  "代码、翻译、文档、测试与反馈，都欢迎。": ["Code, translations, documentation, testing and feedback are all welcome.", "コード、翻訳、ドキュメント、テスト、フィードバックなど、どんな形でも歓迎します。"],
  "一起完善这个项目": ["Help improve the project", "一緒にプロジェクトを改善する"],
  "了解如何参与，或分享你遇到的问题。": ["Find out how to contribute, or tell us about a problem.", "参加方法を確認したり、困っていることを報告したりできます。"],
  "贡献指南": ["Contribution guide", "貢献ガイド"],
  "反馈问题": ["Report an issue", "問題を報告する"],
  "共同维护，统一发布": ["共同维护，统一发布", "共同维护，统一发布"],
  "项目采用自定义社区协作许可，使用与贡献请阅读仓库 LICENSE。": ["项目采用自定义社区协作许可，使用与贡献请阅读仓库 LICENSE。", "项目采用自定义社区协作许可，使用与贡献请阅读仓库 LICENSE。"],
  "查看项目源码": ["Browse the source", "ソースコードを見る"],
  "在系统浏览器打开": ["Open in your browser", "外部ブラウザーで開く"],
  "社区链接无效。": ["Invalid community link.", "コミュニティのリンクが無効です。"],
  " · {v0} 份本地文件": [
    " · {v0} local files",
    " · ローカルファイル {v0} 件"
  ],
  " · 别名：{v0}": [
    " · Aliases: {v0}",
    " · 別名：{v0}"
  ],
  " · 大小待确认": [
    " · Size unknown",
    " · サイズ未確認"
  ],
  " · 已选择": [
    " · Selected",
    " · 選択中"
  ],
  " · 最后采样 {v0}": [
    " · Last sample {v0}",
    " · 最終計測 {v0}"
  ],
  "5053741 或 https://…": [
    "5053741 or https://…",
    "5053741 または https://…"
  ],
  "BOOTH 商品支持，但未发现本地文件": [
    "Supported on BOOTH; no local file found",
    "BOOTH では対応していますが、ローカルファイルは未検出です"
  ],
  "BOOTH 商品适配：": [
    "BOOTH compatibility: ",
    "BOOTH の対応モデル："
  ],
  "BOOTH 搜索：{v0}": [
    "Search BOOTH: {v0}",
    "BOOTH で検索：{v0}"
  ],
  "BOOTH 本商品分类：": [
    "BOOTH product category: ",
    "BOOTH の商品カテゴリ："
  ],
  "BOOTH 状态暂时无法读取": [
    "Unable to load BOOTH status",
    "BOOTH の状態を取得できません"
  ],
  "BOOTH 网页保留限速，封面和不同任务可并发。": [
    "BOOTH page requests stay rate limited; covers and separate tasks can run concurrently.",
    "BOOTH ページのアクセス間隔を保ちつつ、表紙と別のタスクを並行処理します。"
  ],
  "BOOTH 账号与下载": [
    "BOOTH account & downloads",
    "BOOTH アカウント・ダウンロード"
  ],
  "Unity 工程": [
    "Unity project",
    "Unity プロジェクト"
  ],
  "Unity 素材包": [
    "Unity package",
    "Unity パッケージ"
  ],
  "VRC 素材库": [
    "VRC Asset Library",
    "VRC素材ライブラリ"
  ],
  "{v0} 下载进度": [
    "Download progress: {v0}",
    "ダウンロード状況：{v0}"
  ],
  "{v0} 个正在下载": [
    "{v0} downloading",
    "{v0} 件をダウンロード中"
  ],
  "{v0} 个请求处理中 · {v1} 个任务待完成": [
    "{v0} active requests · {v1} tasks pending",
    "{v0} 件のリクエストを処理中 · 残り {v1} タスク"
  ],
  "{v0} 份本地文件": [
    "{v0} local files",
    "ローカルファイル {v0} 件"
  ],
  "{v0} 商品封面": [
    "Product cover: {v0}",
    "{v0} の商品画像"
  ],
  "{v0} 封面": [
    "Cover: {v0}",
    "{v0} の表紙"
  ],
  "{v0} 条已保留的记录": [
    "{v0} saved records",
    "保存済みの記録 {v0} 件"
  ],
  "{v0} 毫秒": [
    "{v0} ms",
    "{v0} ミリ秒"
  ],
  "{v0} 的候选商品": [
    "Candidates for {v0}",
    "{v0} の候補商品"
  ],
  "{v0} 秒": [
    "{v0} s",
    "{v0} 秒"
  ],
  "{v0} 项": [
    "{v0} items",
    "{v0} 件"
  ],
  "· 峰值": [
    "· Peak",
    "· ピーク"
  ],
  "· 已补全": [
    "· Enriched",
    "· 取得済み"
  ],
  "· 平均": [
    "· Average",
    "· 平均"
  ],
  "· 规则": [
    "· Rule",
    "· ルール"
  ],
  "‹ 返回工程：": [
    "‹ Back to project: ",
    "‹ プロジェクトに戻る："
  ],
  "」使用或对应的条目。共选": [
    "” with related assets. Selected:",
    "」に関連する素材を選択します。選択数："
  ],
  "」及其集合关联。": [
    "” and its collection memberships.",
    "」とコレクションの関連付け。"
  ],
  "上一页": [
    "Previous page",
    "前のページ"
  ],
  "上一项素材": [
    "Previous asset",
    "前の素材"
  ],
  "上传": [
    "Upload",
    "アップロード"
  ],
  "上传仅计请求正文，素材文件不会上传": [
    "Upload counts request bodies only; asset files stay local.",
    "アップロード量はリクエスト本文のみです。素材ファイルは送信しません。"
  ],
  "上次下载轨迹": [
    "Previous download activity",
    "前回のダウンロード履歴"
  ],
  "下一页": [
    "Next page",
    "次のページ"
  ],
  "下一项素材": [
    "Next asset",
    "次の素材"
  ],
  "下载": [
    "Download",
    "ダウンロード"
  ],
  "下载与上传速度": [
    "Download & upload speed",
    "ダウンロード・アップロード速度"
  ],
  "下载完成 ·": [
    "Downloaded ·",
    "ダウンロード完了 ·"
  ],
  "下载并发任务数": [
    "Concurrent downloads",
    "同時ダウンロード数"
  ],
  "下载记录": [
    "Download history",
    "ダウンロード履歴"
  ],
  "下载记录筛选": [
    "Filter download history",
    "ダウンロード履歴の絞り込み"
  ],
  "下载进度 {v0}": [
    "Download progress: {v0}",
    "ダウンロード状況：{v0}"
  ],
  "下载面板": [
    "Downloads",
    "ダウンロード"
  ],
  "不会上传素材包或 Unity 工程。自动匹配有歧义时，交给你确认。": [
    "Asset packages and Unity projects stay local. Ambiguous matches await your confirmation.",
    "素材パッケージや Unity プロジェクトは送信しません。曖昧な候補は手動で確認できます。"
  ],
  "不足 1 秒": [
    "Less than 1 second",
    "1 秒未満"
  ],
  "个": [
    "items",
    "件"
  ],
  "个商品支持": [
    "supported products",
    "件の商品対応"
  ],
  "个工程条目 ·": [
    "project entries ·",
    "件のプロジェクト項目 ·"
  ],
  "个待完成": [
    "pending",
    "件待機中"
  ],
  "个待确认素材 · 每页 10 行": [
    "assets to review · 10 per page",
    "件の確認待ち素材 · 1 ページ 10 件"
  ],
  "个所选素材中移除勾选标签，保留其他标签。": [
    "selected assets; other tags are retained.",
    "件の素材から選択したタグを削除します。他のタグは保持されます。"
  ],
  "个所选素材使用": [
    "selected assets use",
    "件の素材が使用中"
  ],
  "个所选素材加入以下集合，可以同时加入多个。": [
    "selected assets to the collections below. You can choose more than one.",
    "件の素材を以下のコレクションに追加します。複数選択できます。"
  ],
  "个本地 ·": [
    "local ·",
    "件のローカル対応 ·"
  ],
  "个条目的": [
    "items:",
    "件の項目の"
  ],
  "个标签，合并后保留素材与集合关联。": [
    "tags. Asset and collection relationships are retained.",
    "件のタグ。統合後も素材とコレクションの関連付けを保持します。"
  ],
  "个素材处理中 ·": [
    "assets processing ·",
    "件の素材を処理中 ·"
  ],
  "个素材未找到商品来源。": [
    "assets still have no product source.",
    "件の素材で商品リンクが見つかっていません。"
  ],
  "主题设置": [
    "Theme settings",
    "テーマ設定"
  ],
  "人工提供": [
    "User provided",
    "手動登録"
  ],
  "人工提供链接": [
    "User-provided link",
    "手動登録のリンク"
  ],
  "人工登记来源": [
    "Manually registered source",
    "手動登録した出典"
  ],
  "人工确认": [
    "Manually confirmed",
    "手動確認済み"
  ],
  "仅下载商品网页和封面图片，不下载付费素材包。": [
    "Downloads include product pages and cover images only, excluding paid asset packages.",
    "商品ページと表紙画像のみを取得します。有料素材パッケージはダウンロードしません。"
  ],
  "从你的素材文件夹开始": [
    "Start with your asset folder",
    "素材フォルダーから始めましょう"
  ],
  "从集合移除": [
    "Remove from collection",
    "コレクションから削除"
  ],
  "代理已配置，待检查": [
    "Proxy configured; check pending",
    "プロキシ設定済み・未確認"
  ],
  "代理连接正常": [
    "Proxy connected",
    "プロキシ接続は正常です"
  ],
  "任务正在匹配资料，等待下一次请求": [
    "Matching metadata; waiting for the next request",
    "情報を照合中です。次のリクエストを待っています"
  ],
  "份": [
    "files",
    "件"
  ],
  "作者": [
    "Author",
    "作者"
  ],
  "作者信息待核对": [
    "Author not yet verified",
    "作者情報は未確認です"
  ],
  "作者：": [
    "Author: ",
    "作者："
  ],
  "你手动确认的本地适配": [
    "Local compatibility you confirmed",
    "手動で確認したローカル対応"
  ],
  "你的创作，从这里开始": [
    "Your creativity starts here",
    "ここから始まる、あなたの創作"
  ],
  "使用{v0}主题": [
    "Use {v0} theme",
    "{v0} テーマを使用"
  ],
  "使用此商品": [
    "Use this product",
    "この商品を使用"
  ],
  "使用系统代理设置；连接状态通过实际网页请求检查。": [
    "Uses system proxy settings. Connectivity is checked with a real page request.",
    "システムのプロキシ設定を使用し、実際のページリクエストで接続を確認します。"
  ],
  "保存": [
    "Save",
    "保存"
  ],
  "保存别名": [
    "Save aliases",
    "別名を保存"
  ],
  "保存后读取商品标题、封面和适配信息。": [
    "Fetches product title, cover and compatibility after saving.",
    "保存後に商品名・表紙・対応情報を取得します。"
  ],
  "保存当前筛选": [
    "Save current filters",
    "現在の絞り込みを保存"
  ],
  "保存标注": [
    "Save annotations",
    "メモを保存"
  ],
  "保存筛选为智能视图": [
    "Save filters as smart view",
    "絞り込みをスマートビューとして保存"
  ],
  "保存筛选条件，符合条件的新素材会自动出现在此视图。": [
    "Save these filters. New matching assets appear here automatically.",
    "絞り込み条件を保存します。条件に合う新しい素材が自動で表示されます。"
  ],
  "保留最后一段实际下载记录": [
    "Last measured download activity retained",
    "最後の実測ダウンロード履歴を表示"
  ],
  "信息与标注": [
    "Info & annotations",
    "情報・メモ"
  ],
  "修改分类": [
    "Change category",
    "カテゴリを変更"
  ],
  "修改来源": [
    "Change source",
    "出典を変更"
  ],
  "修改素材分类": [
    "Change asset category",
    "素材カテゴリを変更"
  ],
  "候选商品暂时无法读取": [
    "Unable to load product candidates",
    "候補商品を読み込めません"
  ],
  "候选封面已加入下载队列": [
    "Candidate covers queued for download",
    "候補画像をダウンロード待ちに追加しました"
  ],
  "候选按匹配线索排序，点击封面即可确认，也可先预览介绍。": [
    "Candidates are ordered by matching evidence. Select a cover to confirm, or preview the description first.",
    "候補は一致する手がかり順です。表紙を押して確定するか、先に説明を確認できます。"
  ],
  "停止扫描": [
    "Stop scan",
    "スキャンを停止"
  ],
  "先前来源：": [
    "Previous source: ",
    "以前の出典："
  ],
  "入库": [
    "Added",
    "登録"
  ],
  "入库时间：最新": [
    "Added: newest first",
    "登録日時：新しい順"
  ],
  "入库时间：最早": [
    "Added: oldest first",
    "登録日時：古い順"
  ],
  "全部": [
    "All",
    "すべて"
  ],
  "全部分组": [
    "All groups",
    "すべてのグループ"
  ],
  "全部本地适配": [
    "All local avatars",
    "すべてのローカル対応モデル"
  ],
  "全部标签": [
    "All tags",
    "すべてのタグ"
  ],
  "全部状态": [
    "All statuses",
    "すべての状態"
  ],
  "全部素材": [
    "All assets",
    "すべての素材"
  ],
  "全部记录": [
    "All records",
    "すべての記録"
  ],
  "共": [
    "Total",
    "合計"
  ],
  "共 {v0} 个条目": [
    "{v0} items",
    "全 {v0} 件"
  ],
  "关联「": [
    "Link “",
    "「"
  ],
  "关联已保存": [
    "Links saved",
    "関連付けを保存しました"
  ],
  "关联素材": [
    "Related assets",
    "関連素材"
  ],
  "关闭下载面板": [
    "Close downloads",
    "ダウンロードを閉じる"
  ],
  "关闭弹窗": [
    "Close dialog",
    "ダイアログを閉じる"
  ],
  "关闭提示": [
    "Dismiss notification",
    "通知を閉じる"
  ],
  "关闭筛选": [
    "Close filters",
    "絞り込みを閉じる"
  ],
  "内容密度": [
    "Display density",
    "表示密度"
  ],
  "内置网页已打开": [
    "Built-in browser opened",
    "内蔵ブラウザーを開きました"
  ],
  "分类": [
    "Category",
    "カテゴリ"
  ],
  "分类已更新": [
    "Category updated",
    "カテゴリを更新しました"
  ],
  "分组": [
    "Group",
    "グループ"
  ],
  "列表已截断；可打开文件夹查看完整内容。": [
    "List truncated. Open the folder to see all files.",
    "一覧を省略しています。すべてのファイルはフォルダーから確認できます。"
  ],
  "列表视图": [
    "List view",
    "リスト表示"
  ],
  "刚刚完成": [
    "Just completed",
    "完了したばかり"
  ],
  "刚刚开始": [
    "Just started",
    "開始したばかり"
  ],
  "刚刚确认的来源": [
    "Recently confirmed source",
    "直前に確認した出典"
  ],
  "别名": [
    "Aliases",
    "別名"
  ],
  "别名用于搜索，不修改素材文件名称。": [
    "Aliases improve search without changing file names.",
    "別名は検索に使用します。素材ファイル名は変更しません。"
  ],
  "制作中": [
    "In progress",
    "制作中"
  ],
  "刷新工程素材": [
    "Refresh project assets",
    "プロジェクト素材を更新"
  ],
  "刷新待确认列表": [
    "Refresh review list",
    "確認待ち一覧を更新"
  ],
  "刷新素材": [
    "Refresh assets",
    "素材を更新"
  ],
  "前往匹配确认": [
    "Go to match review",
    "照合確認へ"
  ],
  "加入手工集合": [
    "Add to manual collection",
    "手動コレクションに追加"
  ],
  "加入集合": [
    "Add to collection",
    "コレクションに追加"
  ],
  "加载候选封面": [
    "Load candidate covers",
    "候補の表紙を読み込む"
  ],
  "加载更多 · 已显示 {v0} / {v1}": [
    "Load more · Showing {v0} / {v1}",
    "さらに読み込む · {v0} / {v1} 件表示"
  ],
  "加载本页预览图": [
    "Load previews on this page",
    "このページの画像を読み込む"
  ],
  "匹配确认": [
    "Match review",
    "照合確認"
  ],
  "匹配确认排序": [
    "Review sort order",
    "照合確認の並び順"
  ],
  "单独设置的封面，已保留": [
    "Custom cover retained",
    "個別に設定した表紙を保持しています"
  ],
  "历史峰值": [
    "Peak speed",
    "過去の最高速度"
  ],
  "压缩包": [
    "Archive",
    "圧縮ファイル"
  ],
  "压缩包内名称": [
    "Name inside archive",
    "圧縮ファイル内の名前"
  ],
  "原关联素材": [
    "Previous linked assets",
    "元の関連素材"
  ],
  "原分类": [
    "Previous category",
    "元のカテゴリ"
  ],
  "原备注": [
    "Previous notes",
    "元のメモ"
  ],
  "原封面": [
    "Previous cover",
    "元の表紙"
  ],
  "原工程状态": [
    "Previous project status",
    "元のプロジェクト状態"
  ],
  "原手动适配": [
    "Previous manual compatibility",
    "元の手動対応情報"
  ],
  "原收藏状态": [
    "Previous favorite status",
    "元のお気に入り状態"
  ],
  "原文件暂时无法找到；你的标注仍然保留。": [
    "Original file unavailable; your annotations are retained.",
    "元のファイルが見つかりません。メモは保持されています。"
  ],
  "原显示名称": [
    "Previous display name",
    "元の表示名"
  ],
  "原标签": [
    "Previous tags",
    "元のタグ"
  ],
  "原素材、其他集合和人工标注会保留。可通过“撤销上次整理”恢复。": [
    "Original assets, other collections and annotations are retained. Use Undo organization to restore.",
    "元の素材・他のコレクション・手動メモは保持します。「整理を元に戻す」で復元できます。"
  ],
  "原素材只读": [
    "Original assets are read-only",
    "元の素材は読み取り専用"
  ],
  "原素材文件暂时无法找到": [
    "Original asset file unavailable",
    "元の素材ファイルが見つかりません"
  ],
  "原素材继续保存在原来的位置。": [
    "Original assets remain in their current locations.",
    "元の素材は元の場所に保持されます。"
  ],
  "原记录保留，可以检查资料库位置、重新读取或从备份恢复。": [
    "Original records are retained. Check the library location, reload or restore a backup.",
    "元の記録は保持されています。保存先の確認、再読み込み、バックアップの復元ができます。"
  ],
  "取消": [
    "Cancel",
    "キャンセル"
  ],
  "取消下载": [
    "Cancel download",
    "ダウンロードを中止"
  ],
  "取消收藏": [
    "Remove favorite",
    "お気に入りから削除"
  ],
  "取消选择": [
    "Clear selection",
    "選択を解除"
  ],
  "只从": [
    "Only from",
    "次の対象のみ："
  ],
  "只看未添加标签的素材": [
    "Only untagged assets",
    "タグのない素材のみ"
  ],
  "只计算本应用请求正文，素材不会上传": [
    "Counts this app’s request bodies only; assets stay local.",
    "このアプリのリクエスト本文のみ集計します。素材は送信しません。"
  ],
  "只读浏览": [
    "Read-only browsing",
    "読み取り専用で閲覧"
  ],
  "可以继续下一页；需要重新排序时，点击刷新待确认列表。": [
    "Continue to the next page. Refresh the review list to reorder.",
    "次のページに進めます。並び替えるには確認待ち一覧を更新してください。"
  ],
  "可选中文字并复制此路径。": [
    "Select and copy this path.",
    "このパスは選択してコピーできます。"
  ],
  "合并展示的本地文件": [
    "Grouped local files",
    "まとめて表示するローカルファイル"
  ],
  "合并所选标签": [
    "Merge selected tags",
    "選択したタグを統合"
  ],
  "合并标签": [
    "Merge tags",
    "タグを統合"
  ],
  "合并目标标签": [
    "Target tag",
    "統合先のタグ"
  ],
  "合并素材使用本地文件中最新的修改时间。": [
    "Grouped assets use the latest local file modification time.",
    "統合素材にはローカルファイルの最新の更新日時を使用します。"
  ],
  "同一素材集中展示，文件仍保存在原来的位置。": [
    "Versions are grouped for display; files remain in their original locations.",
    "同じ素材をまとめて表示します。ファイルは元の場所に保持されます。"
  ],
  "名称排序": [
    "Name",
    "名前順"
  ],
  "名称识别可能不完整。": ["Name detection may be incomplete.", "名前の検出結果は不完全な場合があります。"],
  "名称识别可能不完整。灰色表示尚无本地证据，不代表确定缺少该版本。": [
    "Name detection may be incomplete. Gray means no local evidence, rather than confirmed absence.",
    "名前の検出は不完全な場合があります。灰色はローカルの根拠が未検出で、欠落が確定した意味ではありません。"
  ],
  "名称：A–Z": [
    "Name: A–Z",
    "名前：A–Z"
  ],
  "启用在线补全": [
    "Enable online enrichment",
    "オンライン情報取得を有効化"
  ],
  "启用联网": [
    "Enable online access",
    "オンライン接続を有効化"
  ],
  "命中缓存": [
    "Cache hit",
    "キャッシュを使用"
  ],
  "命中：": [
    "Match: ",
    "一致："
  ],
  "商品": [
    "Product",
    "商品"
  ],
  "商品作者或店铺": [
    "Product author or shop",
    "商品の作者またはショップ"
  ],
  "商品匹配依据": [
    "Source matching evidence",
    "商品照合の根拠"
  ],
  "商品支持，尚未发现本地版本": [
    "Product supported; no local version found",
    "商品は対応していますが、ローカル版は未検出です"
  ],
  "商品暂无封面": [
    "No product cover",
    "商品画像がありません"
  ],
  "商品来源": [
    "Product source",
    "商品の出典"
  ],
  "商品来源已确认": [
    "Product source confirmed",
    "商品の出典を確認しました"
  ],
  "商品网址": [
    "Product URL",
    "商品 URL"
  ],
  "商品网址或 BOOTH 编号": [
    "Product URL or BOOTH ID",
    "商品 URL または BOOTH 番号"
  ],
  "商品网址或 BOOTH 编号：{v0}": [
    "Product URL or BOOTH ID: {v0}",
    "商品 URL または BOOTH 番号：{v0}"
  ],
  "回到素材库选择素材，再加入此集合。": [
    "Select assets in the library, then add them to this collection.",
    "素材ライブラリで素材を選び、このコレクションに追加してください。"
  ],
  "在 BOOTH 中查找": [
    "Find on BOOTH",
    "BOOTH で探す"
  ],
  "在匹配确认中跳过自动匹配的素材会保留在这里，可以自行标注或恢复自动匹配。": [
    "Assets skipped during match review remain here. Add annotations or restore automatic matching.",
    "照合確認でスキップした素材を保持します。手動でメモするか、自動照合に戻せます。"
  ],
  "在线补全": [
    "Enrich online",
    "オンライン取得"
  ],
  "在线补全选项": [
    "Online enrichment options",
    "オンライン取得のオプション"
  ],
  "备份与恢复": [
    "Backup & restore",
    "バックアップ・復元"
  ],
  "备份已保存：{v0}": [
    "Backup saved: {v0}",
    "バックアップを保存しました：{v0}"
  ],
  "备份整理信息和封面；不包含原素材。备份位置由你选择。": [
    "Backs up organization data and covers, excluding original assets. Choose your backup location.",
    "整理情報と表紙をバックアップします。元の素材は含みません。保存先を選択できます。"
  ],
  "备注": [
    "Notes",
    "メモ"
  ],
  "复制": [
    "Copy",
    "コピー"
  ],
  "复制路径": [
    "Copy path",
    "パスをコピー"
  ],
  "失败": [
    "Failed",
    "失敗"
  ],
  "失败 ·": [
    "Failed ·",
    "失敗 ·"
  ],
  "如：Shinra 服装，待确认的素材": [
    "e.g. Shinra outfits, assets to review",
    "例：Shinra の衣装、確認待ちの素材"
  ],
  "如：日常服装": [
    "e.g. Casual outfits",
    "例：普段着"
  ],
  "如：日常，收藏搭配，待试穿": [
    "e.g. casual, favorite outfits, to try",
    "例：日常、お気に入りコーデ、試着待ち"
  ],
  "如：春季搭配，直播用素材": [
    "e.g. Spring outfits, streaming assets",
    "例：春のコーデ、配信用素材"
  ],
  "完成": [
    "Done",
    "完了"
  ],
  "完成后仍可查看文件大小、平均速度和耗时。最多保留最近 100 条记录；点击记录打开来源。": [
    "File size, average speed and duration remain available after completion. Keeps the latest 100 records; select one to open its source.",
    "完了後もサイズ・平均速度・所要時間を確認できます。最新 100 件を保持し、選択すると出典を開きます。"
  ],
  "完整显示封面": [
    "Fit entire cover",
    "表紙全体を表示"
  ],
  "官方名称：": [
    "Official name: ",
    "公式名称："
  ],
  "宽松": [
    "Spacious",
    "ゆったり"
  ],
  "对应素材名称：": [
    "Matching asset name: ",
    "対応する素材名："
  ],
  "导出备份": [
    "Export backup",
    "バックアップを書き出す"
  ],
  "封面": [
    "Cover",
    "表紙"
  ],
  "封面填满画框": [
    "Fill cover frame",
    "枠いっぱいに表示"
  ],
  "封面待加载": [
    "Cover not loaded",
    "表紙は未読み込みです"
  ],
  "封面暂不可用": [
    "Cover unavailable",
    "表紙を表示できません"
  ],
  "将": [
    "Add",
    "追加"
  ],
  "将更新": [
    "Update",
    "更新対象："
  ],
  "将素材包、解压目录和使用它们的工程联系起来。": [
    "Link packages, extracted folders and the projects that use them.",
    "素材パッケージ・展開先フォルダー・使用するプロジェクトを関連付けます。"
  ],
  "尚无可展示的工程文件线索。": [
    "No project file evidence available.",
    "表示できるプロジェクトファイルの手がかりがありません。"
  ],
  "尚无封面": [
    "No cover",
    "表紙なし"
  ],
  "尚无手工集合，先在侧栏新建一个。": [
    "No manual collections yet. Create one in the sidebar.",
    "手動コレクションはまだありません。サイドバーで作成してください。"
  ],
  "尚无识别依据": [
    "No evidence yet",
    "根拠なし"
  ],
  "尚有": [
    "Remaining:",
    "残り"
  ],
  "尚未发现本地版本": [
    "No local version found",
    "ローカル版は未検出"
  ],
  "尚未找到与已有素材对应的文件名称，可以手动关联。": [
    "No file names matched existing assets. You can link them manually.",
    "既存の素材に一致するファイル名が見つかりません。手動で関連付けできます。"
  ],
  "尚未获取": [
    "Not fetched yet",
    "未取得"
  ],
  "尚未识别": [
    "Not identified yet",
    "未検出"
  ],
  "尚未识别到适配名称，可以在下方手动确认。": [
    "No compatible avatar names identified. You can confirm them below.",
    "対応モデル名は未検出です。下で手動確認できます。"
  ],
  "尚未识别，可先核对商品说明": [
    "Not identified; check the product description",
    "未検出です。商品説明を確認してください"
  ],
  "尚未选择下载位置": [
    "No download location selected",
    "ダウンロード先が未設定です"
  ],
  "展开详情": [
    "Show details",
    "詳細を表示"
  ],
  "展示方式": [
    "View mode",
    "表示方法"
  ],
  "工程与成品": [
    "Projects & creations",
    "プロジェクト・完成品"
  ],
  "工程内素材": [
    "Project assets",
    "プロジェクト内の素材"
  ],
  "工程制作中": [
    "Project in progress",
    "制作中のプロジェクト"
  ],
  "工程已完成": [
    "Completed project",
    "完成したプロジェクト"
  ],
  "工程文件线索 ·": [
    "Project file evidence ·",
    "プロジェクトファイルの手がかり ·"
  ],
  "工程状态": [
    "Project status",
    "プロジェクトの状態"
  ],
  "工程状态已更新": [
    "Project status updated",
    "プロジェクトの状態を更新しました"
  ],
  "工程素材暂时无法读取，请重试。": [
    "Unable to load project assets. Please retry.",
    "プロジェクト素材を読み込めません。再試行してください。"
  ],
  "工程素材读取未完成：": [
    "Project assets could not be loaded: ",
    "プロジェクト素材の読み込みに失敗しました："
  ],
  "工程较大，本次扫描已达到上限；当前结果未覆盖整个工程。": [
    "Scan limit reached for this large project. Results cover only part of the project.",
    "大きなプロジェクトのため、スキャン上限に達しました。結果は一部のみです。"
  ],
  "已从集合移除，原素材保持原样": [
    "Removed from collection; original assets unchanged",
    "コレクションから削除しました。元の素材は保持されています"
  ],
  "已加入补全队列": [
    "Added to enrichment queue",
    "情報取得キューに追加しました"
  ],
  "已匹配": [
    "Matched",
    "照合済み"
  ],
  "已取消收藏": [
    "Removed from favorites",
    "お気に入りから削除しました"
  ],
  "已完成": [
    "Completed",
    "完成"
  ],
  "已恢复排除记录，可重新匹配": [
    "Excluded candidates restored; matching can resume",
    "除外した候補を復元しました。再照合できます"
  ],
  "已恢复自动匹配": [
    "Automatic matching restored",
    "自動照合に戻しました"
  ],
  "已排队，等待站点限速窗口": [
    "Queued; waiting for site rate limit",
    "待機中です。サイトのアクセス間隔を待っています"
  ],
  "已排除此商品": [
    "Product excluded",
    "この商品を除外しました"
  ],
  "已撤回「{v0}」的来源": [
    "Source undone for “{v0}”",
    "「{v0}」の出典確認を元に戻しました"
  ],
  "已撤销上次整理": [
    "Last organization undone",
    "直前の整理を元に戻しました"
  ],
  "已收藏": [
    "Favorited",
    "お気に入り登録済み"
  ],
  "已暂停，下载记录已保留": [
    "Paused; download history retained",
    "一時停止中です。ダウンロード履歴は保持されています"
  ],
  "已有封面": [
    "Has cover",
    "表紙あり"
  ],
  "已有资料没有被删除，可刷新或在设置中查看备份与读取提示。": [
    "Existing data has been retained. Refresh, or check backup and loading notices in Settings.",
    "既存データは保持されています。更新するか、設定でバックアップと読み込み通知を確認してください。"
  ],
  "已核对": [
    "Checked",
    "確認済み"
  ],
  "已添加收藏": [
    "Added to favorites",
    "お気に入りに追加しました"
  ],
  "已清除保存的 BOOTH 登录会话": [
    "Saved BOOTH session cleared",
    "保存した BOOTH ログイン情報を消去しました"
  ],
  "已确认或跳过的商品会从这里移除。点击刷新可查看新的待确认素材。": [
    "Confirmed or skipped products leave this list. Refresh to see new assets awaiting review.",
    "確認済み・スキップ済みの商品は一覧から消えます。更新すると新しい確認待ち素材を表示します。"
  ],
  "已移入手动归类": [
    "Moved to manual organization",
    "手動整理に移動しました"
  ],
  "已移入手动归类，不再自动匹配": [
    "Moved to manual organization; automatic matching disabled",
    "手動整理に移動し、自動照合を無効にしました"
  ],
  "已缓存": [
    "Cached",
    "キャッシュ済み"
  ],
  "已补全素材": [
    "Enriched assets",
    "情報取得済みの素材"
  ],
  "已选": [
    "Selected",
    "選択中"
  ],
  "已选择 {v0} 个条目": [
    "{v0} items selected",
    "{v0} 件を選択中"
  ],
  "平均": [
    "Average",
    "平均"
  ],
  "平均 ↓ {v0}/s": [
    "Average ↓ {v0}/s",
    "平均 ↓ {v0}/s"
  ],
  "并发任务数": [
    "Concurrent tasks",
    "同時タスク数"
  ],
  "开始下载前，请先选择素材下载位置。": [
    "Choose an asset download location before downloading.",
    "ダウンロード前に素材の保存先を選択してください。"
  ],
  "开始扫描": [
    "Start scan",
    "スキャンを開始"
  ],
  "当前 0 B/s": [
    "Current: 0 B/s",
    "現在 0 B/s"
  ],
  "当前上传": [
    "Current upload",
    "現在のアップロード"
  ],
  "当前上传 ↑": [
    "Upload now ↑",
    "現在のアップロード ↑"
  ],
  "当前下载": [
    "Current download",
    "現在のダウンロード"
  ],
  "当前下载 ↓": [
    "Download now ↓",
    "現在のダウンロード ↓"
  ],
  "当前展示保留自上次来源，新来源尚未补全": [
    "Showing data retained from the previous source; new source not yet fetched",
    "以前の出典の情報を表示しています。新しい出典は未取得です"
  ],
  "当前并发下载": [
    "Active concurrent downloads",
    "現在の同時ダウンロード"
  ],
  "当前空闲": [
    "Idle",
    "待機中"
  ],
  "当前请求": [
    "Active requests",
    "現在のリクエスト"
  ],
  "待确认": [
    "Needs review",
    "確認待ち"
  ],
  "待补全": [
    "Awaiting enrichment",
    "情報取得待ち"
  ],
  "总大小未知": [
    "Total size unknown",
    "合計サイズ不明"
  ],
  "恢复备份（合并）": [
    "Restore backup (merge)",
    "バックアップを復元（統合）"
  ],
  "恢复已排除 ·": [
    "Restore excluded ·",
    "除外を解除 ·"
  ],
  "恢复自动匹配": [
    "Restore automatic matching",
    "自動照合に戻す"
  ],
  "我的收藏": [
    "Favorites",
    "お気に入り"
  ],
  "我的标注": [
    "My annotations",
    "自分のメモ"
  ],
  "我的资料库": [
    "My library",
    "マイライブラリ"
  ],
  "我确认的适配模型": [
    "Avatars I confirmed",
    "手動確認した対応モデル"
  ],
  "所选素材已加入重新匹配队列": [
    "Selected assets queued for matching",
    "選択した素材を再照合キューに追加しました"
  ],
  "所选素材已加入集合": [
    "Selected assets added to collections",
    "選択した素材をコレクションに追加しました"
  ],
  "手动关联素材": [
    "Link assets manually",
    "素材を手動で関連付け"
  ],
  "手动归类": [
    "Manual organization",
    "手動整理"
  ],
  "手动确认": [
    "Manually confirmed",
    "手動確認"
  ],
  "手动确认本地包含的模型，用逗号分隔": [
    "Confirm local avatar names, separated by commas",
    "ローカルにあるモデル名をカンマ区切りで入力"
  ],
  "手工集合记录素材的关联，同一素材可加入多个集合。": [
    "Manual collections organize asset links. An asset can belong to several collections.",
    "手動コレクションに素材を関連付けます。同じ素材を複数のコレクションに追加できます。"
  ],
  "打开商品页面": [
    "Open product page",
    "商品ページを開く"
  ],
  "打开已购资料库或礼物页面，点击可下载文件。完成后可直接查看素材。": [
    "Open purchases or gifts and select a downloadable file. View the asset when it finishes.",
    "購入済みライブラリやギフトページでファイルをダウンロードできます。完了後は素材を直接開けます。"
  ],
  "打开所在文件夹": [
    "Open containing folder",
    "保存先フォルダーを開く"
  ],
  "打开文件位置": [
    "Show file location",
    "ファイルの場所を開く"
  ],
  "打开路径": [
    "Open location",
    "場所を開く"
  ],
  "打开路径或复制路径": [
    "Open or copy path",
    "パスを開く・コピー"
  ],
  "打开集合 {v0}": [
    "Open collection {v0}",
    "コレクションを開く：{v0}"
  ],
  "扫描中": [
    "Scanning",
    "スキャン中"
  ],
  "扫描你的素材目录，自动发现素材包和 Unity 工程。原文件保持原样。": [
    "Scan your folders to discover asset packages and Unity projects. Original files are retained.",
    "フォルダーをスキャンして素材と Unity プロジェクトを検出します。元のファイルは保持されます。"
  ],
  "扫描此位置。原素材和工程保持原样。": [
    "Scans this location and its subfolders. Original assets and projects are retained.",
    "この場所と子フォルダーをスキャンします。元の素材とプロジェクトは保持されます。"
  ],
  "批量标签": [
    "Bulk tags",
    "タグを一括編集"
  ],
  "批量添加标签": [
    "Add tags in bulk",
    "タグを一括追加"
  ],
  "按住 Ctrl 并滚动鼠标滚轮调整整个界面的大小。": [
    "Hold Ctrl and scroll to resize the interface.",
    "Ctrl を押しながらホイールを回すと表示サイズを調整できます。"
  ],
  "按作者筛选": [
    "Filter by author",
    "作者で絞り込み"
  ],
  "按匹配状态筛选": [
    "Filter by match status",
    "照合状態で絞り込み"
  ],
  "按名称、标签与已登记说明检索，不识别模型内部或图片文字": [
    "Searches names, tags and saved descriptions; excludes model internals and image text.",
    "名前・タグ・登録済みの説明を検索します。モデル内部や画像内の文字は対象外です。"
  ],
  "按封面筛选": [
    "Filter by cover",
    "表紙で絞り込み"
  ],
  "按标签筛选": [
    "Filter by tag",
    "タグで絞り込み"
  ],
  "排序": [
    "Sort",
    "並び順"
  ],
  "排除此商品": [
    "Exclude product",
    "この商品を除外"
  ],
  "搜索": [
    "Search",
    "検索"
  ],
  "搜索 BOOTH": [
    "Search BOOTH",
    "BOOTH を検索"
  ],
  "搜索关联素材": [
    "Search related assets",
    "関連素材を検索"
  ],
  "搜索名称、作者、标签或适配模型…": [
    "Search names, authors, tags or avatars…",
    "名前・作者・タグ・対応モデルを検索…"
  ],
  "搜索命中依据": [
    "Search match evidence",
    "検索一致の根拠"
  ],
  "搜索和筛选": [
    "Search & filters",
    "検索・絞り込み"
  ],
  "搜索标签": [
    "Search tags",
    "タグを検索"
  ],
  "搜索素材": [
    "Search assets",
    "素材を検索"
  ],
  "搜索素材或工程…": [
    "Search assets or projects…",
    "素材やプロジェクトを検索…"
  ],
  "撤回「{v0}」的上一次来源确认，恢复之前的来源和候选；你的其他标注保留。": [
    "Undo the last source confirmation for “{v0}”, restoring its previous source and candidates. Other annotations are retained.",
    "「{v0}」の直前の出典確認を取り消し、以前の出典と候補を復元します。他のメモは保持します。"
  ],
  "撤回来源": [
    "Undo source",
    "出典確認を元に戻す"
  ],
  "撤回来源：{v0}": [
    "Undo source: {v0}",
    "出典確認を元に戻す：{v0}"
  ],
  "撤销上次整理": [
    "Undo last organization",
    "直前の整理を元に戻す"
  ],
  "撤销整理": [
    "Undo organization",
    "整理を元に戻す"
  ],
  "操作 {v0}": [
    "Actions for {v0}",
    "{v0} の操作"
  ],
  "操作未完成，请稍后重试": [
    "Operation failed. Please try again.",
    "操作を完了できませんでした。再試行してください"
  ],
  "操作本地文件：{v0}": [
    "Local file actions: {v0}",
    "ローカルファイルの操作：{v0}"
  ],
  "收录开始日期": [
    "Added from date",
    "登録開始日"
  ],
  "收录日期从": [
    "Added from",
    "登録日（開始）"
  ],
  "收录日期到": [
    "Added until",
    "登録日（終了）"
  ],
  "收录时间": [
    "Date added",
    "登録日時"
  ],
  "收录结束日期": [
    "Added until date",
    "登録終了日"
  ],
  "收藏": [
    "Favorite",
    "お気に入り"
  ],
  "收起详情": [
    "Hide details",
    "詳細を閉じる"
  ],
  "收起面板": [
    "Collapse panel",
    "パネルを閉じる"
  ],
  "整理信息独立保存": [
    "Organization data saved separately",
    "整理情報は別に保存"
  ],
  "整理信息独立保存 · 不移动、不修改原素材": [
    "Organization data saved separately · Original assets stay unchanged",
    "整理情報は別に保存 · 元の素材は移動・変更しません"
  ],
  "文件": [
    "File",
    "ファイル"
  ],
  "文件修改": [
    "File modified",
    "ファイル更新"
  ],
  "文件修改时间：最新": [
    "Modified: newest first",
    "更新日時：新しい順"
  ],
  "文件修改时间：最早": [
    "Modified: oldest first",
    "更新日時：古い順"
  ],
  "文件修改：": [
    "Modified: ",
    "更新日時："
  ],
  "文件列表": [
    "Files",
    "ファイル一覧"
  ],
  "文件大小": [
    "File size",
    "ファイルサイズ"
  ],
  "文件缺失": [
    "File missing",
    "ファイルなし"
  ],
  "新建手工集合": [
    "New manual collection",
    "手動コレクションを作成"
  ],
  "新建集合": [
    "New collection",
    "コレクションを作成"
  ],
  "是否已登录以 BOOTH 网页为准。应用通过网页保存会话，不保存你输入的密码。": [
    "Login status is shown on BOOTH. The app retains the web session, excluding your password.",
    "ログイン状態は BOOTH ページで確認してください。アプリはセッションを保持しますが、入力したパスワードは保存しません。"
  ],
  "显示名称": [
    "Display name",
    "表示名"
  ],
  "显示大小": [
    "Display size",
    "表示サイズ"
  ],
  "暂停补全": [
    "Pause enrichment",
    "情報取得を一時停止"
  ],
  "暂无可靠候选，可以重新匹配或直接填写商品来源。": [
    "No reliable candidates. Retry matching or enter a product source.",
    "信頼できる候補がありません。再照合するか、商品リンクを直接入力してください。"
  ],
  "暂无封面": [
    "No cover",
    "表紙なし"
  ],
  "暂无手动归类的素材": [
    "No manually organized assets",
    "手動整理の素材はありません"
  ],
  "暂时没有此类记录": [
    "No records of this type",
    "該当する記録はありません"
  ],
  "更多操作": [
    "More actions",
    "その他の操作"
  ],
  "更多筛选": [
    "More filters",
    "詳細な絞り込み"
  ],
  "更换封面": [
    "Change cover",
    "表紙を変更"
  ],
  "更改下载位置": [
    "Change download location",
    "ダウンロード先を変更"
  ],
  "更改保存位置": [
    "Change storage location",
    "保存先を変更"
  ],
  "最新记录": [
    "Latest",
    "最新"
  ],
  "最近 60 秒下载与上传速度变化": [
    "Download and upload speed over the last 60 seconds",
    "直近 60 秒のダウンロード・アップロード速度"
  ],
  "最近 60 秒实测": [
    "Measured over the last 60 seconds",
    "直近 60 秒の実測"
  ],
  "最近 60 秒实际正文流量；当前速度单独显示，历史峰值不会充当当前速度。": [
    "Actual body traffic over the last 60 seconds. Current speed and historical peak are shown separately.",
    "直近 60 秒の実測通信量です。現在の速度と過去の最高速度は個別に表示します。"
  ],
  "最近完成": [
    "Recently completed",
    "最近の完了"
  ],
  "最近更新": [
    "Recently updated",
    "最近の更新"
  ],
  "最近读取与下载": [
    "Recent fetches & downloads",
    "最近の取得・ダウンロード"
  ],
  "未保存": [
    "Unsaved",
    "未保存"
  ],
  "未分组": [
    "Ungrouped",
    "グループなし"
  ],
  "未匹配素材已加入重新匹配队列": [
    "Unmatched assets queued for matching",
    "未照合の素材を再照合キューに追加しました"
  ],
  "未发现本地：": [
    "Not found locally: ",
    "ローカルで未検出："
  ],
  "未填写": [
    "Not provided",
    "未入力"
  ],
  "未找到": [
    "Not found",
    "未検出"
  ],
  "未收藏": [
    "Not favorited",
    "お気に入り未登録"
  ],
  "未标记": [
    "Unmarked",
    "未設定"
  ],
  "未标记状态": [
    "Status not set",
    "状態未設定"
  ],
  "未知": [
    "Unknown",
    "不明"
  ],
  "未选择，导出备份前选择位置": [
    "Not selected; choose before exporting",
    "未設定です。書き出し前に選択してください"
  ],
  "本地": [
    "Local",
    "ローカル"
  ],
  "本地{v0}，尚未获取商品介绍。可查看本地文件或添加商品来源了解用途。": [
    "Local {v0}. No product description fetched yet. Browse local files or add a product source for details.",
    "ローカルの{v0}です。商品説明は未取得です。ファイルを確認するか、出典を追加してください。"
  ],
  "本地信息": [
    "Local info",
    "ローカル情報"
  ],
  "本地文件 ·": [
    "Local files ·",
    "ローカルファイル ·"
  ],
  "本地文件名": [
    "Local file name",
    "ローカルファイル名"
  ],
  "本地文件操作": [
    "Local file actions",
    "ローカルファイルの操作"
  ],
  "本地文件暂时无法找到": [
    "Local file unavailable",
    "ローカルファイルが見つかりません"
  ],
  "本地文件：{v0}": [
    "Local file: {v0}",
    "ローカルファイル：{v0}"
  ],
  "本地素材": [
    "Local asset",
    "ローカル素材"
  ],
  "本地素材文件：{v0}": [
    "Local asset file: {v0}",
    "ローカル素材ファイル：{v0}"
  ],
  "本地适配": [
    "Local compatibility",
    "ローカルの対応モデル"
  ],
  "本地适配待识别": [
    "Local avatars not identified yet",
    "ローカルの対応モデルは未検出"
  ],
  "本地适配模型": [
    "Local compatible avatar",
    "ローカルの対応モデル"
  ],
  "本地适配：": [
    "Local compatibility: ",
    "ローカルの対応モデル："
  ],
  "本次已读取的文件中尚未找到关联；扫描仍有未覆盖的部分。": [
    "No links found in scanned files; some parts of the project remain unscanned.",
    "今回読めたファイルには関連がありません。未スキャンの部分が残っています。"
  ],
  "本页候选封面已加入下载队列": [
    "This page’s candidate covers queued",
    "このページの候補画像をダウンロード待ちに追加しました"
  ],
  "本页已核对完": [
    "Page reviewed",
    "このページの確認が完了しました"
  ],
  "条读取提示，原记录已保留。": [
    "loading notices; original records retained.",
    "件の読み込み通知があります。元の記録は保持されています。"
  ],
  "来源已保存并加入补全队列": [
    "Source saved and queued for enrichment",
    "出典を保存し、情報取得キューに追加しました"
  ],
  "来源已登记并加入补全队列": [
    "Source registered and queued for enrichment",
    "出典を登録し、情報取得キューに追加しました"
  ],
  "来源登记未完成，请重试。": [
    "Unable to register source. Please retry.",
    "出典を登録できませんでした。再試行してください。"
  ],
  "查找尚未匹配的素材": [
    "Find unmatched assets",
    "未照合の素材を探す"
  ],
  "查看名称与分类依据": [
    "View name & category evidence",
    "名前・カテゴリの根拠を表示"
  ],
  "查看工程关联素材：{v0}": [
    "View linked project asset: {v0}",
    "プロジェクトの関連素材を表示：{v0}"
  ],
  "查看已导入素材": [
    "View imported asset",
    "取り込んだ素材を表示"
  ],
  "查看本地识别依据": [
    "View local detection evidence",
    "ローカル検出の根拠を表示"
  ],
  "查看详情": [
    "View details",
    "詳細を表示"
  ],
  "标准": [
    "Standard",
    "標準"
  ],
  "标注已保存": [
    "Annotations saved",
    "メモを保存しました"
  ],
  "标签": [
    "Tags",
    "タグ"
  ],
  "标签、封面与设置保存在独立位置。": [
    "Tags, covers and settings are stored separately.",
    "タグ・表紙・設定は別の場所に保存されます。"
  ],
  "标签别名": [
    "Tag aliases",
    "タグの別名"
  ],
  "标签别名已保存": [
    "Tag aliases saved",
    "タグの別名を保存しました"
  ],
  "标签名称或别名": [
    "Tag name or alias",
    "タグ名または別名"
  ],
  "标签已合并": [
    "Tags merged",
    "タグを統合しました"
  ],
  "标签已添加": [
    "Tags added",
    "タグを追加しました"
  ],
  "标签已移除": [
    "Tags removed",
    "タグを削除しました"
  ],
  "标签管理": [
    "Manage tags",
    "タグ管理"
  ],
  "标记为制作中": [
    "Mark as in progress",
    "制作中に設定"
  ],
  "标记为已完成": [
    "Mark as completed",
    "完成に設定"
  ],
  "根据工程内目录、Prefab 和模型名称核对已有素材，保留你手动登记的关联。文件线索仍需结合工程实际内容确认。": [
    "Matches project folders, Prefabs and model names to existing assets, retaining your manual links. Verify file evidence against the project itself.",
    "フォルダー・Prefab・モデル名を既存の素材と照合し、手動の関連付けも保持します。手がかりは実際のプロジェクト内容と合わせて確認してください。"
  ],
  "桌面连接未就绪，请重新打开应用": [
    "Desktop connection unavailable. Reopen the app.",
    "デスクトップ接続が準備できていません。アプリを開き直してください"
  ],
  "检查中": [
    "Checking",
    "確認中"
  ],
  "检查连接": [
    "Check connection",
    "接続を確認"
  ],
  "正在保存…": [
    "Saving…",
    "保存中…"
  ],
  "正在加入队列…": [
    "Adding to queue…",
    "キューに追加中…"
  ],
  "正在加载…": [
    "Loading…",
    "読み込み中…"
  ],
  "正在导入…": [
    "Importing…",
    "取り込み中…"
  ],
  "正在导入素材…": [
    "Importing assets…",
    "素材を取り込み中…"
  ],
  "正在建立连接": [
    "Connecting",
    "接続中"
  ],
  "正在扫描 · 已找到": [
    "Scanning · Found",
    "スキャン中 · 検出"
  ],
  "正在撤回…": [
    "Undoing…",
    "元に戻しています…"
  ],
  "正在整理你的收藏": [
    "Organizing your library",
    "ライブラリを整理中\r"
  ],
  "正在查找…": [
    "Searching…",
    "検索中…"
  ],
  "正在核对工程文件名称和已有素材…": [
    "Matching project file names to existing assets…",
    "プロジェクトのファイル名と既存の素材を照合中…"
  ],
  "正在检查网络": [
    "Checking network",
    "ネットワークを確認中"
  ],
  "正在登记…": [
    "Registering…",
    "登録中…"
  ],
  "正在读取": [
    "Loading",
    "読み込み中"
  ],
  "正在读取…": [
    "Loading…",
    "読み込み中…"
  ],
  "正在读取下载记录…": [
    "Loading download history…",
    "ダウンロード履歴を読み込み中…"
  ],
  "正在读取待确认素材…": [
    "Loading assets for review…",
    "確認待ちの素材を読み込み中…"
  ],
  "正在读取文件列表…": [
    "Loading file list…",
    "ファイル一覧を読み込み中…"
  ],
  "正在读取素材库": [
    "Loading asset library",
    "素材ライブラリを読み込み中"
  ],
  "此文件原有标注": [
    "Previous file annotations",
    "このファイルの元のメモ"
  ],
  "此时间来自本地文件，不代表商品购买或下载时间。": [
    "Local file time, rather than the purchase or download date.",
    "ローカルファイルの日時です。購入・ダウンロード日時ではありません。"
  ],
  "此条目尚未记录匹配依据，可重新匹配后查看。人工标注会保留。": [
    "No matching evidence recorded yet. Retry matching to view it. Manual annotations are retained.",
    "照合の根拠は未記録です。再照合で確認できます。手動メモは保持されます。"
  ],
  "此素材已加入重新匹配队列": [
    "Asset queued for matching",
    "この素材を再照合キューに追加しました"
  ],
  "此素材首次登记到资料库的时间。": [
    "When this asset was first added to the library.",
    "素材が初めてライブラリに登録された日時です。"
  ],
  "此链接由你提供，仍需要核对是否对应本地素材。": [
    "You provided this link; verify it matches the local asset.",
    "手動登録したリンクです。ローカル素材に対応するか確認してください。"
  ],
  "此项由你手动登记关联。": [
    "You linked this item manually.",
    "手動で関連付けした項目です。"
  ],
  "每次显示最多 80 项；可搜索缩小范围。同一素材文件夹内的同名版本会集中展示。": [
    "Shows up to 80 items. Search to narrow results. Versions with the same name are grouped within each asset folder.",
    "最大 80 件表示します。検索で絞り込めます。同じ素材フォルダー内の同名バージョンはまとめて表示します。"
  ],
  "没有可显示的文件。": [
    "No files to display.",
    "表示できるファイルがありません。"
  ],
  "没有待确认的候选": [
    "No candidates to review",
    "確認待ちの候補はありません"
  ],
  "没有找到可关联的条目。": [
    "No items available to link.",
    "関連付けできる項目が見つかりません。"
  ],
  "没有找到相符的条目": [
    "No matching items",
    "一致する項目はありません"
  ],
  "没有正在下载的请求，完成记录会继续保留": [
    "No active downloads. Completed records are retained.",
    "ダウンロード中のリクエストはありません。完了した記録は保持されます"
  ],
  "没有符合筛选的素材": [
    "No assets match these filters",
    "条件に合う素材はありません"
  ],
  "添加商品来源": [
    "Add product source",
    "商品の出典を追加"
  ],
  "添加工程截图": [
    "Add project screenshot",
    "プロジェクト画像を追加"
  ],
  "添加截图": [
    "Add screenshot",
    "スクリーンショットを追加"
  ],
  "添加收藏": [
    "Add to favorites",
    "お気に入りに追加"
  ],
  "添加来源后，可以自动补充封面和标签。": [
    "Add a source to fetch covers and tags automatically.",
    "出典を追加すると表紙とタグを自動取得できます。"
  ],
  "添加标签": [
    "Add tags",
    "タグを追加"
  ],
  "添加素材文件夹": [
    "Add asset folder",
    "素材フォルダーを追加"
  ],
  "添加素材标签": [
    "Add asset tags",
    "素材のタグを追加"
  ],
  "清空搜索": [
    "Clear search",
    "検索をクリア"
  ],
  "清除更多筛选": [
    "Clear advanced filters",
    "詳細条件をクリア"
  ],
  "清除筛选": [
    "Clear filters",
    "絞り込みをクリア"
  ],
  "灰色表示 BOOTH 支持、但尚未发现本地文件的版本。": [
    "Gray indicates BOOTH-supported versions with no local file detected.",
    "灰色は BOOTH では対応していても、ローカルファイルが未検出の版です。"
  ],
  "点击下方入口打开内置网页": [
    "Choose an entry below to open the browser",
    "下のボタンで内蔵ブラウザーを開く"
  ],
  "点击封面确认商品": [
    "Select cover to confirm product",
    "表紙を押して商品を確定"
  ],
  "点击标签名称编辑别名。": [
    "Select a tag name to edit its aliases.",
    "タグ名を選択して別名を編集してください。"
  ],
  "版本": [
    "Version",
    "バージョン"
  ],
  "状态": [
    "Status",
    "状態"
  ],
  "用逗号分隔": [
    "Separate with commas",
    "カンマ区切り"
  ],
  "用逗号分隔。已有标签会保留。": [
    "Separate with commas. Existing tags are retained.",
    "カンマで区切ってください。既存のタグは保持されます。"
  ],
  "用逗号分隔，如：日常，夏日": [
    "Comma-separated, e.g. casual, summer",
    "カンマ区切り（例：日常、夏）"
  ],
  "由本地文件名称识别": [
    "Detected from local file names",
    "ローカルファイル名から検出"
  ],
  "界面主题": [
    "Theme",
    "テーマ"
  ],
  "界面缩放": [
    "Interface zoom",
    "表示倍率"
  ],
  "登录、查看收藏和已购商品，下载完成后自动加入本地素材库。": [
    "Sign in, browse favorites and purchases. Downloads are added to the local library automatically.",
    "ログインしてお気に入りや購入済み商品を表示します。ダウンロード後は自動で素材ライブラリに追加します。"
  ],
  "登录会话": [
    "Login session",
    "ログインセッション"
  ],
  "登录会话保存在资料库": [
    "Login session saved in library",
    "ログインセッションをライブラリに保存済み"
  ],
  "目录（未统计总大小）": [
    "Folder (total size not calculated)",
    "フォルダー（合計サイズ未集計）"
  ],
  "目标标签": [
    "Target tag",
    "統合先のタグ"
  ],
  "直连正常": [
    "Direct connection available",
    "直接接続は正常です"
  ],
  "相关度": [
    "Relevance",
    "関連度"
  ],
  "确认中…": [
    "Confirming…",
    "確認中…"
  ],
  "确认哪一个商品对应此素材": [
    "Confirm which product matches this asset",
    "この素材に対応する商品を確認"
  ],
  "确认商品：{v0}": [
    "Confirm product: {v0}",
    "商品を確認：{v0}"
  ],
  "确认来源，再开始创作。": [
    "Confirm the source, then create.",
    "出典を確かめて、創作を始めよう。"
  ],
  "移至手动归类": [
    "Move to manual organization",
    "手動整理に移動"
  ],
  "移除「": [
    "Remove “",
    "「"
  ],
  "移除所选标签": [
    "Remove selected tags",
    "選択したタグを削除"
  ],
  "移除标签": [
    "Remove tags",
    "タグを削除"
  ],
  "移除集合": [
    "Remove collection",
    "コレクションを削除"
  ],
  "移除集合 {v0}": [
    "Remove collection {v0}",
    "コレクションを削除：{v0}"
  ],
  "符合保存条件的新素材会自动出现在这里。": [
    "New assets matching the saved filters appear here automatically.",
    "保存した条件に合う新しい素材が自動で表示されます。"
  ],
  "第": [
    "Page",
    "ページ"
  ],
  "等待真实下载数据": [
    "Waiting for measured download data",
    "実測ダウンロードデータを待機中"
  ],
  "等待网络检查": [
    "Awaiting network check",
    "ネットワーク確認待ち"
  ],
  "筛选素材": [
    "Filter assets",
    "素材を絞り込み"
  ],
  "管理关联": [
    "Manage links",
    "関連付けを管理"
  ],
  "粘贴 BOOTH 或其他商品网页的公开 HTTPS 链接。": [
    "Paste a public HTTPS link to BOOTH or another product page.",
    "BOOTH などの商品ページの公開 HTTPS リンクを貼り付けてください。"
  ],
  "粘贴商品链接": [
    "Paste product link",
    "商品リンクを貼り付け"
  ],
  "系统直连，待检查": [
    "System direct connection; check pending",
    "システムの直接接続・未確認"
  ],
  "系统网络设置": [
    "System network settings",
    "システムのネットワーク設定"
  ],
  "素材下载位置": [
    "Asset download location",
    "素材のダウンロード先"
  ],
  "素材介绍": [
    "Asset introduction",
    "素材の紹介"
  ],
  "素材会随着扫描逐步出现在这里。": [
    "Assets appear as the scan progresses.",
    "スキャンが進むと素材が順次表示されます。"
  ],
  "素材位置": [
    "Asset folders",
    "素材の場所"
  ],
  "素材分类": [
    "Asset category",
    "素材カテゴリ"
  ],
  "素材列表": [
    "Asset list",
    "素材リスト"
  ],
  "素材已加入补全队列": [
    "Assets queued for enrichment",
    "素材を情報取得キューに追加しました"
  ],
  "素材库": [
    "Asset library",
    "素材ライブラリ"
  ],
  "素材文件夹": [
    "Asset folder",
    "素材フォルダー"
  ],
  "素材网格": [
    "Asset grid",
    "素材グリッド"
  ],
  "素材详情": [
    "Asset details",
    "素材の詳細"
  ],
  "素材顺序": [
    "Asset order",
    "素材の並び順"
  ],
  "紧凑": [
    "Compact",
    "コンパクト"
  ],
  "累计下载": [
    "Downloaded",
    "合計ダウンロード"
  ],
  "累计下载量": [
    "Total downloaded",
    "合計ダウンロード量"
  ],
  "继续补全": [
    "Resume enrichment",
    "情報取得を再開"
  ],
  "缓存读取 ·": [
    "Cached ·",
    "キャッシュ取得 ·"
  ],
  "网格视图": [
    "Grid view",
    "グリッド表示"
  ],
  "网络与代理": [
    "Network & proxy",
    "ネットワーク・プロキシ"
  ],
  "网络连接正常": [
    "Network available",
    "ネットワーク接続は正常です"
  ],
  "网页": [
    "Web page",
    "ウェブページ"
  ],
  "联网": [
    "Online",
    "オンライン"
  ],
  "联网下载状态": [
    "Online download status",
    "オンライン取得状況"
  ],
  "联网只使用商品检索线索": [
    "Online access uses product search clues only",
    "オンラインでは商品検索の手がかりのみ使用"
  ],
  "联网已关闭": [
    "Offline",
    "オフライン"
  ],
  "联网已关闭。启用后可以登录和浏览 BOOTH 网页。": [
    "Online access is disabled. Enable it to sign in and browse BOOTH.",
    "オンライン接続は無効です。有効にすると BOOTH にログイン・閲覧できます。"
  ],
  "联网补全已暂停": [
    "Online enrichment paused",
    "オンライン情報取得は一時停止中"
  ],
  "自动线索": [
    "Automatic clues",
    "自動取得の手がかり"
  ],
  "自动结果来自商品编号、文件名或本地说明；有歧义时会进入匹配确认。": [
    "Automatic matches use product IDs, file names and local documents. Ambiguous results await review.",
    "商品番号・ファイル名・ローカル説明から自動照合します。曖昧な結果は照合確認に表示します。"
  ],
  "自动联网": [
    "Automatic online access",
    "自動オンライン接続"
  ],
  "自定义标签": [
    "Custom tags",
    "独自のタグ"
  ],
  "补全新发现、等待处理的素材": [
    "Enrich newly found and pending assets",
    "新しく見つかった素材と待機中の素材の情報を取得"
  ],
  "规则": [
    "Rule",
    "ルール"
  ],
  "角色分组": [
    "Avatar group",
    "アバターグループ"
  ],
  "记录使用方式、搭配想法…": [
    "Usage notes, outfit ideas…",
    "使い方やコーデのアイデアを記録…"
  ],
  "记录已保留": [
    "Record retained",
    "記録を保持"
  ],
  "设置与备份": [
    "Settings & backup",
    "設定・バックアップ"
  ],
  "试着更换搜索词或清除筛选条件。": [
    "Try another search term or clear the filters.",
    "検索語を変えるか、絞り込みをクリアしてください。"
  ],
  "该商品来源由你确认；后续补全沿用人工决定。": [
    "You confirmed this source. Future enrichment respects your choice.",
    "手動で確認した出典です。以降の情報取得でもこの選択を使用します。"
  ],
  "请输入有效的 BOOTH 商品编号或 HTTPS 商品网址。": [
    "Enter a valid BOOTH product ID or HTTPS product URL.",
    "有効な BOOTH 商品番号または HTTPS 商品 URL を入力してください。"
  ],
  "请选择 C 盘之外、素材目录之外的文件夹。": [
    "Choose a folder outside drive C: and your asset folders.",
    "C ドライブと素材フォルダー以外の場所を選択してください。"
  ],
  "读取并采用来源": [
    "Fetch & use source",
    "取得してこの出典を使用"
  ],
  "账号与下载": [
    "Account & downloads",
    "アカウント・ダウンロード"
  ],
  "资料库": [
    "Library",
    "ライブラリ"
  ],
  "资料库已恢复": [
    "Library restored",
    "ライブラリを復元しました"
  ],
  "资料库数据": [
    "Library data",
    "ライブラリのデータ"
  ],
  "资料库暂时无法读取": [
    "Library unavailable",
    "ライブラリを読み込めません"
  ],
  "资料库有": [
    "Library has",
    "ライブラリに"
  ],
  "资料库读取提示": [
    "Library loading notices",
    "ライブラリの読み込み通知"
  ],
  "路径已复制": [
    "Path copied",
    "パスをコピーしました"
  ],
  "跳过自动匹配": [
    "Skip automatic matching",
    "自動照合をスキップ"
  ],
  "输入商品名称、作者或编号": [
    "Enter product name, author or ID",
    "商品名・作者・番号を入力"
  ],
  "返回工程：{v0}": [
    "Back to project: {v0}",
    "プロジェクトに戻る：{v0}"
  ],
  "返回素材库": [
    "Back to library",
    "素材ライブラリに戻る"
  ],
  "这个集合暂无素材": [
    "This collection is empty",
    "このコレクションは空です"
  ],
  "这条下载记录尚未登记到素材库，请刷新素材。": [
    "This download is not in the library yet. Refresh assets.",
    "このダウンロードはまだ素材ライブラリに登録されていません。素材を更新してください。"
  ],
  "这条来源撤回记录已经使用或已失效，请查看最新记录。": [
    "This source undo has been used or expired. Check the latest record.",
    "この出典取り消しは使用済みか期限切れです。最新の記録を確認してください。"
  ],
  "这里会保留下载进度和完成记录": [
    "Download progress and history appear here",
    "ダウンロード状況と完了履歴をここに表示します"
  ],
  "进入商品页面后，点击“应用此商品”关联当前素材。": [
    "On the product page, select “Apply this product” to link it to this asset.",
    "商品ページで「この商品を適用」を押すと、この素材に関連付けできます。"
  ],
  "连接未成功": [
    "Connection failed",
    "接続できませんでした"
  ],
  "退出并清除会话": [
    "Sign out & clear session",
    "ログアウトしてセッションを消去"
  ],
  "适配对照": [
    "Compatibility comparison",
    "対応モデルの比較"
  ],
  "选择 C 盘以外的位置，完成后应用会重新启动。原资料库会保留。": [
    "Choose a location outside drive C:. The app restarts after migration; the original library is retained.",
    "C ドライブ以外の場所を選択してください。移行後に再起動します。元のライブラリは保持します。"
  ],
  "选择 {v0}": [
    "Select {v0}",
    "{v0} を選択"
  ],
  "选择下载位置": [
    "Choose download location",
    "ダウンロード先を選択"
  ],
  "选择保存文件夹；网页下载完成后会自动导入，压缩包保持原样。": [
    "Choose a folder. Browser downloads are imported automatically, retaining original archives.",
    "保存先を選択してください。ブラウザーでのダウンロード後に自動取り込みし、圧縮ファイルは保持します。"
  ],
  "选择分类": [
    "Choose category",
    "カテゴリを選択"
  ],
  "选择备份位置": [
    "Choose backup location",
    "バックアップ先を選択"
  ],
  "选择适合你的版式，重启后仍会保留。": [
    "Choose a layout. Your choice is retained after restart.",
    "レイアウトを選択します。再起動後も保持されます。"
  ],
  "逐个核对候选商品": [
    "Review product candidates",
    "候補商品を一つずつ確認"
  ],
  "重命名集合": [
    "Rename collection",
    "コレクション名を変更"
  ],
  "重命名集合 {v0}": [
    "Rename collection {v0}",
    "コレクション名を変更：{v0}"
  ],
  "重新匹配": [
    "Match again",
    "再照合"
  ],
  "重新匹配该素材": [
    "Match this asset again",
    "この素材を再照合"
  ],
  "重新在线匹配": [
    "Match online again",
    "オンラインで再照合"
  ],
  "重新查找所选素材，包含之前未匹配的条目": [
    "Retry matching selected assets, including previous misses",
    "以前一致しなかった項目を含め、選択した素材を再検索"
  ],
  "重新检查待确认、未找到及失败条目，保留已匹配商品。": [
    "Rechecks review, missing and failed items, retaining confirmed matches.",
    "確認待ち・未検出・失敗の項目を再確認します。照合済みの商品は保持します。"
  ],
  "重新读取": [
    "Reload",
    "再読み込み"
  ],
  "重新读取资料库": [
    "Reload library",
    "ライブラリを再読み込み"
  ],
  "重置": [
    "Reset",
    "リセット"
  ],
  "重置为 100%": [
    "Reset to 100%",
    "100% に戻す"
  ],
  "重试导入": [
    "Retry import",
    "取り込みを再試行"
  ],
  "重试未匹配": [
    "Retry unmatched",
    "未照合を再試行"
  ],
  "队列完成 · 当前空闲": [
    "Queue complete · Idle",
    "キュー完了 · 待機中"
  ],
  "集合": [
    "Collection",
    "コレクション"
  ],
  "集合与智能视图": [
    "Collections & smart views",
    "コレクション・スマートビュー"
  ],
  "集合名称": [
    "Collection name",
    "コレクション名"
  ],
  "集合已保存": [
    "Collection saved",
    "コレクションを保存しました"
  ],
  "集合已移除，原素材保持原样": [
    "Collection removed; original assets retained",
    "コレクションを削除しました。元の素材は保持しています"
  ],
  "需重试": [
    "Retry needed",
    "再試行が必要"
  ],
  "页": [
    "pages",
    "ページ"
  ],
  "项": [
    "items",
    "件"
  ],
  "项。": [
    "items.",
    "件。"
  ],
  "项关联": [
    "linked items",
    "件の関連項目"
  ],
  "预览商品": [
    "Preview product",
    "商品をプレビュー"
  ],
  "预览网页": [
    "Preview page",
    "ページをプレビュー"
  ],
  "默认同时处理 3 个素材，可选择 1～6 个。BOOTH 网页保留请求间隔，封面图片可并发下载。": [
    "Processes 3 assets concurrently by default; choose 1–6. BOOTH page requests retain their interval; cover images download concurrently.",
    "既定では 3 素材を同時処理します。1～6 件から選べます。BOOTH ページのアクセス間隔を保ち、表紙は並行取得します。"
  ],
  "，原文件保持原样。": [
    ". Original files are retained.",
    "。元のファイルは保持します。"
  ],
  "NASA 朋克": [
    "NASA Punk",
    "NASA パンク"
  ],
  "瑞士国际主义": [
    "Swiss International",
    "スイス・スタイル"
  ],
  "X 暗色": [
    "X dark",
    "X ダーク"
  ],
  "X 浅色": [
    "X light",
    "X ライト"
  ],
  "航天设备面板 · 暖灰机壳 · 复古铭牌": [
    "Spacecraft panels · Warm gray · Vintage labels",
    "宇宙機器のパネル · 暖かいグレー · レトロな銘板"
  ],
  "十二栏网格 · 大字排版 · 黑白红": [
    "Twelve-column grid · Bold type · Black, white & red",
    "12 列グリッド · 大きな文字 · 白・黒・赤"
  ],
  "纯黑底色 · 清晰边线 · 蓝色重点": [
    "Pure black · Crisp borders · Blue accents",
    "黒い背景 · 明瞭な境界線 · 青のアクセント"
  ],
  "纯白底色 · 轻盈边线 · 蓝色重点": [
    "Pure white · Subtle borders · Blue accents",
    "白い背景 · 軽やかな境界線 · 青のアクセント"
  ],
  "你的素材。": [
    "Your assets.",
    "あなたの素材。"
  ],
  "原素材只读 · 本地整理": [
    "Read-only originals · Local organization",
    "元の素材は読み取り専用 · ローカルで整理"
  ],
  "名称": [
    "Name",
    "名前"
  ],
  "商品编号": [
    "Product ID",
    "商品番号"
  ],
  "适配": [
    "Compatibility",
    "対応モデル"
  ],
  "商品介绍": [
    "Product description",
    "商品説明"
  ],
  "本地文件": [
    "Local files",
    "ローカルファイル"
  ],
  "本地文件中的商品编号": [
    "Product ID in local files",
    "ローカルファイルの商品番号"
  ],
  "本地说明中的来源链接": [
    "Source link in local documents",
    "ローカル説明文の出典リンク"
  ],
  "名称与作者检索": [
    "Name and author search",
    "名前と作者の検索"
  ],
  "内部素材包名称": [
    "Internal package name",
    "内部パッケージ名"
  ],
  "人工提供或确认的商品来源": [
    "User-provided or confirmed product source",
    "手動登録・確認した商品の出典"
  ],
  "已登记来源": [
    "Registered source",
    "登録済みの出典"
  ],
  "手动关联": [
    "Manual link",
    "手動の関連付け"
  ],
  "工程文件线索": [
    "Project file evidence",
    "プロジェクトファイルの手がかり"
  ],
  "手动关联＋文件线索": [
    "Manual link + file evidence",
    "手動の関連付け＋ファイルの手がかり"
  ],
  "待核对": [
    "Needs verification",
    "要確認"
  ],
  "目录": [
    "Directory",
    "フォルダー"
  ],
  "模型文件": [
    "Model file",
    "モデルファイル"
  ],
  "商品搜索": [
    "Product search",
    "商品検索"
  ],
  "商品网页": [
    "Product page",
    "商品ページ"
  ],
  "封面图片": [
    "Cover image",
    "表紙画像"
  ],
  "正在连接": [
    "Connecting",
    "接続中"
  ],
  "正在下载": [
    "Downloading",
    "ダウンロード中"
  ],
  "读取缓存": [
    "Reading cache",
    "キャッシュ読み込み"
  ],
  "下载完成": [
    "Downloaded",
    "ダウンロード完了"
  ],
  "等待下一次请求": [
    "Waiting for next request",
    "次のリクエストを待機中"
  ],
  "请求失败": [
    "Request failed",
    "リクエスト失敗"
  ],
  "下载中断": [
    "Download interrupted",
    "ダウンロード中断"
  ],
  "已取消": [
    "Cancelled",
    "中止済み"
  ],
  "下载失败": [
    "Download failed",
    "ダウンロード失敗"
  ],
  "登录 BOOTH": [
    "Sign in to BOOTH",
    "BOOTH にログイン"
  ],
  "在内置网页中完成登录，之后可继续使用保存的会话。": [
    "Sign in using the built-in browser. Your saved session stays available.",
    "内蔵ブラウザーでログインします。保存したセッションは次回も使えます。"
  ],
  "我喜欢的": [
    "Liked items",
    "スキした商品"
  ],
  "打开账号收藏的商品，查看图片、介绍与适配。": [
    "Browse liked products, images, descriptions and compatibility.",
    "スキした商品の画像・説明・対応モデルを確認できます。"
  ],
  "Gift / 礼物": [
    "Gifts",
    "ギフト"
  ],
  "查看收到的礼物和可下载文件。": [
    "View received gifts and downloadable files.",
    "受け取ったギフトとダウンロード可能なファイルを表示します。"
  ],
  "已购资料库": [
    "Purchased library",
    "購入済みライブラリ"
  ],
  "查看账号内的商品和可下载文件。": [
    "View your products and downloadable files.",
    "アカウントの商品とダウンロード可能なファイルを表示します。"
  ],
  "等待补全": [
    "Awaiting enrichment",
    "情報取得待ち"
  ],
  "未找到来源": [
    "Source not found",
    "出典が見つかりません"
  ],
  "稍后重试": [
    "Retry later",
    "後で再試行"
  ],
  "访问受限": [
    "Access restricted",
    "アクセス制限"
  ],
  "未分类": [
    "Uncategorized",
    "未分類"
  ],
  "模型": [
    "Models",
    "モデル"
  ],
  "服装": [
    "Clothing",
    "衣装"
  ],
  "头发": [
    "Hair",
    "髪"
  ],
  "饰品": [
    "Accessories",
    "アクセサリー"
  ],
  "贴图": [
    "Textures",
    "テクスチャ"
  ],
  "动作": [
    "Animations",
    "アニメーション"
  ],
  "特效": [
    "Effects",
    "エフェクト"
  ],
  "工具": [
    "Tools",
    "ツール"
  ],
  "工程": [
    "Projects",
    "プロジェクト"
  ],
  "语言": [
    "Language",
    "言語"
  ],
  "界面语言": [
    "Interface language",
    "表示言語"
  ],
  "切换后立即生效，重启后仍会保留。": [
    "Changes apply immediately and are retained after restart.",
    "すぐに切り替わり、再起動後も保持されます。"
  ],
  "第 {page} / {pages} 页": [
    "Page {page} / {pages}",
    "{page} / {pages} ページ"
  ],
  "移除": [
    "Remove",
    "削除"
  ],
  "仅停止扫描此路径，保留原文件和标注。": [
    "Stops scanning this path. Original files and annotations are retained.",
    "このパスのスキャンのみ停止します。元のファイルとメモは保持します。"
  ],
  "此文件夹及其子文件夹都会递归扫描。": [
    "Scans this folder and all its subfolders recursively.",
    "このフォルダーと子フォルダーを再帰的にスキャンします。\r"
  ],
  "应用更新": [
    "App updates",
    "アプリの更新"
  ],
  "尚未检查更新": [
    "Updates not checked yet",
    "更新は未確認です"
  ],
  "正在检查更新…": [
    "Checking for updates…",
    "更新を確認中…"
  ],
  "有可用更新": [
    "Update available",
    "更新があります"
  ],
  "已是最新版本": [
    "You’re up to date",
    "最新バージョンです"
  ],
  "正在下载更新…": [
    "Downloading update…",
    "更新をダウンロード中…"
  ],
  "更新已下载": [
    "Update downloaded",
    "更新のダウンロードが完了しました"
  ],
  "正在准备重启…": [
    "Preparing to restart…",
    "再起動の準備中…"
  ],
  "更新未完成": [
    "Update incomplete",
    "更新を完了できませんでした"
  ],
  "此版本不支持自动安装": [
    "Automatic installation unavailable",
    "このバージョンは自動インストールに非対応です"
  ],
  "当前版本：{version}": [
    "Current version: {version}",
    "現在のバージョン：{version}"
  ],
  "最新版本：{version}": [
    "Latest version: {version}",
    "最新バージョン：{version}"
  ],
  "正在读取更新状态…": [
    "Loading update status…",
    "更新状況を読み込み中…"
  ],
  "无法读取更新状态，请重试。": [
    "Unable to load update status. Please retry.",
    "更新状況を読み込めません。再試行してください。"
  ],
  "更新下载进度": [
    "Update download progress",
    "更新のダウンロード状況"
  ],
  "已下载 {received}{total}": [
    "Downloaded {received}{total}",
    "ダウンロード済み {received}{total}"
  ],
  "自动安装仅适用于 Windows 便携版；其他版本可打开发布页面手动更新。": [
    "Automatic installation supports the Windows portable app. Open the release page to update other versions manually.",
    "自動インストールは Windows ポータブル版に対応しています。他の版はリリースページから手動で更新してください。"
  ],
  "更新说明": [
    "Release notes",
    "更新内容"
  ],
  "检查更新": [
    "Check for updates",
    "更新を確認"
  ],
  "下载更新": [
    "Download update",
    "更新をダウンロード"
  ],
  "重启并更新": [
    "Restart & update",
    "再起動して更新"
  ],
  "打开发布页面": [
    "Open release page",
    "リリースページを開く"
  ],
  "移除素材路径：{path}": [
    "Remove asset path: {path}",
    "素材パスを削除：{path}"
  ],
  "资料库有 {count} 条读取提示，原记录已保留。": [
    "Library has {count} loading notices. Original records are retained.",
    "ライブラリに {count} 件の読み込み通知があります。元の記録は保持しています。"
  ],
  "正在扫描 · 已找到 {count} 个": [
    "Scanning · {count} found",
    "スキャン中 · {count} 件検出"
  ],
  "已选 {count} 项": [
    "{count} selected",
    "{count} 件を選択中"
  ],
  "{local} 个本地 · {product} 个商品支持": [
    "{local} local · {product} product-supported",
    "ローカル対応 {local} 件 · 商品対応 {product} 件"
  ],
  "将更新 {count} 个条目的{field}，原文件保持原样。": [
    "Update {field} for {count} items. Original files are retained.",
    "{count} 件の{field}を更新します。元のファイルは保持します。"
  ],
  "关联「{title}」使用或对应的条目。共选 {count} 项。": [
    "Link items used by or related to “{title}”. {count} selected.",
    "「{title}」で使用する素材や関連する素材を選択します。{count} 件選択中。"
  ],
  "尚有 {count} 个素材未找到商品来源。": [
    "{count} assets still have no product source.",
    "{count} 件の素材で商品リンクが見つかっていません。"
  ],
  "共 {count} 个待确认素材 · 每页 10 行": [
    "{count} assets to review · 10 per page",
    "確認待ち素材 {count} 件 · 1 ページ 10 件"
  ],
  "本地文件 · {count} 份": [
    "Local files · {count}",
    "ローカルファイル · {count} 件"
  ],
  "移除「{name}」及其集合关联。": [
    "Remove “{name}” and its collection memberships.",
    "「{name}」とコレクションの関連付けを削除します。"
  ],
  "将 {count} 个所选素材加入以下集合，可以同时加入多个。": [
    "Add {count} selected assets to the collections below. You can choose more than one.",
    "選択した {count} 件の素材を以下のコレクションに追加します。複数選択できます。"
  ],
  "只从 {count} 个所选素材中移除勾选标签，保留其他标签。": [
    "Remove checked tags from {count} selected assets. Other tags are retained.",
    "選択した {count} 件の素材からチェックしたタグだけを削除します。他のタグは保持します。"
  ],
  "{count} 个所选素材使用": [
    "Used by {count} selected assets",
    "選択した {count} 件の素材が使用中"
  ],
  "已选 {count} 个标签，合并后保留素材与集合关联。": [
    "{count} tags selected. Asset and collection relationships are retained after merging.",
    "{count} 件のタグを選択中です。統合後も素材とコレクションの関連付けを保持します。"
  ],
  "已核对 {count} 个工程条目": [
    "Checked {count} project entries",
    "プロジェクトの {count} 項目を確認済み\r"
  ],
  "更新版本号无效。": [
    "Invalid update version.",
    "更新バージョンが無効です。"
  ],
  "更新目标不是独立的普通文件。": [
    "The update target must be an independent regular file.",
    "更新先は独立した通常のファイルである必要があります。"
  ],
  "更新网址无效。": [
    "Invalid update URL.",
    "更新 URL が無効です。"
  ],
  "更新发布页面无效。": [
    "Invalid update release page.",
    "更新のリリースページが無効です。"
  ],
  "更新发布页面不属于官方仓库。": [
    "The release page does not belong to the official repository.",
    "リリースページが公式リポジトリのものではありません。"
  ],
  "更新下载地址无效。": [
    "Invalid update download URL.",
    "更新のダウンロード URL が無効です。"
  ],
  "更新文件不属于官方仓库。": [
    "The update file does not belong to the official repository.",
    "更新ファイルが公式リポジトリのものではありません。"
  ],
  "更新文件不是有效的 Windows 程序。": [
    "The update file is not a valid Windows application.",
    "更新ファイルは有効な Windows プログラムではありません。"
  ],
  "可检查官方 GitHub 更新。": [
    "Check the official GitHub repository for updates.",
    "公式 GitHub リポジトリの更新を確認できます。"
  ],
  "当前运行方式不支持自动替换，请从官方发布页下载。": [
    "This installation cannot update automatically. Download from the official release page.",
    "現在の実行方法では自動更新できません。公式リリースページからダウンロードしてください。"
  ],
  "当前运行方式或程序位置不支持自动替换，请从官方发布页下载。": [
    "This installation or application location cannot update automatically. Download from the official release page.",
    "現在の実行方法またはアプリの場所では自動更新できません。公式リリースページからダウンロードしてください。"
  ],
  "更新服务已关闭。": [
    "The update service has closed.",
    "更新サービスは終了しています。"
  ],
  "联网已关闭或暂停；本地素材浏览不受影响。": [
    "Online access is disabled or paused. You can still browse local assets.",
    "オンライン接続は無効または一時停止中です。ローカル素材は引き続き閲覧できます。"
  ],
  "请等待当前更新操作完成。": [
    "Wait for the current update operation to finish.",
    "現在の更新操作が完了するまでお待ちください。"
  ],
  "更新跳转地址不受信任。": [
    "The update redirect points to an untrusted location.",
    "更新のリダイレクト先は信頼できません。"
  ],
  "更新服务器返回了无效跳转。": [
    "The update server returned an invalid redirect.",
    "更新サーバーが無効なリダイレクトを返しました。"
  ],
  "GitHub 暂时限制请求，请稍后重试。": [
    "GitHub is temporarily rate limiting requests. Try again later.",
    "GitHub のリクエスト制限に達しました。しばらくしてから再試行してください。"
  ],
  "官方更新服务暂时不可用。": [
    "The official update service is temporarily unavailable.",
    "公式の更新サービスを一時的に利用できません。"
  ],
  "更新跳转次数过多。": [
    "Too many update redirects.",
    "更新のリダイレクト回数が多すぎます。"
  ],
  "检查更新超时，请稍后重试。": [
    "The update check timed out. Try again later.",
    "更新の確認がタイムアウトしました。後で再試行してください。"
  ],
  "正在检查官方更新…": [
    "Checking for official updates…",
    "公式の更新を確認中…"
  ],
  "官方更新资料为空。": [
    "The official update response was empty.",
    "公式の更新情報が空です。"
  ],
  "官方更新资料超过大小限制。": [
    "The official update response exceeds the size limit.",
    "公式の更新情報がサイズ制限を超えています。"
  ],
  "官方更新资料无效。": [
    "Invalid official update information.",
    "公式の更新情報が無効です。"
  ],
  "已是最新版本。": [
    "You’re up to date.",
    "最新バージョンです。"
  ],
  "官方发布中没有唯一可用的 Windows 更新文件。": [
    "The official release does not contain a single valid Windows update file.",
    "公式リリースに一意の有効な Windows 更新ファイルがありません。"
  ],
  "官方更新文件缺少有效的大小或 SHA-256 校验。": [
    "The official update file is missing a valid size or SHA-256 checksum.",
    "公式の更新ファイルに有効なサイズ情報または SHA-256 チェックサムがありません。"
  ],
  "发现新版本，可下载并校验。": [
    "A new version is available to download and verify.",
    "新しいバージョンをダウンロードして検証できます。"
  ],
  "发现新版本；当前运行方式请使用官方发布页手动更新。": [
    "A new version is available. Update this installation manually from the official release page.",
    "新しいバージョンがあります。現在の実行方法では公式リリースページから手動で更新してください。"
  ],
  "检查更新失败。": [
    "Unable to check for updates.",
    "更新を確認できませんでした。"
  ],
  "请先检查并选择官方新版本。": [
    "Check for an official new version first.",
    "先に公式の新しいバージョンを確認してください。"
  ],
  "更新下载超时，请稍后重试。": [
    "The update download timed out. Try again later.",
    "更新のダウンロードがタイムアウトしました。後で再試行してください。"
  ],
  "正在下载并校验更新…": [
    "Downloading and verifying the update…",
    "更新をダウンロード・検証中…"
  ],
  "当前程序文件已变化，已停止更新。": [
    "The current application file has changed. The update was stopped.",
    "現在のプログラムファイルが変更されたため、更新を停止しました。"
  ],
  "更新下载大小与官方资料不一致。": [
    "The download size does not match the official update information.",
    "ダウンロードサイズが公式の更新情報と一致しません。"
  ],
  "更新下载内容为空。": [
    "The update download was empty.",
    "更新のダウンロード内容が空です。"
  ],
  "更新下载超过官方文件大小。": [
    "The download exceeds the official file size.",
    "ダウンロードが公式ファイルのサイズを超えました。"
  ],
  "更新 SHA-256 或文件大小校验失败，已丢弃下载。": [
    "The update failed SHA-256 or size verification. The download was discarded.",
    "SHA-256 またはサイズの検証に失敗したため、ダウンロードを破棄しました。"
  ],
  "更新已校验，重启后应用。": [
    "Update verified. Restart to apply it.",
    "更新を検証しました。再起動すると適用されます。"
  ],
  "已取消更新下载。": [
    "Update download cancelled.",
    "更新のダウンロードを中止しました。"
  ],
  "更新下载失败。": [
    "Update download failed.",
    "更新のダウンロードに失敗しました。"
  ],
  "请先下载并校验更新。": [
    "Download and verify the update first.",
    "先に更新をダウンロードして検証してください。"
  ],
  "已下载的更新文件发生变化，请重新下载。": [
    "The downloaded update file has changed. Download it again.",
    "ダウンロード済みの更新ファイルが変更されています。再ダウンロードしてください。"
  ],
  "正在退出并应用更新；程序将自动重新打开。": [
    "Closing to apply the update. The app will reopen automatically.",
    "終了して更新を適用します。アプリは自動で開き直します。"
  ],
  "无法启动更新助手，当前版本保持不变。": [
    "Unable to start the update helper. The current version is retained.",
    "更新ヘルパーを起動できません。現在のバージョンは保持されます。"
  ],
  "已取消更新操作。": [
    "Update operation cancelled.",
    "更新操作を中止しました。"
  ],
  "更新助手的启动确认无效。": [
    "The update helper startup confirmation is invalid.",
    "更新ヘルパーの起動確認が無効です。"
  ]
};
