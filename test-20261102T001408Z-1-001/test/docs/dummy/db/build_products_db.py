# docs/dummy/products/ 의 가상 상품 10건을 SQLite DB(products.db)로 만든다
# 실행: python docs/dummy/db/build_products_db.py  (기존 DB는 지우고 새로 만듦)
#
# 설계 원칙
# - 모든 상품에 항상 있는 정보만 products 컬럼으로 둔다
# - 상품마다 있거나 없거나 개수가 다른 정보는 유형별 하위 테이블에 "있는 것만" 행으로 넣는다
#   → 빈 칸(NULL) 대신 "행이 없음"으로 표현하므로 모든 컬럼이 NOT NULL
# - 값의 종류가 정해진 컬럼은 CHECK 또는 코드 테이블로 고정한다
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).with_name("products.db")

SCHEMA = """
-- 배송 정책 (10개 문서 공통이라 한 행)
CREATE TABLE shipping_policy (
    policy_id              INTEGER PRIMARY KEY,
    same_day_cutoff        TEXT    NOT NULL,  -- 당일 배송 주문 마감 시각
    other_region_delivery  TEXT    NOT NULL,  -- 당일 배송 지역 외 배송
    free_shipping_min_krw  INTEGER NOT NULL,  -- 무료 배송 최소 주문 금액
    shipping_fee_krw       INTEGER NOT NULL   -- 무료 배송 미만일 때 배송비
);

-- 당일 배송 지역 (정책 하나에 여러 행)
CREATE TABLE same_day_districts (
    policy_id  INTEGER NOT NULL REFERENCES shipping_policy(policy_id),
    district   TEXT    NOT NULL,
    PRIMARY KEY (policy_id, district)
);

-- 알레르기 유발 물질 코드
CREATE TABLE allergens (
    allergen  TEXT PRIMARY KEY
);

-- 상품 기본 정보 (전 상품에 있는 정보만)
CREATE TABLE products (
    product_id          TEXT    PRIMARY KEY,  -- 상품 코드 (예: P-0113)
    name                TEXT    NOT NULL,     -- 상품명
    package_desc        TEXT    NOT NULL,     -- 용량 · 구성
    price_krw           INTEGER NOT NULL,     -- 판매가(원)
    description         TEXT    NOT NULL,     -- 상품 설명
    allergy_status      TEXT    NOT NULL CHECK (allergy_status IN ('주의 필요', '없음')),
    shipping_policy_id  INTEGER NOT NULL REFERENCES shipping_policy(policy_id)
);

-- 원재료 (상품 하나에 여러 행, 단일 원재료 상품은 1행 = 100%)
CREATE TABLE product_ingredients (
    product_id  TEXT    NOT NULL REFERENCES products(product_id),
    seq         INTEGER NOT NULL,             -- 표시 순서
    ingredient  TEXT    NOT NULL,
    PRIMARY KEY (product_id, seq),
    UNIQUE (product_id, ingredient)
);

-- 원산지 (문서에 원산지가 적힌 원재료만)
CREATE TABLE ingredient_origins (
    product_id  TEXT NOT NULL,
    ingredient  TEXT NOT NULL,
    origin      TEXT NOT NULL,
    PRIMARY KEY (product_id, ingredient),
    FOREIGN KEY (product_id, ingredient) REFERENCES product_ingredients(product_id, ingredient)
);

-- 보관 기간 (기간이 명시된 보관 방법만)
CREATE TABLE storage_periods (
    product_id    TEXT    NOT NULL REFERENCES products(product_id),
    stage         TEXT    NOT NULL CHECK (stage IN ('개봉 전', '개봉 후', '공통')),
    temp_zone     TEXT    NOT NULL CHECK (temp_zone IN ('상온', '냉장', '냉동')),  -- 검색용 표준 분류
    method_text   TEXT    NOT NULL,           -- 문서 원문 표현
    period_value  INTEGER NOT NULL,
    period_unit   TEXT    NOT NULL CHECK (period_unit IN ('일', '주', '개월')),
    PRIMARY KEY (product_id, stage, method_text)
);

-- 금지 사항 (보관 · 조리 모두, 이유가 함께 적힌 것)
CREATE TABLE prohibitions (
    product_id  TEXT NOT NULL REFERENCES products(product_id),
    stage       TEXT NOT NULL CHECK (stage IN ('개봉 후', '공통', '조리')),
    action      TEXT NOT NULL,                -- 하면 안 되는 행동
    reason      TEXT NOT NULL,
    PRIMARY KEY (product_id, action)
);

-- 알레르기 상세 (함유 · 생산 라인 공유 · 불포함이 명시된 물질만)
CREATE TABLE product_allergens (
    product_id  TEXT NOT NULL REFERENCES products(product_id),
    allergen    TEXT NOT NULL REFERENCES allergens(allergen),
    relation    TEXT NOT NULL CHECK (relation IN ('함유', '생산 라인 공유', '불포함')),
    PRIMARY KEY (product_id, allergen)
);

-- 기타 안내 (섭취 · 조리 · 보관 팁 · 품질 · 판매 기간 · 섭취 주의)
CREATE TABLE product_notices (
    notice_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id   TEXT NOT NULL REFERENCES products(product_id),
    notice_type  TEXT NOT NULL CHECK (notice_type IN
                   ('섭취 안내', '섭취 주의', '조리 안내', '보관 안내', '품질 안내', '판매 안내')),
    content      TEXT NOT NULL
);
"""

