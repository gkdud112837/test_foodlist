# build_products_db.py 의 데이터로 Supabase용 seed.sql 을 만든다
# 실행: python docs/dummy/db/supabase/make_seed.py
# 데이터 원본은 build_products_db.py 하나만 고친다
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import build_products_db as src

OUT_PATH = Path(__file__).with_name("seed.sql")

# (테이블, 컬럼 목록, 행 목록) — 외래 키 순서대로
TABLES = [
    ("shipping_policy",
     ["policy_id", "same_day_cutoff", "other_region_delivery", "free_shipping_min_krw", "shipping_fee_krw"],
     [src.SHIPPING]),
    ("same_day_districts", ["policy_id", "district"], src.SAME_DAY_DISTRICTS),
    ("allergens", ["allergen"], [(a,) for a in src.ALLERGENS]),
    ("products",
     ["product_id", "name", "package_desc", "price_krw", "description", "allergy_status", "shipping_policy_id"],
     [row + (1,) for row in src.PRODUCTS]),
    ("product_ingredients", ["product_id", "seq", "ingredient"], src.INGREDIENTS),
    ("ingredient_origins", ["product_id", "ingredient", "origin"], src.ORIGINS),
    ("storage_periods",
     ["product_id", "stage", "temp_zone", "method_text", "period_value", "period_unit"],
     src.STORAGE_PERIODS),
    ("prohibitions", ["product_id", "stage", "action", "reason"], src.PROHIBITIONS),
    ("product_allergens", ["product_id", "allergen", "relation"], src.PRODUCT_ALLERGENS),
    ("product_notices", ["product_id", "notice_type", "content"], src.NOTICES),
]


def literal(value):
    # 파이썬 값을 SQL 리터럴로 바꾼다
    if isinstance(value, int):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def main():
    lines = [
        "-- 자동 생성 파일: 직접 고치지 말고 make_seed.py 를 다시 실행한다",
        "-- schema.sql 실행 후 빈 테이블에 한 번 실행한다 (중복 실행 시 PK 충돌로 실패)",
        "begin;",
        "",
    ]
    for table, cols, rows in TABLES:
        lines.append(f"insert into public.{table} ({', '.join(cols)}) values")
        values = [f"    ({', '.join(literal(v) for v in row)})" for row in rows]
        lines.append(",\n".join(values) + ";")
        lines.append("")
    lines.append("commit;")
    OUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"생성 완료: {OUT_PATH}")


if __name__ == "__main__":
    main()
