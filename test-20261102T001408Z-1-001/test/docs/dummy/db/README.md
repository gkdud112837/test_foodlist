# 가상 상품 DB (products.db)

`docs/dummy/products/`의 가상 상품 10건을 SQLite로 옮긴 실습용 DB. 실습 밖에서 쓰지 않는다.

- 생성: `python docs/dummy/db/build_products_db.py` (실행할 때마다 새로 만듦)
- 데이터를 고칠 때는 스크립트를 고치고 다시 실행한다

## Supabase

운영은 Supabase(PostgreSQL)에서 한다. 파일은 `supabase/` 폴더에 있다.

| 파일 | 내용 |
| --- | --- |
| schema.sql | 테이블 · 제약 · 인덱스 · 설명(comment) · RLS 정책 |
| seed.sql | 초기 데이터 (자동 생성, 직접 고치지 않음) |
| make_seed.py | build_products_db.py 의 데이터로 seed.sql 생성 |

처음 올리는 순서

1. Supabase 대시보드 → SQL Editor에서 `schema.sql` 전체를 붙여넣고 실행
2. 이어서 `seed.sql` 실행 (빈 테이블에 한 번만. 다시 실행하면 PK 충돌로 실패하고 아무것도 바뀌지 않음)

권한(RLS): 모든 테이블에 RLS를 켜고 `anon` · `authenticated`에는 읽기만 허용한다. 쓰기는 대시보드 Table Editor나 `service_role` 키로만 한다.

Supabase에 올린 뒤에는 Supabase가 원본이다. 대시보드에서 데이터를 고쳤다면 `build_products_db.py`와 SQLite DB는 그 변경을 모른다.

## 설계 원칙

1. 모든 상품에 항상 있는 정보만 `products` 컬럼으로 둔다
2. 상품마다 있거나 없거나 개수가 다른 정보는 유형별 하위 테이블에 **있는 것만 행으로** 넣는다. 빈 칸(NULL) 대신 "행이 없음"으로 표현하므로 모든 컬럼이 NOT NULL이다
3. 값의 종류가 정해진 컬럼은 CHECK 또는 코드 테이블(`allergens`)로 고정한다
4. 문서에 없는 정보는 채우지 않는다. 행이 없으면 "문서에 없음"이라는 뜻이다

## 테이블

| 테이블 | 행 수 | 내용 |
| --- | --- | --- |
| products | 10 | 상품 기본 정보 (전 상품 공통 항목만) |
| product_ingredients | 15 | 원재료. 단일 원재료 상품은 1행 = 100% |
| ingredient_origins | 10 | 원산지. 문서에 원산지가 적힌 원재료만 |
| storage_periods | 13 | 기간이 명시된 보관 방법 |
| prohibitions | 8 | 보관 · 조리 금지 사항과 이유 |
| allergens | 5 | 알레르기 유발 물질 코드 |
| product_allergens | 6 | 상품별 알레르기 (함유 / 생산 라인 공유 / 불포함) |
| product_notices | 15 | 섭취 · 조리 · 보관 팁 · 품질 · 판매 기간 · 섭취 주의 안내 |
| shipping_policy | 1 | 배송 정책 (전 상품 공통) |
| same_day_districts | 2 | 당일 배송 지역 |

## products

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| product_id | TEXT PK | 상품 코드 (예: P-0113) |
| name | TEXT | 상품명 |
| package_desc | TEXT | 용량 · 구성 (예: 1.5kg(5~6개)) |
| price_krw | INTEGER | 판매가(원) |
| description | TEXT | 상품 설명 |
| allergy_status | TEXT | 주의 필요 / 없음. 상세는 product_allergens |
| shipping_policy_id | INTEGER FK | shipping_policy.policy_id |

## product_ingredients · ingredient_origins

| 테이블 | 필드 | 설명 |
| --- | --- | --- |
| product_ingredients | product_id, seq, ingredient | 원재료와 표시 순서 |
| ingredient_origins | product_id, ingredient, origin | 원재료별 원산지 (예: 참외 → 경북 성주) |

## storage_periods

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| product_id | TEXT FK | products.product_id |
| stage | TEXT | 개봉 전 / 개봉 후 / 공통 |
| temp_zone | TEXT | 상온 / 냉장 / 냉동 (검색용 표준 분류) |
| method_text | TEXT | 문서 원문 표현 (예: 밀봉해 서늘한 곳) |
| period_value | INTEGER | 보관 기간 숫자 |
| period_unit | TEXT | 일 / 주 / 개월 |

## prohibitions

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| product_id | TEXT FK | products.product_id |
| stage | TEXT | 개봉 후 / 공통 / 조리 |
| action | TEXT | 하면 안 되는 행동 (예: 냉장 보관) |
| reason | TEXT | 이유 |

## product_allergens

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| product_id | TEXT FK | products.product_id |
| allergen | TEXT FK | allergens.allergen |
| relation | TEXT | 함유 / 생산 라인 공유 / 불포함 |

## product_notices

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| notice_id | INTEGER PK | 자동 증가 |
| product_id | TEXT FK | products.product_id |
| notice_type | TEXT | 섭취 안내 / 섭취 주의 / 조리 안내 / 보관 안내 / 품질 안내 / 판매 안내 |
| content | TEXT | 안내 문구 |

## shipping_policy · same_day_districts

| 테이블 | 필드 | 설명 |
| --- | --- | --- |
| shipping_policy | policy_id | 정책 번호 (현재 1만 있음) |
| shipping_policy | same_day_cutoff | 당일 배송 주문 마감 (14:00) |
| shipping_policy | other_region_delivery | 당일 배송 지역 외 배송 (익일 배송) |
| shipping_policy | free_shipping_min_krw | 무료 배송 최소 주문 금액 (30000) |
| shipping_policy | shipping_fee_krw | 무료 배송 미만일 때 배송비 (2500) |
| same_day_districts | policy_id, district | 당일 배송 지역 (수성구, 달서구) |

## 예시 쿼리

```sql
-- 대구사과칩 개봉 후: 보관 기간과 금지 사항
SELECT method_text, period_value, period_unit FROM storage_periods
WHERE product_id = 'P-0113' AND stage = '개봉 후';
SELECT action, reason FROM prohibitions WHERE product_id = 'P-0113';

-- 견과류 알레르기 주의 상품
SELECT p.name, a.relation FROM product_allergens a JOIN products p USING (product_id)
WHERE a.allergen = '견과류';

-- 냉장 보관하면 안 되는 상품
SELECT p.name, x.reason FROM prohibitions x JOIN products p USING (product_id)
WHERE x.action = '냉장 보관';
```
