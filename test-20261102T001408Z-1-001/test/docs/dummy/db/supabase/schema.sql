-- 가상 상품 DB 스키마 (Supabase / PostgreSQL)
-- 빈 프로젝트의 SQL Editor에서 한 번 실행한 뒤 seed.sql 을 실행한다
-- 설계 원칙은 ../README.md 참고: 있는 정보만 행으로 넣고 모든 컬럼은 NOT NULL

-- 배송 정책 (10개 문서 공통이라 한 행)
create table public.shipping_policy (
    policy_id              integer primary key,
    same_day_cutoff        time    not null,
    other_region_delivery  text    not null,
    free_shipping_min_krw  integer not null check (free_shipping_min_krw >= 0),
    shipping_fee_krw       integer not null check (shipping_fee_krw >= 0)
);

-- 당일 배송 지역
create table public.same_day_districts (
    policy_id  integer not null references public.shipping_policy (policy_id),
    district   text    not null,
    primary key (policy_id, district)
);

-- 알레르기 유발 물질 코드
create table public.allergens (
    allergen  text primary key
);

-- 상품 기본 정보 (전 상품에 있는 정보만)
create table public.products (
    product_id          text    primary key check (product_id ~ '^P-[0-9]{4}$'),
    name                text    not null,
    package_desc        text    not null,
    price_krw           integer not null check (price_krw >= 0),
    description         text    not null,
    allergy_status      text    not null check (allergy_status in ('주의 필요', '없음')),
    shipping_policy_id  integer not null references public.shipping_policy (policy_id)
);

-- 원재료 (단일 원재료 상품은 1행 = 100%)
create table public.product_ingredients (
    product_id  text    not null references public.products (product_id) on delete cascade,
    seq         integer not null,
    ingredient  text    not null,
    primary key (product_id, seq),
    unique (product_id, ingredient)
);

-- 원산지 (문서에 원산지가 적힌 원재료만)
create table public.ingredient_origins (
    product_id  text not null,
    ingredient  text not null,
    origin      text not null,
    primary key (product_id, ingredient),
    foreign key (product_id, ingredient)
        references public.product_ingredients (product_id, ingredient) on delete cascade
);

-- 보관 기간 (기간이 명시된 보관 방법만)
create table public.storage_periods (
    product_id    text    not null references public.products (product_id) on delete cascade,
    stage         text    not null check (stage in ('개봉 전', '개봉 후', '공통')),
    temp_zone     text    not null check (temp_zone in ('상온', '냉장', '냉동')),
    method_text   text    not null,
    period_value  integer not null check (period_value > 0),
    period_unit   text    not null check (period_unit in ('일', '주', '개월')),
    primary key (product_id, stage, method_text)
);

-- 금지 사항 (보관 · 조리)
create table public.prohibitions (
    product_id  text not null references public.products (product_id) on delete cascade,
    stage       text not null check (stage in ('개봉 후', '공통', '조리')),
    action      text not null,
    reason      text not null,
    primary key (product_id, action)
);

-- 상품별 알레르기
create table public.product_allergens (
    product_id  text not null references public.products (product_id) on delete cascade,
    allergen    text not null references public.allergens (allergen),
    relation    text not null check (relation in ('함유', '생산 라인 공유', '불포함')),
    primary key (product_id, allergen)
);

-- 기타 안내
create table public.product_notices (
    notice_id    bigint generated always as identity primary key,
    product_id   text not null references public.products (product_id) on delete cascade,
    notice_type  text not null check (notice_type in
                   ('섭취 안내', '섭취 주의', '조리 안내', '보관 안내', '품질 안내', '판매 안내')),
    content      text not null
);

-- 하위 테이블 조회용 인덱스 (복합 PK 첫 컬럼으로 커버되지 않는 것만)
create index on public.product_notices (product_id);
create index on public.product_allergens (allergen);

-- Supabase Table Editor에 보이는 설명
comment on table public.products            is '상품 기본 정보 (전 상품 공통 항목만)';
comment on table public.product_ingredients is '원재료. 단일 원재료 상품은 1행 = 100%';
comment on table public.ingredient_origins  is '원산지. 문서에 원산지가 적힌 원재료만';
comment on table public.storage_periods     is '기간이 명시된 보관 방법';
comment on table public.prohibitions        is '보관 · 조리 금지 사항과 이유';
comment on table public.allergens           is '알레르기 유발 물질 코드';
comment on table public.product_allergens   is '상품별 알레르기 (함유 / 생산 라인 공유 / 불포함)';
comment on table public.product_notices     is '섭취 · 조리 · 보관 팁 · 품질 · 판매 기간 · 섭취 주의 안내';
comment on table public.shipping_policy     is '배송 정책 (전 상품 공통)';
comment on table public.same_day_districts  is '당일 배송 지역';

comment on column public.products.product_id         is '상품 코드 (예: P-0113)';
comment on column public.products.package_desc       is '용량 · 구성 (예: 1.5kg(5~6개))';
comment on column public.products.price_krw          is '판매가(원)';
comment on column public.products.allergy_status     is '주의 필요 / 없음. 상세는 product_allergens';
comment on column public.storage_periods.temp_zone   is '검색용 표준 분류 (상온 / 냉장 / 냉동)';
comment on column public.storage_periods.method_text is '문서 원문 표현';
comment on column public.prohibitions.action         is '하면 안 되는 행동';
comment on column public.shipping_policy.same_day_cutoff       is '당일 배송 주문 마감 시각';
comment on column public.shipping_policy.free_shipping_min_krw is '무료 배송 최소 주문 금액';
comment on column public.shipping_policy.shipping_fee_krw      is '무료 배송 미만일 때 배송비';

-- RLS: API(anon · authenticated)는 읽기만 허용, 쓰기는 대시보드 또는 service_role로만
do $$
declare
    t text;
begin
    foreach t in array array[
        'shipping_policy', 'same_day_districts', 'allergens', 'products', 'product_ingredients',
        'ingredient_origins', 'storage_periods', 'prohibitions', 'product_allergens', 'product_notices'
    ] loop
        execute format('alter table public.%I enable row level security', t);
        execute format('create policy "공개 읽기" on public.%I for select to anon, authenticated using (true)', t);
    end loop;
end $$;
