import React, {useEffect, useRef, useState} from 'react';
import {t, useLanguage} from './i18n';
import './source-locations.css';

export interface SourceLocationsProps {
  roots: string[];
  directSources?: string[];
  disabled: boolean;
  onRemove: (roots: string[]) => Promise<boolean | void>;
  onAdd: () => Promise<unknown>;
}

export function SourceLocations({roots, directSources = [], disabled, onRemove, onAdd}: SourceLocationsProps) {
  useLanguage();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const master = useRef<HTMLInputElement>(null);
  const selectedRoots = roots.filter(root => selected.has(root));
  const allSelected = roots.length > 0 && selectedRoots.length === roots.length;
  const mixed = selectedRoots.length > 0 && !allSelected;
  const locked = disabled || pending;

  useEffect(() => {
    setSelected(previous => {
      const next = new Set([...previous].filter(root => roots.includes(root)));
      return next.size === previous.size ? previous : next;
    });
  }, [roots]);
  useEffect(() => { if (master.current) master.current.indeterminate = mixed; }, [mixed]);

  const remove = async (paths: string[]) => {
    const targets = paths.filter(root => roots.includes(root));
    if (locked || submitting.current || !targets.length) return;
    submitting.current = true;
    setPending(true);
    setError('');
    try {
      if (await onRemove(targets) === false) {
        setError('移除未完成，勾选已保留，请重试。');
        return;
      }
      setSelected(previous => new Set([...previous].filter(root => !targets.includes(root))));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '移除未完成，勾选已保留，请重试。');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };
  const add = async () => {
    if (locked || submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError('');
    try { await onAdd(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '添加未完成，请重试。'); }
    finally { submitting.current = false; setPending(false); }
  };

  return <section className="setting-block source-locations" data-setting="source-locations" aria-busy={pending}>
    <h3>{t('素材位置')}</h3>
    <p className="help-text">{t('仅停止扫描此路径，保留原文件和标注。')}</p>
    <div className="source-locations-toolbar">
      <label className="source-locations-select-all"><input ref={master} type="checkbox" aria-label="全选素材位置" aria-checked={mixed ? 'mixed' : allSelected} checked={allSelected} disabled={locked || !roots.length} onChange={event => {
        if (!locked && !submitting.current) setSelected(event.currentTarget.checked ? new Set(roots) : new Set());
      }}/>全选</label>
      <span className="source-locations-count" role="status" aria-live="polite">已选 {selectedRoots.length}</span>
      <button className="button small" data-remove-selected-roots disabled={locked || !selectedRoots.length} onClick={() => remove(selectedRoots)}>移除所选（{selectedRoots.length}）</button>
      <button className="text-button" disabled={locked || !selectedRoots.length} onClick={() => {
        if (!locked && !submitting.current) setSelected(new Set());
      }}>取消勾选</button>
    </div>
    {roots.length > 0 ? <div className="source-locations-list" role="group" aria-label="已登记素材位置">
      {roots.map(root => <div className="setting-path source-location-row" key={root}>
        <label className="source-location-choice">
          <input type="checkbox" aria-label={`选择素材位置：${root}`} checked={selected.has(root)} disabled={locked} onChange={event => {
            if (locked || submitting.current) return;
            const checked = event.currentTarget.checked;
            setSelected(previous => {
              const next = new Set(previous);
              if (checked) next.add(root); else next.delete(root);
              return next;
            });
          }}/>
          <svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>
          <span className="source-location-path">{root}{directSources.includes(root) && <small className="setting-direct-source">{t('手动添加')}</small>}</span>
        </label>
        <button className="button small root-remove" data-remove-root={root} aria-label={t('移除素材路径：{path}', {path: root})} disabled={locked} onClick={() => remove([root])}>{t('移除')}</button>
      </div>)}
    </div> : <p className="help-text source-locations-empty">尚未登记素材位置。</p>}
    {error && <p className="error-text source-locations-error" role="alert">{error}</p>}
    <button className="button" onClick={add} disabled={locked} title={t('此文件夹及其子文件夹都会递归扫描。')}>{t('添加素材文件夹')}</button>
  </section>;
}
