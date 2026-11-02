import { useEffect, useMemo, useState } from 'react';
import { configError, hasAdminPassword, requiresPassword, setAdminPassword } from './supabase.js';
import { createProduct, deleteProduct, fetchAllergens, fetchProducts } from './api.js';
import { RISK_RELATIONS } from './constants.js';
import ProductDetail from './ProductDetail.jsx';
import ProductForm from './ProductForm.jsx';

// 검색어가 상품의 어느 텍스트에든 들어 있는지 확인
function matchesQuery(p, q) {
  if (!q) return true;
  const texts = [
    p.product_id,
    p.name,
    p.description,
    p.package_desc,
    ...p.ingredients.flatMap((i) => [i.ingredient, i.origin]),
    ...p.product_notices.map((n) => n.content),
  ];
  return texts.some((t) => t && t.toLowerCase().includes(q));
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(configError);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [avoid, setAvoid] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('view'); // 'view' | 'new'
  // 배포본에서 비밀번호를 아직 안 넣었거나 틀렸으면 잠금
  const [locked, setLocked] = useState(requiresPassword && !hasAdminPassword());
  const [passwordInput, setPasswordInput] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [ps, as] = await Promise.all([fetchProducts(), fetchAllergens()]);
      setProducts(ps);
      setAllergens(as);
      setError(null);
    } catch (e) {
      setError(`불러오기 실패: ${e.message}`);
      if (requiresPassword && !hasAdminPassword()) setLocked(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!configError && !locked) load();
    else setLoading(false);
  }, []);

  function unlock(e) {
    e.preventDefault();
    setAdminPassword(passwordInput);
    setPasswordInput('');
    setLocked(false);
    load();
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        matchesQuery(p, q) &&
        (!status || p.allergy_status === status) &&
        (!avoid ||
          !p.product_allergens.some((a) => a.allergen === avoid && RISK_RELATIONS.includes(a.relation))),
    );
  }, [products, query, status, avoid]);

  const selected = products.find((p) => p.product_id === selectedId) ?? null;

  async function handleCreate(form) {
    await createProduct(form);
    await load();
    setSelectedId(form.product_id);
    setMode('view');
  }

  async function handleDelete(p) {
    if (!window.confirm(`${p.product_id} ${p.name} 을(를) 삭제할까요? 하위 정보도 모두 지워집니다.`)) return;
    try {
      await deleteProduct(p.product_id);
      setSelectedId(null);
      await load();
    } catch (e) {
      setError(`삭제 실패: ${e.message}`);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>상품 관리</h1>
        <span className="muted">로컬 전용 · Supabase</span>
        <button
          className="primary"
          disabled={!!configError || locked}
          onClick={() => {
            setMode('new');
            setSelectedId(null);
          }}
        >
          + 상품 추가
        </button>
      </header>

      {error && <div className="alert">{error}</div>}

      {locked ? (
        <form className="gate" onSubmit={unlock}>
          <p className="muted small">배포된 페이지는 관리자 비밀번호가 필요합니다.</p>
          <input
            type="password"
            placeholder="비밀번호"
            autoFocus
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
          />
          <button className="primary" disabled={!passwordInput}>
            열기
          </button>
        </form>
      ) : (
        <div className="layout">
          <aside className="sidebar">
            <input
              type="search"
              placeholder="상품명, 코드, 원재료, 원산지, 안내 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="filters">
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">알레르기 전체</option>
                <option value="주의 필요">주의 필요</option>
                <option value="없음">없음</option>
              </select>
              <select value={avoid} onChange={(e) => setAvoid(e.target.value)}>
                <option value="">피할 알레르기 없음</option>
                {allergens.map((a) => (
                  <option key={a} value={a}>
                    {a} 피하기
                  </option>
                ))}
              </select>
            </div>
  
            <p className="muted small">
              {loading ? '불러오는 중…' : `${filtered.length} / ${products.length}개`}
            </p>
            <ul className="product-list">
              {filtered.map((p) => (
                <li key={p.product_id}>
                  <button
                    className={p.product_id === selectedId && mode === 'view' ? 'item active' : 'item'}
                    onClick={() => {
                      setSelectedId(p.product_id);
                      setMode('view');
                    }}
                  >
                    <span className="code">{p.product_id}</span>
                    <span className="name">{p.name}</span>
                    <span className="price">{p.price_krw.toLocaleString()}원</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
  
          <main className="content">
            {mode === 'new' ? (
              <ProductForm
                allergens={allergens}
                existingIds={products.map((p) => p.product_id)}
                onSubmit={handleCreate}
                onCancel={() => setMode('view')}
              />
            ) : selected ? (
              <ProductDetail product={selected} onDelete={() => handleDelete(selected)} />
            ) : (
              <p className="muted empty">왼쪽에서 상품을 고르거나 새 상품을 추가하세요.</p>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
