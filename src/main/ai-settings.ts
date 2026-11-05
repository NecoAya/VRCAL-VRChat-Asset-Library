import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AI_CONSENT_VERSION, AI_PROVIDERS, type AiCustomProtocol, type AiProviderId, type AiSettingsUpdate } from '../shared/ai-contracts';

export interface AiCipher {
  isEncryptionAvailable(): boolean;
  getSelectedStorageBackend?(): string;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
}
export const AI_DATA_FILES = ['ai-settings.json', 'ai-cache.json', 'ai-usage.json', 'ai-credentials.json'] as const;
export const AI_BACKUP_EXCLUDED_FILES = ['ai-credentials.json', 'ai-cache.json', 'ai-settings.json', 'ai-usage.json'] as const;
export interface StoredAiSettings {
  schemaVersion: 1; enabled: boolean; classificationEnabled: boolean; diagnosticsEnabled: boolean; discoveryEnabled: boolean;
  customProtocol: AiCustomProtocol; customBaseUrl: string; provider: AiProviderId; model: string; qwenWorkspaceId: string; dailyCallLimit: number;
  consentVersion: number | null; consentClassification: boolean; consentDiagnostics: boolean; consentDiscovery: boolean;
}
export function isAiProvider(value: unknown): value is AiProviderId { return AI_PROVIDERS.some(p => p.id === value); }
export function readAiJson(file: string, limit = 1024 * 1024): unknown {
  if (!fs.existsSync(file)) return undefined;
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > limit) throw new Error('AI 本地文件不可读取');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
export function writeAiJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file) && (!fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink())) throw new Error('AI 本地文件不可写入');
  const temp = `${file}.${randomUUID()}.tmp`;
  try { fs.writeFileSync(temp, JSON.stringify(value), { flag: 'wx', mode: 0o600 }); fs.renameSync(temp, file); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('AI 设置格式无效'); return value as Record<string, unknown>; }
