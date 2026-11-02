import { useState } from 'react';
import {
  ALLERGEN_RELATIONS,
  NOTICE_TYPES,
  PERIOD_UNITS,
  PROHIBITION_STAGES,
  STORAGE_STAGES,
  TEMP_ZONES,
} from './constants.js';

// 하위 목록 정의: 필드 [이름, 라벨, 종류, 선택지, 필수 여부]
function listSections(allergens) {
  return [
    {
      key: 'ingredients',
      title: '원재료 · 원산지',
      empty: { ingredient: '', origin: '' },
      fields: [
        ['ingredient', '원재료', 'text', null, true],
        ['origin', '원산지 (모르면 비움)', 'text', null, false],
      ],
    },
    {
      key: 'storage_periods',
      title: '보관 기간',
      empty: { stage: STORAGE_STAGES[0], temp_zone: TEMP_ZONES[0], method_text: '', period_value: '', period_unit: PERIOD_UNITS[0] },
      fields: [
        ['stage', '구분', 'select', STORAGE_STAGES, true],
        ['temp_zone', '온도', 'select', TEMP_ZONES, true],
        ['method_text', '방법(원문)', 'text', null, true],
        ['period_value', '기간', 'number', null, true],
        ['period_unit', '단위', 'select', PERIOD_UNITS, true],
      ],
    },
    {
      key: 'prohibitions',
      title: '금지 사항',
      empty: { stage: PROHIBITION_STAGES[0], action: '', reason: '' },
      fields: [
        ['stage', '구분', 'select', PROHIBITION_STAGES, true],
        ['action', '하면 안 되는 것', 'text', null, true],
        ['reason', '이유', 'text', null, true],
      ],
    },
    {
      key: 'product_allergens',
      title: '알레르기',
      empty: { allergen: allergens[0] ?? '', relation: ALLERGEN_RELATIONS[0] },
      fields: [
        ['allergen', '물질', 'select', allergens, true],
        ['relation', '관계', 'select', ALLERGEN_RELATIONS, true],
      ],
    },
    {
      key: 'product_notices',
      title: '안내',
      empty: { notice_type: NOTICE_TYPES[0], content: '' },
      fields: [
        ['notice_type', '종류', 'select', NOTICE_TYPES, true],
        ['content', '내용', 'text', null, true],
      ],
    },
  ];
}

const EMPTY_FORM = {
  product_id: '',
  name: '',
  package_desc: '',
  price_krw: '',
  description: '',
  ingredients: [{ ingredient: '', origin: '' }],
  storage_periods: [],
  prohibitions: [],
  product_allergens: [],
  product_notices: [],
};

// 같은 목록 안에서 키가 겹치면 DB 기본 키 충돌이므로 미리 막는다
function findDuplicate(rows, keyOf) {
  const seen = new Set();
  for (const r of rows) {
    const k = keyOf(r);
    if (seen.has(k)) return k;
    seen.add(k);
  }
  return null;
}

function validate(form, sections, existingIds) {
  if (!/^P-\d{4}$/.test(form.product_id)) return '상품 코드는 P-0000 형식이어야 합니다';
  if (existingIds.includes(form.product_id)) return `이미 있는 상품 코드입니다: ${form.product_id}`;
  for (const [k, label] of [['name', '상품명'], ['package_desc', '용량 · 구성'], ['description', '설명']]) {
    if (!form[k].trim()) return `${label}을(를) 입력하세요`;
  }
  if (form.price_krw === '' || Number(form.price_krw) < 0) return '가격은 0 이상이어야 합니다';
  if (form.ingredients.length === 0) return '원재료를 하나 이상 입력하세요';

  for (const s of sections) {
    for (const row of form[s.key]) {
      for (const [name, label, type, , required] of s.fields) {
        const v = String(row[name] ?? '').trim();
        if (required && !v) return `${s.title}: ${label}을(를) 입력하세요`;
        if (type === 'number' && v && !(Number(v) > 0)) return `${s.title}: ${label}은(는) 1 이상이어야 합니다`;
      }
    }
  }

  const dupChecks = [
    ['ingredients', '원재료', (r) => r.ingredient.trim()],
    ['storage_periods', '보관 기간(구분 + 방법)', (r) => `${r.stage} ${r.method_text.trim()}`],
    ['prohibitions', '금지 사항', (r) => r.action.trim()],
    ['product_allergens', '알레르기 물질', (r) => r.allergen],
  ];
  for (const [key, label, keyOf] of dupChecks) {
    const dup = findDuplicate(form[key], keyOf);
    if (dup) return `${label}이(가) 중복됩니다: ${dup}`;
  }
  return null;
}

