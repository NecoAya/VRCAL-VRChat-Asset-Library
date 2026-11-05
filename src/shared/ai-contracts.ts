/** Renderer-safe AI contracts. Credentials are write-only; never include them in state. */
export const AI_CONSENT_VERSION = 1 as const;
export const AI_CONSENT_TEXT = '启用后将所选范围内的公开商品文字、文件名线索、你输入的找素材描述或脱敏后的 Unity 错误摘要发送给所选 AI 服务商。不会发送本地图片、源码、完整日志或完整路径。API 调用可能收费，默认每天最多 20 次；分类、诊断与找素材共用额度。AI 内容是建议，不修改主分类、官方信息或工程文件。';
export type AiProviderId = 'qwen' | 'kimi' | 'deepseek' | 'custom';
export type AiCustomProtocol = 'openai' | 'anthropic';
export const AI_PROVIDERS = [
  { id: 'qwen', label: '千问（百炼北京）', defaultModel: 'qwen-plus', helpUrl: 'https://help.aliyun.com/zh/model-studio/get-api-key/' },
  { id: 'kimi', label: 'Kimi（月之暗面）', defaultModel: 'kimi-k2.6', helpUrl: 'https://platform.kimi.com/console/api-keys' },
  { id: 'deepseek', label: 'DeepSeek', defaultModel: 'deepseek-flash', helpUrl: 'https://platform.deepseek.com/api_keys' },
  { id: 'custom', label: '自定义', defaultModel: '', helpUrl: '' },
] as const;
export const AI_CLOTHING_TYPES = ['连衣裙','上衣','外套','半身裙','裤装','鞋袜','内衣','套装','制服','泳装','其他'] as const;
export const AI_STYLES = ['日常','甜美','可爱','休闲','运动','街头','哥特','洛丽塔','和风','中式','赛博','科幻','奇幻','复古','正式','性感','其他'] as const;
export type AiClothingType = typeof AI_CLOTHING_TYPES[number];
export type AiStyle = typeof AI_STYLES[number];
export interface AiSettingsUpdate {
  enabled?: boolean;
  classificationEnabled?: boolean;
  diagnosticsEnabled?: boolean;
  discoveryEnabled?: boolean;
  provider?: AiProviderId;
  model?: string;
  customProtocol?: AiCustomProtocol;
  customBaseUrl?: string;
  /** Optional Beijing workspace ID (not an arbitrary URL). Empty uses compatible DashScope host. */
  qwenWorkspaceId?: string;
  dailyCallLimit?: number;
  consentVersion?: typeof AI_CONSENT_VERSION;
  apiKey?: string;
  deleteApiKey?: boolean;
}
export interface AiPublicState {
  enabled: boolean;
  classificationEnabled: boolean;
  diagnosticsEnabled: boolean;
  discoveryEnabled: boolean;
  provider: AiProviderId;
  model: string;
  customProtocol: AiCustomProtocol;
  customBaseUrl: string;
  qwenWorkspaceId: string;
  dailyCallLimit: number;
  callsToday: number;
  consentVersion: number | null;
  keyConfigured: boolean;
  keyStatus: 'missing' | 'configured' | 'unavailable';
  encryptionAvailable: boolean;
  busy: boolean;
  error?: string;
}
export interface AiClassificationInput {
  /** Local correlation only, excluded from requests. */
  assetId: string;
  publicTitle?: string;
  publicDescription?: string;
  publicTags?: string[];
  filenameClue?: string;
}
export interface AiDiagnosticInput {
  /** Local correlation only, excluded from requests. */
  projectId: string;
  excerpt: string;
  unityVersion?: string;
  sdkVersion?: string;
  maVersion?: string;
}
export interface AiClassificationSuggestion {
  clothingTypes: AiClothingType[];
  styles: AiStyle[];
  confidence: number;
  reason: string;
  uncertain: boolean;
}
export interface AiDiagnosticSuggestion {
  summary: string;
  observedFacts: string[];
  possibleCauses: string[];
  steps: Array<{action: string; verification: string; risk: 'read-only' | 'change-required'}>;
  missingInformation: string[];
  confidence: number;
}
export interface AiProvenance {
  provider: AiProviderId;
  model: string;
  generatedAt: number;
  inputHash: string;
  schemaVersion: 1;
  inputScope: 'public-text-and-filename' | 'redacted-unity-errors' | 'search-description';
}
export interface AiClassificationRecord { assetId: string; suggestion: AiClassificationSuggestion; provenance: AiProvenance }
export interface AiDiagnosticRecord { projectId: string; suggestion: AiDiagnosticSuggestion; provenance: AiProvenance }
export type AiErrorCode = 'disabled' | 'consent-required' | 'key-required' | 'encryption-unavailable' | 'invalid-input' | 'invalid-response' | 'busy' | 'rate-limit' | 'daily-limit' | 'cancelled' | 'timeout' | 'authentication' | 'provider-error' | 'network' | 'storage';
export type AiRunResult<T> = {ok: true; record: T; cached: boolean} | {ok: false; code: AiErrorCode; message: string};
export interface AiClassificationQueueState { running: boolean; completed: number; pending: number; current: string; message: string }
