import { supabase } from './supabase.js';
import { RISK_RELATIONS, SHIPPING_POLICY_ID } from './constants.js';

// 상품과 하위 테이블을 한 번에 가져온다 (원산지는 원재료 아래에 붙음)
const PRODUCT_SELECT = `
  *,
  product_ingredients (seq, ingredient, ingredient_origins (origin)),
  storage_periods (*),
  prohibitions (*),
  product_allergens (*),
  product_notices (notice_id, notice_type, content)
`;

function check({ data, error }) {
  if (error) throw new Error(friendlyMessage(error));
  return data;
}

function friendlyMessage(error) {
  if (error.code === '23505') return `이미 있는 값입니다 (${error.details ?? error.message})`;
  if (error.code === '23514') return `허용되지 않는 값입니다 (${error.message})`;
  return error.message;
}

// 원산지 관계가 객체 또는 배열로 올 수 있어 하나로 맞춘다
function originOf(row) {
  const o = row.ingredient_origins;
  if (!o) return '';
  return (Array.isArray(o) ? o[0]?.origin : o.origin) ?? '';
}

export async function fetchProducts() {
  const rows = check(await supabase.from('products').select(PRODUCT_SELECT).order('product_id'));
  return rows.map((p) => ({
    ...p,
    ingredients: [...p.product_ingredients]
      .sort((a, b) => a.seq - b.seq)
      .map((i) => ({ ingredient: i.ingredient, origin: originOf(i) })),
  }));
}

export async function fetchAllergens() {
  const rows = check(await supabase.from('allergens').select('allergen').order('allergen'));
  return rows.map((r) => r.allergen);
}

// 상품 추가: 상품 행을 먼저 넣고 하위 행을 넣는다. 하위 행이 실패하면 상품을 지워 되돌린다
export async function createProduct(form) {
  const id = form.product_id;
  const hasRisk = form.product_allergens.some((a) => RISK_RELATIONS.includes(a.relation));

  check(
    await supabase.from('products').insert({
      product_id: id,
      name: form.name,
      package_desc: form.package_desc,
      price_krw: Number(form.price_krw),
      description: form.description,
      allergy_status: hasRisk ? '주의 필요' : '없음',
      shipping_policy_id: SHIPPING_POLICY_ID,
    }),
  );

  try {
    const withId = (rows) => rows.map((r) => ({ product_id: id, ...r }));
    const ingredients = form.ingredients.map((r, i) => ({ seq: i + 1, ingredient: r.ingredient }));
    const origins = form.ingredients
      .filter((r) => r.origin.trim())
      .map((r) => ({ ingredient: r.ingredient, origin: r.origin }));
    const storage = form.storage_periods.map((r) => ({ ...r, period_value: Number(r.period_value) }));

    // ingredient_origins 는 product_ingredients 를 참조하므로 순서대로 넣는다
    const steps = [
      ['product_ingredients', ingredients],
      ['ingredient_origins', origins],
      ['storage_periods', storage],
      ['prohibitions', form.prohibitions],
      ['product_allergens', form.product_allergens],
      ['product_notices', form.product_notices],
    ];
    for (const [table, rows] of steps) {
      if (rows.length) check(await supabase.from(table).insert(withId(rows)));
    }
  } catch (e) {
    await supabase.from('products').delete().eq('product_id', id);
    throw e;
  }
}

// 하위 테이블은 on delete cascade 로 함께 지워진다
export async function deleteProduct(id) {
  check(await supabase.from('products').delete().eq('product_id', id));
}
