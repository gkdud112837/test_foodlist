// 표 하나를 그린다. 행이 없으면 "정보 없음" 표시
function Section({ title, columns, rows }) {
  return (
    <section className="section">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="muted small">정보 없음</p>
      ) : (
        <table>
          <thead>
            <tr>
              {columns.map(([label]) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {columns.map(([label, get]) => (
                  <td key={label}>{get(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default function ProductDetail({ product: p, onDelete }) {
  return (
    <article>
      <div className="detail-head">
        <div>
          <span className="code">{p.product_id}</span>
          <h2>{p.name}</h2>
        </div>
        <button className="danger" onClick={onDelete}>
          삭제
        </button>
      </div>

      <dl className="facts">
        <dt>용량 · 구성</dt>
        <dd>{p.package_desc}</dd>
        <dt>가격</dt>
        <dd>{p.price_krw.toLocaleString()}원</dd>
        <dt>알레르기</dt>
        <dd>
          <span className={p.allergy_status === '주의 필요' ? 'badge warn' : 'badge'}>{p.allergy_status}</span>
        </dd>
        <dt>설명</dt>
        <dd>{p.description}</dd>
      </dl>

      <Section
        title="원재료 · 원산지"
        columns={[
          ['원재료', (r) => r.ingredient],
          ['원산지', (r) => r.origin || <span className="muted">문서에 없음</span>],
        ]}
        rows={p.ingredients}
      />
      <Section
        title="보관 기간"
        columns={[
          ['구분', (r) => r.stage],
          ['온도', (r) => r.temp_zone],
          ['방법', (r) => r.method_text],
          ['기간', (r) => `${r.period_value}${r.period_unit}`],
        ]}
        rows={p.storage_periods}
      />
      <Section
        title="금지 사항"
        columns={[
          ['구분', (r) => r.stage],
          ['하면 안 되는 것', (r) => r.action],
          ['이유', (r) => r.reason],
        ]}
        rows={p.prohibitions}
      />
      <Section
        title="알레르기"
        columns={[
          ['물질', (r) => r.allergen],
          ['관계', (r) => r.relation],
        ]}
        rows={p.product_allergens}
      />
      <Section
        title="안내"
        columns={[
          ['종류', (r) => r.notice_type],
          ['내용', (r) => r.content],
        ]}
        rows={[...p.product_notices].sort((a, b) => a.notice_id - b.notice_id)}
      />
    </article>
  );
}
