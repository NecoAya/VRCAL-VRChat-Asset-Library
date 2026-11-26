import React, { useEffect, useRef, useState } from 'react';
import {
  CONTEXT_ACTIONS, DEFAULT_CONTEXT_MENU_PREFERENCES, normalizeContextMenuPreferences,
  type ContextActionId, type ContextMenuPreferences
} from '../shared/context-menu';
import { t, useLanguage } from './i18n';
import './context-menu-settings.css';

export interface ContextMenuSettingsProps {
  value: ContextMenuPreferences;
  onChange: (preferences: ContextMenuPreferences) => Promise<unknown>;
  disabled?: boolean;
}

const labels = new Map(CONTEXT_ACTIONS.map(action => [action.id, action.label]));
const defaultKey = JSON.stringify(DEFAULT_CONTEXT_MENU_PREFERENCES);

export function ContextMenuSettings({ value, onChange, disabled = false }: ContextMenuSettingsProps) {
  useLanguage();
  const [draft, setDraft] = useState(() => normalizeContextMenuPreferences(value));
  const [saving, setSaving] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const unsavedRef = useRef(false);
  const externalKey = JSON.stringify(normalizeContextMenuPreferences(value));

  useEffect(() => {
    // A rejected save must not erase the user's choices when the parent rerenders.
    if (!savingRef.current && !unsavedRef.current) {
      setDraft(normalizeContextMenuPreferences(JSON.parse(externalKey)));
    }
  }, [externalKey]);

  const save = async (preferences: ContextMenuPreferences) => {
    if (disabled || savingRef.current) return;
    const next = normalizeContextMenuPreferences(preferences);
    savingRef.current = true;
    unsavedRef.current = true;
    setDraft(next);
    setUnsaved(true);
    setSaving(true);
    setError('');
    try {
      if (await onChange(normalizeContextMenuPreferences(next)) === false) {
        throw new Error('未能保存右键菜单设置，请重试。');
      }
      unsavedRef.current = false;
      setUnsaved(false);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : '';
      setError(message.trim() || '未能保存右键菜单设置，请重试。');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const move = (id: ContextActionId, offset: -1 | 1) => {
    const index = draft.order.indexOf(id), target = index + offset;
    if (target < 0 || target >= draft.order.length) return;
    const order = [...draft.order];
    [order[index], order[target]] = [order[target], order[index]];
    void save({ order, hidden: [...draft.hidden] });
  };

  const locked = disabled || saving;
  return <section className="setting-block context-menu-settings" data-setting="context-menu" aria-label={t('右键菜单')} aria-busy={saving}>
    <div className="context-menu-settings-heading">
      <h3>{t('右键菜单')}</h3>
      <button className="button small" type="button" disabled={locked || JSON.stringify(draft) === defaultKey}
        onClick={() => void save(normalizeContextMenuPreferences(DEFAULT_CONTEXT_MENU_PREFERENCES))}>{t('恢复默认')}</button>
    </div>
    <ol className="context-menu-settings-list" aria-label={t('右键菜单选项')}>
      {draft.order.map((id, index) => {
        const name = t(labels.get(id) || id);
        return <li className="context-menu-settings-row" key={id} data-context-action={id}>
          <label>
            <input type="checkbox" aria-label={t('显示“{name}”', { name })} checked={!draft.hidden.includes(id)} disabled={locked}
              onChange={event => void save({ order: [...draft.order], hidden: event.target.checked ? draft.hidden.filter(action => action !== id) : [...draft.hidden, id] })}/>
            <span>{name}</span>
          </label>
          <div className="context-menu-settings-move">
            <button className="button small" type="button" aria-label={t('上移“{name}”', { name })} disabled={locked || index === 0} onClick={() => move(id, -1)}><span aria-hidden="true">↑</span>{t('上移')}</button>
            <button className="button small" type="button" aria-label={t('下移“{name}”', { name })} disabled={locked || index === draft.order.length - 1} onClick={() => move(id, 1)}><span aria-hidden="true">↓</span>{t('下移')}</button>
          </div>
        </li>;
      })}
    </ol>
    {saving && <p className="context-menu-settings-status" role="status">{t('正在保存右键菜单设置…')}</p>}
    {error && <div className="context-menu-settings-error" role="alert"><p>{t('右键菜单保存失败：{message}', { message: t(error) })}</p></div>}
    {unsaved && !saving && <div className="context-menu-settings-retry"><span>{t('右键菜单设置尚未保存。')}</span><button className="button small" type="button" disabled={locked} onClick={() => void save(draft)}>{t('重试保存')}</button></div>}
  </section>;
}