SHIPPING = (1, "14:00", "익일 배송", 30000, 2500)
SAME_DAY_DISTRICTS = [(1, "수성구"), (1, "달서구")]

ALLERGENS = ["견과류", "글루텐", "밀", "대두", "계란"]

# (product_id, name, package_desc, price_krw, description, allergy_status)
PRODUCTS = [
    ("P-0113", "대구사과칩", "60g", 4900,
     "팔공산 사과 100%를 저온에서 말린 과자. 설탕 · 첨가물 없음", "주의 필요"),
    ("P-0127", "팔공산 꿀사과", "2kg(7~9개)", 18000,
     "팔공산 해발 400m 과수원의 부사. 당도 14Brix 이상 선별", "없음"),
    ("P-0205", "성주 참외", "1.5kg(5~6개)", 12000, "성주 하우스 참외 특품", "없음"),
    ("P-0207", "참외청", "350ml", 9500, "성주 참외와 비정제 원당을 1:1로 재운 청", "없음"),
    ("P-0305", "청도 반건시", "500g(10개)", 15000,
     "청도 감을 20일 자연 건조한 반건시. 겉은 쫀득, 속은 촉촉", "없음"),
    ("P-0312", "의성 마늘", "1kg(약 15통)", 11000,
     "의성 한지형 마늘. 알이 단단하고 매운맛이 강함", "없음"),
    ("P-0318", "흑마늘 진액", "70ml × 30포", 24000, "의성 마늘을 15일 숙성한 흑마늘 추출액", "없음"),
    ("P-0402", "서문시장 납작만두", "20개(500g)", 7900,
     "서문시장식 납작만두. 당면 · 부추 소, 간장 양념 포함", "주의 필요"),
    ("P-0410", "달성 토마토", "1kg(6~8개)", 8500,
     "달성군 하빈면 완숙 토마토. 산도가 낮아 생식용", "없음"),
    ("P-0421", "경산 대추칩", "50g", 5500, "경산 대추를 씨 빼고 말린 칩", "주의 필요"),
]

# (product_id, seq, ingredient)
INGREDIENTS = [
    ("P-0113", 1, "사과"),
    ("P-0127", 1, "사과"),
    ("P-0205", 1, "참외"),
    ("P-0207", 1, "참외"), ("P-0207", 2, "비정제 원당"),
    ("P-0305", 1, "감"),
    ("P-0312", 1, "마늘"),
    ("P-0318", 1, "흑마늘"), ("P-0318", 2, "정제수"),
    ("P-0402", 1, "밀가루"), ("P-0402", 2, "당면"), ("P-0402", 3, "부추"), ("P-0402", 4, "대두(간장)"),
    ("P-0410", 1, "토마토"),
    ("P-0421", 1, "대추"),
]

# (product_id, ingredient, origin) — 문서에 원산지가 적힌 것만
ORIGINS = [
    ("P-0113", "사과", "대구 팔공산"),
    ("P-0127", "사과", "대구 팔공산"),
    ("P-0205", "참외", "경북 성주"),
    ("P-0207", "참외", "경북 성주"), ("P-0207", "비정제 원당", "국내산"),
    ("P-0305", "감", "경북 청도"),
    ("P-0312", "마늘", "경북 의성"),
    ("P-0318", "흑마늘", "경북 의성"),
    ("P-0410", "토마토", "대구 달성"),
    ("P-0421", "대추", "경북 경산"),
]

# (product_id, stage, temp_zone, method_text, period_value, period_unit)
STORAGE_PERIODS = [
    ("P-0113", "개봉 후", "상온", "밀봉해 서늘한 곳", 7, "일"),
    ("P-0127", "공통", "냉장", "냉장", 3, "주"),
    ("P-0127", "공통", "상온", "상온", 7, "일"),
    ("P-0205", "공통", "냉장", "냉장", 5, "일"),
    ("P-0207", "개봉 전", "상온", "상온", 12, "개월"),
    ("P-0207", "개봉 후", "냉장", "냉장", 30, "일"),
    ("P-0305", "공통", "냉장", "냉장", 10, "일"),
    ("P-0312", "공통", "상온", "통풍이 잘 되는 그늘, 망에 보관", 2, "개월"),
    ("P-0318", "개봉 전", "상온", "상온", 18, "개월"),
    ("P-0402", "공통", "냉동", "냉동", 3, "개월"),
    ("P-0410", "공통", "상온", "실온", 3, "일"),
    ("P-0410", "공통", "냉장", "냉장", 7, "일"),
    ("P-0421", "개봉 후", "상온", "밀봉해 상온", 14, "일"),
]