// 앞뒤 공백 제거
function trimRows(rows) {
  return rows.map((r) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])),
  );
}

function Field({ field: [name, label, type, options], value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      {type === 'select' ? (
        <select value={value} onChange={(e) => onChange(name, e.target.value)}>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          min={type === 'number' ? 1 : undefined}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
        />
      )}
    </label>
  );
}

export default function ProductForm({ allergens, existingIds, onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const sections = listSections(allergens);

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const setRow = (key, idx, name, value) =>
    setForm((f) => ({ ...f, [key]: f[key].map((r, i) => (i === idx ? { ...r, [name]: value } : r)) }));
  const addRow = (key, empty) => setForm((f) => ({ ...f, [key]: [...f[key], { ...empty }] }));
  const removeRow = (key, idx) => setForm((f) => ({ ...f, [key]: f[key].filter((_, i) => i !== idx) }));

  async function handleSubmit(e) {
    e.preventDefault();
    const msg = validate(form, sections, existingIds);
    if (msg) return setError(msg);

    const clean = { ...form };
    for (const k of ['product_id', 'name', 'package_desc', 'description']) clean[k] = form[k].trim();
    for (const s of sections) clean[s.key] = trimRows(form[s.key]);

    setSaving(true);
    setError(null);
    try {
      await onSubmit(clean);
    } catch (err) {
      setError(`저장 실패: ${err.message}`);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="detail-head">
        <h2>새 상품</h2>
        <div className="actions">
          <button type="button" onClick={onCancel} disabled={saving}>
            취소
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <section className="section grid">
        <Field field={['product_id', '상품 코드 (P-0000)', 'text']} value={form.product_id} onChange={setField} />
        <Field field={['name', '상품명', 'text']} value={form.name} onChange={setField} />
        <Field field={['package_desc', '용량 · 구성', 'text']} value={form.package_desc} onChange={setField} />
        <Field field={['price_krw', '가격(원)', 'number']} value={form.price_krw} onChange={setField} />
        <label className="field wide">
          <span>설명</span>
          <textarea rows={2} value={form.description} onChange={(e) => setField('description', e.target.value)} />
        </label>
        <p className="muted small wide">알레르기 여부는 아래 알레르기 목록(함유 · 생산 라인 공유)으로 자동 결정됩니다.</p>
      </section>

      {sections.map((s) => (
        <section className="section" key={s.key}>
          <div className="section-head">
            <h3>{s.title}</h3>
            <button type="button" onClick={() => addRow(s.key, s.empty)}>
              + 행 추가
            </button>
          </div>
          {form[s.key].length === 0 && <p className="muted small">없으면 비워 두세요</p>}
          {form[s.key].map((row, idx) => (
            <div className="row" key={idx}>
              {s.fields.map((f) => (
                <Field key={f[0]} field={f} value={row[f[0]]} onChange={(n, v) => setRow(s.key, idx, n, v)} />
              ))}
              <button type="button" className="icon" title="행 삭제" onClick={() => removeRow(s.key, idx)}>
                ✕
              </button>
            </div>
          ))}
        </section>
      ))}
    </form>
  );
}
