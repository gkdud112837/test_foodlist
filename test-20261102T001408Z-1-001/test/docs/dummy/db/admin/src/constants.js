// schema.sql 의 CHECK 제약과 같은 값. 스키마를 바꾸면 여기도 같이 바꾼다
export const STORAGE_STAGES = ['개봉 전', '개봉 후', '공통'];
export const TEMP_ZONES = ['상온', '냉장', '냉동'];
export const PERIOD_UNITS = ['일', '주', '개월'];
export const PROHIBITION_STAGES = ['개봉 후', '공통', '조리'];
export const ALLERGEN_RELATIONS = ['함유', '생산 라인 공유', '불포함'];
export const NOTICE_TYPES = ['섭취 안내', '섭취 주의', '조리 안내', '보관 안내', '품질 안내', '판매 안내'];

// 알레르기 주의가 필요한 관계 (불포함은 제외)
export const RISK_RELATIONS = ['함유', '생산 라인 공유'];

export const SHIPPING_POLICY_ID = 1;