function validModel(value: unknown, provider: AiProviderId): value is string {
  return typeof value === 'string' && value.length <= 100 && /^[a-z0-9][a-z0-9._\/:-]{0,99}$/i.test(value)
    && (provider === 'custom' || (provider === 'qwen' ? /^qwen/i : provider === 'kimi' ? /^(?:kimi|moonshot)/i : /^deepseek/i).test(value));
}
export function normalizeAiBaseUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('API 地址无效');
  let url: URL; try { url = new URL(value); } catch { throw new Error('请填写完整的 HTTPS API Base URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('API 地址须使用 HTTPS，且不能包含账号、查询参数或片段');
  return url.href.replace(/\/+$/, '');
}
function validWorkspace(value: unknown): value is string { return typeof value === 'string' && (value === '' || /^[a-z0-9][a-z0-9-]{0,62}$/.test(value)); }
const defaults = (): StoredAiSettings => ({schemaVersion:1, enabled:false, classificationEnabled:false, diagnosticsEnabled:false, discoveryEnabled:false, customProtocol:'openai', customBaseUrl:'', provider:'qwen', model:'qwen-plus', qwenWorkspaceId:'', dailyCallLimit:20, consentVersion:null, consentClassification:false, consentDiagnostics:false, consentDiscovery:false});

/** Internal main-process-only configuration. Never send this instance or key() to IPC. */
export class AiSettings {
  settings = defaults();
  error?: string;
  private credentials: Partial<Record<AiProviderId, string>> = {};
  private credentialError = false;
  constructor(private dataDir: string, private cipher: AiCipher) {
    try {
      const raw = readAiJson(path.join(dataDir,'ai-settings.json'), 32 * 1024);
      if (raw !== undefined) {
        const o = object(raw);
        if (o.schemaVersion !== 1 || !isAiProvider(o.provider) || !validModel(o.model,o.provider) || !validWorkspace(o.qwenWorkspaceId)
          || !Number.isInteger(o.dailyCallLimit) || Number(o.dailyCallLimit) < 1 || Number(o.dailyCallLimit) > 200
          || !['enabled','classificationEnabled','diagnosticsEnabled','consentClassification','consentDiagnostics'].every(k=>typeof o[k] === 'boolean')) throw new Error();
        this.settings = {schemaVersion:1,enabled:o.enabled as boolean,classificationEnabled:o.classificationEnabled as boolean,diagnosticsEnabled:o.diagnosticsEnabled as boolean,discoveryEnabled:o.discoveryEnabled===true,
          customProtocol:o.customProtocol === 'anthropic' ? 'anthropic' : 'openai',customBaseUrl:o.customBaseUrl ? normalizeAiBaseUrl(o.customBaseUrl) : '',provider:o.provider,model:o.model,qwenWorkspaceId:o.qwenWorkspaceId,dailyCallLimit:Number(o.dailyCallLimit),consentVersion:o.consentVersion === AI_CONSENT_VERSION ? AI_CONSENT_VERSION : null,
          consentClassification:o.consentClassification as boolean,consentDiagnostics:o.consentDiagnostics as boolean,consentDiscovery:o.consentDiscovery===true};
        if (o.customProtocol !== undefined && o.customProtocol !== 'openai' && o.customProtocol !== 'anthropic') throw new Error();
        if (this.settings.provider === 'custom' && !this.settings.customBaseUrl) throw new Error();
        if (this.settings.consentVersion !== AI_CONSENT_VERSION) this.settings.enabled = false;
      }
    } catch { this.error = 'AI 设置文件损坏，已暂停上传；原文件已保留。'; }
    try {
      const raw = readAiJson(path.join(dataDir,'ai-credentials.json'), 32 * 1024);
      if (raw !== undefined) {
        const o=object(raw); if (o.schemaVersion !== 1) throw new Error();
        const entries = object(o.credentials);
        for (const [provider, encrypted] of Object.entries(entries)) {
          if (!isAiProvider(provider) || typeof encrypted !== 'string' || encrypted.length > 12000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encrypted)) throw new Error();
          this.credentials[provider] = encrypted;
        }
      }
    } catch { this.credentialError=true; this.error = 'AI 密钥文件不可读取，已暂停上传；原文件已保留。'; }
  }
  encryptionAvailable(): boolean { try { return this.cipher.isEncryptionAvailable() && this.cipher.getSelectedStorageBackend?.() !== 'basic_text'; } catch { return false; } }
  keyStatus(): 'missing' | 'configured' | 'unavailable' {
    if (this.credentialError) return 'unavailable';
    if (!this.credentials[this.settings.provider]) return 'missing';
    try { this.key(); return 'configured'; } catch { return 'unavailable'; }
  }
  key(): string {
    if (!this.encryptionAvailable()) throw new Error('系统加密不可用');
    const encrypted = this.credentials[this.settings.provider];
    if (!encrypted) throw new Error('请填写 API 密钥');
    let key = this.cipher.decryptString(Buffer.from(encrypted, 'base64'));
    if (this.settings.provider === 'custom') {
      const saved = object(JSON.parse(key));
      if (saved.baseUrl !== this.settings.customBaseUrl || saved.protocol !== this.settings.customProtocol || typeof saved.key !== 'string') throw new Error('自定义密钥与接收方不匹配');
      key = saved.key;
    }
    if (!/^[\x21-\x7e]{8,512}$/.test(key)) throw new Error('密钥不可读取');
    return key;
  }
  configure(value: AiSettingsUpdate): void {
    if (this.error) throw new Error(this.error);
    const patch=object(value), allowed=['enabled','classificationEnabled','diagnosticsEnabled','discoveryEnabled','provider','model','customProtocol','customBaseUrl','qwenWorkspaceId','dailyCallLimit','consentVersion','apiKey','deleteApiKey'];
    if (Object.keys(patch).some(k=>!allowed.includes(k))) throw new Error('AI 设置包含未知字段');
    const next={...this.settings};
    for (const key of ['enabled','classificationEnabled','diagnosticsEnabled','discoveryEnabled'] as const) if (patch[key] !== undefined) { if (typeof patch[key] !== 'boolean') throw new Error('AI 开关格式无效'); next[key]=patch[key]; }
    if (patch.provider !== undefined) {
      if (!isAiProvider(patch.provider)) throw new Error('AI 服务商无效');
      if (next.provider !== patch.provider) next.model=AI_PROVIDERS.find(p=>p.id===patch.provider)!.defaultModel;
      next.provider=patch.provider;
    }
    if (patch.customProtocol !== undefined) { if (patch.customProtocol !== 'openai' && patch.customProtocol !== 'anthropic') throw new Error('AI 接口协议无效'); next.customProtocol=patch.customProtocol; }
    if (patch.customBaseUrl !== undefined) next.customBaseUrl=patch.customBaseUrl === '' ? '' : normalizeAiBaseUrl(patch.customBaseUrl);
    if (patch.model !== undefined) { if (!validModel(patch.model,next.provider)) throw new Error('AI 模型名称无效'); next.model=patch.model; }
    if (patch.qwenWorkspaceId !== undefined) { if (!validWorkspace(patch.qwenWorkspaceId)) throw new Error('仅支持百炼北京业务空间 ID'); next.qwenWorkspaceId=patch.qwenWorkspaceId; }
    if (patch.dailyCallLimit !== undefined) { if (!Number.isInteger(patch.dailyCallLimit) || Number(patch.dailyCallLimit)<1 || Number(patch.dailyCallLimit)>200) throw new Error('每日上限应为 1 至 200 次'); next.dailyCallLimit=Number(patch.dailyCallLimit); }
    if (patch.consentVersion !== undefined && patch.consentVersion !== AI_CONSENT_VERSION) throw new Error('请阅读并同意当前 AI 数据说明');
    if (patch.consentVersion === AI_CONSENT_VERSION) {
      next.consentVersion=AI_CONSENT_VERSION;
      next.consentClassification ||= next.classificationEnabled;
      next.consentDiagnostics ||= next.diagnosticsEnabled;
      next.consentDiscovery ||= next.discoveryEnabled;
    }
    if (next.enabled && (next.consentVersion !== AI_CONSENT_VERSION || (next.classificationEnabled&&!next.consentClassification) || (next.diagnosticsEnabled&&!next.consentDiagnostics) || (next.discoveryEnabled&&!next.consentDiscovery))) throw new Error('请先同意所选范围的 AI 数据说明');
    const credentials={...this.credentials};let changed=false;
    if (next.customBaseUrl !== this.settings.customBaseUrl || next.customProtocol !== this.settings.customProtocol) {
      delete credentials.custom; changed=true;
      next.consentClassification=false; next.consentDiagnostics=false; next.consentDiscovery=false;
      if (next.provider === 'custom' && next.enabled && patch.consentVersion !== AI_CONSENT_VERSION) throw new Error('更换自定义接收方后请重新同意 AI 数据说明');
      if (patch.consentVersion === AI_CONSENT_VERSION) { next.consentClassification=next.classificationEnabled; next.consentDiagnostics=next.diagnosticsEnabled; next.consentDiscovery=next.discoveryEnabled; }
    }
    if (next.provider === 'custom' && this.settings.provider !== 'custom' && next.enabled && patch.consentVersion !== AI_CONSENT_VERSION) throw new Error('切换到自定义服务商后请重新同意 AI 数据说明');
    if (next.provider === 'custom' && (!next.customBaseUrl || !validModel(next.model,'custom'))) throw new Error('请填写自定义 API 地址与模型名称');
    if (patch.deleteApiKey !== undefined && typeof patch.deleteApiKey !== 'boolean') throw new Error('密钥设置无效');
    if (patch.apiKey !== undefined) {
      if (patch.deleteApiKey || typeof patch.apiKey !== 'string' || !/^[\x21-\x7e]{8,512}$/.test(patch.apiKey.trim())) throw new Error('API 密钥格式无效');
      if (!this.encryptionAvailable()) throw new Error('系统加密不可用，无法保存 API 密钥');
      try { credentials[next.provider]=this.cipher.encryptString(next.provider === 'custom' ? JSON.stringify({baseUrl:next.customBaseUrl,protocol:next.customProtocol,key:patch.apiKey.trim()}) : patch.apiKey.trim()).toString('base64'); } catch { throw new Error('API 密钥加密失败'); }
      changed=true;
    }
    if (patch.deleteApiKey) { delete credentials[next.provider];changed=true; }
    try {
      if (changed) writeAiJson(path.join(this.dataDir,'ai-credentials.json'),{schemaVersion:1,credentials});
      writeAiJson(path.join(this.dataDir,'ai-settings.json'),next);
    } catch { throw new Error('AI 设置无法保存，请检查资料库目录'); }
    this.settings=next;this.credentials=credentials;
  }
}

export function aiEndpoint(settings: StoredAiSettings): string {
  if (settings.provider === 'qwen') {
    if (!validWorkspace(settings.qwenWorkspaceId)) throw new Error('业务空间无效');
    const host=settings.qwenWorkspaceId ? `${settings.qwenWorkspaceId}.cn-beijing.maas.aliyuncs.com` : 'dashscope.aliyuncs.com';
    return `https://${host}/compatible-mode/v1/chat/completions`;
  }
  if (settings.provider === 'kimi') return 'https://api.moonshot.cn/v1/chat/completions';
  if (settings.provider === 'deepseek') return 'https://api.deepseek.com/chat/completions';
  if (settings.provider === 'custom') {
    const base=normalizeAiBaseUrl(settings.customBaseUrl);
    return base + (settings.customProtocol === 'anthropic' ? (/\/v1$/.test(base) ? '/messages' : '/v1/messages') : '/chat/completions');
  }
  throw new Error('AI 服务商无效');
}
