import { t, useLanguage, localeName } from './i18n';
import { useState } from 'react';
import type { AppTheme } from '../shared/contracts';

const themes = [
  { id: 'nasa', name: 'NASA 朋克', preview: { kicker: 'STOW 84S / LOCAL ARCHIVE', title: 'ASSET SYSTEM', footer: '▰ ▰ ▰ ▰' } },
  { id: 'swiss', name: '瑞士国际主义', preview: { kicker: '01 / LOCAL ARCHIVE', title: 'Collected.', footer: '2026 / VRC' } },
  { id: 'x', name: 'X 暗色', preview: { kicker: 'VRC 素材库', title: '你的素材。', footer: '扫描与补全只读 · 本地整理' } },
  { id: 'x-light', name: 'X 浅色', preview: { kicker: 'VRC 素材库', title: '你的素材。', footer: '扫描与补全只读 · 本地整理' } }
] as const satisfies readonly { id: AppTheme; name: string; preview: { kicker: string; title: string; footer: string } }[];

export function ThemeSwitcher({ value, onChange }: { value: AppTheme; onChange: (theme: AppTheme) => Promise<unknown> }) {
  useLanguage();
  const [saving, setSaving] = useState(false);
  return <label className="theme-switch"><span>{t("界面主题")}</span><select aria-label={t("界面主题")} value={value} disabled={saving} onChange={async event => {
    const next = event.target.value as AppTheme;
    setSaving(true);
    try { await onChange(next); } finally { setSaving(false); }
  }}>{themes.map(theme => <option key={theme.id} value={theme.id}>{t(theme.name)}</option>)}</select></label>;
}

export function ThemeSettings({ value, onChange }: { value: AppTheme; onChange: (theme: AppTheme) => Promise<unknown> }) {
  useLanguage();
  const [saving, setSaving] = useState(false);
  return <section className="setting-block theme-settings" aria-label={t("主题设置")}><h3>{t("界面主题")}</h3><div className="theme-options">
    {themes.map(theme => <button key={theme.id} type="button" className="theme-option" aria-label={t("使用{v0}主题", {v0: t(theme.name)})} aria-pressed={value === theme.id} disabled={saving} onClick={async () => {
      if (value === theme.id) return;
      setSaving(true);
      try { await onChange(theme.id); } finally { setSaving(false); }
    }}><div className={`theme-preview theme-preview-${theme.id}`} aria-hidden="true"><span>{t(theme.preview.kicker)}</span><strong>{t(theme.preview.title)}</strong><small>{t(theme.preview.footer)}</small></div><div className="theme-option-copy"><strong>{t(theme.name)}</strong></div></button>)}
  </div></section>;
}