# (product_id, stage, action, reason)
PROHIBITIONS = [
    ("P-0113", "개봉 후", "냉장 보관", "습기를 먹어 눅눅해짐"),
    ("P-0127", "공통", "다른 과일과 함께 보관", "에틸렌으로 다른 과일이 빨리 익음"),
    ("P-0207", "공통", "금속 숟가락 사용", "발효가 빨라짐. 나무 또는 플라스틱 사용"),
    ("P-0305", "공통", "냉동 보관", "해동하면 수분이 빠져 질겨짐"),
    ("P-0312", "공통", "비닐봉지에 밀봉", "곰팡이가 생김"),
    ("P-0312", "공통", "냉장 보관", "싹이 남"),
    ("P-0402", "조리", "전자레인지 조리", "피가 질겨짐"),
    ("P-0421", "공통", "실리카겔 버리기", "습기에 약함"),
]

# (product_id, allergen, relation)
PRODUCT_ALLERGENS = [
    ("P-0113", "견과류", "생산 라인 공유"),
    ("P-0113", "글루텐", "불포함"),
    ("P-0402", "밀", "함유"),
    ("P-0402", "대두", "함유"),
    ("P-0402", "계란", "생산 라인 공유"),
    ("P-0421", "견과류", "생산 라인 공유"),
]

# (product_id, notice_type, content)
NOTICES = [
    ("P-0113", "보관 안내", "개봉 전 유통기한 6개월"),
    ("P-0127", "품질 안내", "표면 왁스 코팅 없음"),
    ("P-0205", "섭취 안내", "꼭지가 마르면 당도가 떨어지므로 받은 날부터 3일 안에 섭취 권장"),
    ("P-0205", "판매 안내", "4~7월 한정 판매"),
    ("P-0207", "섭취 안내", "탄산수 희석 비율 1:4"),
    ("P-0305", "보관 안내", "받은 즉시 냉장"),
    ("P-0305", "품질 안내", "표면의 흰 가루는 당분이 굳은 것으로 정상"),
    ("P-0318", "섭취 안내", "하루 1포 권장"),
    ("P-0318", "섭취 안내", "개봉한 포는 당일 섭취"),
    ("P-0318", "보관 안내", "여름철에는 냉장 보관 권장"),
    ("P-0318", "섭취 주의", "임산부 · 수술 전후는 섭취 전 전문가 상담"),
    ("P-0402", "조리 안내", "해동하지 말고 냉동 상태로 팬에 기름 두르고 중불 3분"),
    ("P-0410", "보관 안내", "꼭지를 아래로 두고 보관 — 수분 증발을 줄임"),
    ("P-0410", "섭취 안내", "냉장 후 먹기 30분 전 꺼내면 맛이 돌아옴"),
    ("P-0421", "섭취 안내", "차로 우려도 됨(80℃ 물 300ml에 5조각)"),
]


def main():
    DB_PATH.unlink(missing_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript(SCHEMA)
    con.execute("INSERT INTO shipping_policy VALUES (?, ?, ?, ?, ?)", SHIPPING)
    con.executemany("INSERT INTO same_day_districts VALUES (?, ?)", SAME_DAY_DISTRICTS)
    con.executemany("INSERT INTO allergens VALUES (?)", [(a,) for a in ALLERGENS])
    con.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, 1)", PRODUCTS)
    con.executemany("INSERT INTO product_ingredients VALUES (?, ?, ?)", INGREDIENTS)
    con.executemany("INSERT INTO ingredient_origins VALUES (?, ?, ?)", ORIGINS)
    con.executemany("INSERT INTO storage_periods VALUES (?, ?, ?, ?, ?, ?)", STORAGE_PERIODS)
    con.executemany("INSERT INTO prohibitions VALUES (?, ?, ?, ?)", PROHIBITIONS)
    con.executemany("INSERT INTO product_allergens VALUES (?, ?, ?)", PRODUCT_ALLERGENS)
    con.executemany(
        "INSERT INTO product_notices (product_id, notice_type, content) VALUES (?, ?, ?)", NOTICES)
    con.commit()
    con.close()
    print(f"생성 완료: {DB_PATH}")


if __name__ == "__main__":
    main()
