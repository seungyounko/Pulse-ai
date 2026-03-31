import { UserProfile, UserRole, Department, GoalIndicator, TeamGoal, MemberGoal, PerformanceEvent, GoalCategory } from './types';

export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'team-dev-1', name: '개발 1팀', type: 'Team' },
  { id: 'wg-domestic', name: '국내매매 파트', type: 'WorkGroup', parentId: 'team-dev-1', categoryWeights: { achievement: 50, job: 30, competency: 20 } },
  { id: 'wg-overseas', name: '해외매매 파트', type: 'WorkGroup', parentId: 'team-dev-1', categoryWeights: { achievement: 50, job: 30, competency: 20 } },
  { id: 'wg-derivatives', name: '파생매매 파트', type: 'WorkGroup', parentId: 'team-dev-1', categoryWeights: { achievement: 60, job: 20, competency: 20 } },
  { id: 'wg-finance', name: '금융상품 파트', type: 'WorkGroup', parentId: 'team-dev-1', categoryWeights: { achievement: 40, job: 40, competency: 20 } },
  { id: 'wg-backoffice', name: '본사후선 파트', type: 'WorkGroup', parentId: 'team-dev-1', categoryWeights: { achievement: 30, job: 40, competency: 30 } },
  { id: 'team-dev-2', name: '개발 2팀', type: 'Team' },
  { id: 'team-ops', name: '인프라 운영팀', type: 'Team' },
  { id: 'team-sec', name: '정보 보안팀', type: 'Team' },
  { id: 'team-qa', name: '품질 관리팀', type: 'Team' },
];

export const MOCK_INDICATORS: GoalIndicator[] = [
  // Achievement (업적)
  { id: 'kpi-ach-1', code: 'ACH-001', name: '서비스 가동률', description: '시스템 가동률 99.9% 이상 유지', criteria: 'ITSM 장애 티켓 분석 (장애 시간 / 전체 시간)' },
  { id: 'kpi-ach-2', code: 'ACH-002', name: '매출 목표 달성률', description: '분기별 매출 목표 대비 실적', criteria: 'ERP 매출 데이터 연동' },
  { id: 'kpi-ach-3', code: 'ACH-003', name: '고객 만족도(NPS)', description: '사용자 설문 조사를 통한 만족도 점수', criteria: '설문 시스템(SurveyMonkey 등) 결과 점수' },
  { id: 'kpi-ach-4', code: 'ACH-004', name: '신규 유입자 수', description: '월간 신규 가입자 수 목표', criteria: 'GA4(Google Analytics) 신규 사용자 수' },
  { id: 'kpi-ach-5', code: 'ACH-005', name: '비용 절감률', description: '전년 대비 운영 비용 절감 비율', criteria: '회계 시스템 예산 집행 대비 실적' },
  
  // Job (직무)
  { id: 'kpi-job-1', code: 'JOB-001', name: '프로젝트 완료율', description: '계획 대비 프로젝트 완수 비율', criteria: '레드마인(Redmine) 프로젝트 진척도 및 완료 상태' },
  { id: 'kpi-job-2', code: 'JOB-002', name: '코드 리뷰 참여도', description: '주간 평균 코드 리뷰 수행 건수', criteria: 'GitLab/GitHub PR/MR 리뷰 데이터' },
  { id: 'kpi-job-3', code: 'JOB-003', name: '장애 조치 시간(MTTR)', description: '장애 발생 시 평균 복구 시간', criteria: 'ITSM 장애 조치 완료 시간 - 발생 시간' },
  { id: 'kpi-job-4', code: 'JOB-004', name: '보안 취약점 조치율', description: '발견된 취약점 대비 조치 완료 비율', criteria: '보안 점검 시스템 조치 결과' },
  { id: 'kpi-job-5', code: 'JOB-005', name: '배포 성공률', description: '전체 배포 시도 대비 성공 비율', criteria: 'Jenkins/ArgoCD 배포 로그 분석' },
  
  // Competency (역량)
  { id: 'kpi-comp-1', code: 'COMP-001', name: '기술 공유 세미나', description: '팀 내 기술 공유 세미나 발표 횟수' },
  { id: 'kpi-comp-2', code: 'COMP-002', name: '자격증 취득', description: '직무 관련 전문 자격증 취득' },
  { id: 'kpi-comp-3', code: 'COMP-003', name: '외국어 능력 향상', description: '공인 어학 성적 향상' },
  { id: 'kpi-comp-4', code: 'COMP-004', name: '리더십 평가 점수', description: '다면 평가를 통한 리더십 역량 측정' },
  { id: 'kpi-comp-5', code: 'COMP-005', name: '협업 만족도', description: '동료 평가를 통한 협업 능력 측정' },
  
  ...Array.from({ length: 35 }, (_, i) => ({
    id: `kpi-extra-${i + 1}`,
    code: `KPI-EXT-${String(i + 1).padStart(3, '0')}`,
    name: `기타 지표 ${i + 1}`,
    description: `추가적인 성과 측정을 위한 지표입니다. (인덱스 ${i + 1})`
  }))
];

export const MOCK_USERS: UserProfile[] = [
  {
    uid: 'mock-admin-id',
    name: '데모 관리자',
    email: 'admin@example.com',
    role: 'admin',
    teamId: 'team-dev-1',
    position: '시스템 관리자',
    photoURL: 'https://picsum.photos/seed/admin/200/200'
  },
  {
    uid: 'mock-leader-id',
    name: '데모 팀장',
    email: 'leader@example.com',
    role: 'leader',
    teamId: 'team-dev-1',
    position: '개발 팀장',
    photoURL: 'https://picsum.photos/seed/leader/200/200'
  },
  {
    uid: 'mock-member-id',
    name: '데모 팀원',
    email: 'member@example.com',
    role: 'member',
    teamId: 'team-dev-1',
    workGroupId: 'wg-domestic',
    position: '국내매매 담당자',
    photoURL: 'https://picsum.photos/seed/member/200/200'
  },
  {
    uid: 'mock-leader-2-id',
    name: '이팀장',
    email: 'leader2@example.com',
    role: 'leader',
    teamId: 'team-dev-2',
    position: '개발 2팀장',
    photoURL: 'https://picsum.photos/seed/leader2/200/200'
  },
  {
    uid: 'mock-leader-ops-id',
    name: '박운영',
    email: 'ops@example.com',
    role: 'leader',
    teamId: 'team-ops',
    position: '운영 팀장',
    photoURL: 'https://picsum.photos/seed/ops/200/200'
  },
  {
    uid: 'mock-member-dev2-id',
    name: '김개발',
    email: 'dev2@example.com',
    role: 'member',
    teamId: 'team-dev-2',
    position: '백엔드 개발자',
    photoURL: 'https://picsum.photos/seed/dev2/200/200'
  },
  {
    uid: 'mock-member-overseas-id',
    name: '최글로벌',
    email: 'global@example.com',
    role: 'member',
    teamId: 'team-dev-1',
    workGroupId: 'wg-overseas',
    position: '해외매매 시스템 담당',
    photoURL: 'https://picsum.photos/seed/global/200/200'
  },
  {
    uid: 'mock-member-derivatives-id',
    name: '정파생',
    email: 'derivatives@example.com',
    role: 'member',
    teamId: 'team-dev-1',
    workGroupId: 'wg-derivatives',
    position: '파생상품 시스템 개발',
    photoURL: 'https://picsum.photos/seed/derivatives/200/200'
  },
  {
    uid: 'mock-member-finance-id',
    name: '강금융',
    email: 'finance@example.com',
    role: 'member',
    teamId: 'team-dev-1',
    workGroupId: 'wg-finance',
    position: '금융상품 시스템 운영',
    photoURL: 'https://picsum.photos/seed/finance/200/200'
  },
  {
    uid: 'mock-member-backoffice-id',
    name: '한지원',
    email: 'backoffice@example.com',
    role: 'member',
    teamId: 'team-dev-1',
    workGroupId: 'wg-backoffice',
    position: '백오피스 자동화 담당',
    photoURL: 'https://picsum.photos/seed/backoffice/200/200'
  },
  {
    uid: 'mock-leader-sec-id',
    name: '안보안',
    email: 'sec-leader@example.com',
    role: 'leader',
    teamId: 'team-sec',
    position: '정보보안 팀장',
    photoURL: 'https://picsum.photos/seed/secleader/200/200'
  },
  {
    uid: 'mock-member-sec-id',
    name: '김보안',
    email: 'sec-member@example.com',
    role: 'member',
    teamId: 'team-sec',
    position: '보안 관제 담당',
    photoURL: 'https://picsum.photos/seed/secmember/200/200'
  },
  {
    uid: 'mock-leader-qa-id',
    name: '고품질',
    email: 'qa-leader@example.com',
    role: 'leader',
    teamId: 'team-qa',
    position: '품질관리 팀장',
    photoURL: 'https://picsum.photos/seed/qaleader/200/200'
  },
  {
    uid: 'mock-member-qa-id',
    name: '이검수',
    email: 'qa-member@example.com',
    role: 'member',
    teamId: 'team-qa',
    position: 'QA 엔지니어',
    photoURL: 'https://picsum.photos/seed/qamember/200/200'
  },
  {
    uid: 'mock-member-ops-id',
    name: '테스트 팀원',
    email: 'test-member@example.com',
    role: 'member',
    teamId: 'team-ops',
    position: '인프라 운영 담당',
    photoURL: 'https://picsum.photos/seed/testmember/200/200'
  },
  {
    uid: 'mock-member-dev2-2-id',
    name: '박개발',
    email: 'dev2-2@example.com',
    role: 'member',
    teamId: 'team-dev-2',
    position: '프론트엔드 개발자',
    photoURL: 'https://picsum.photos/seed/dev22/200/200'
  },
  ...Array.from({ length: 20 }, (_, i) => ({
    uid: `mock-extra-user-${i + 1}`,
    name: `추가 직원 ${i + 1}`,
    email: `extra${i + 1}@example.com`,
    role: 'member' as UserRole,
    teamId: i % 2 === 0 ? 'team-dev-1' : 'team-dev-2',
    workGroupId: i % 2 === 0 ? 'wg-domestic' : undefined,
    position: i % 3 === 0 ? '주니어 개발자' : i % 3 === 1 ? '디자이너' : '기획자',
    photoURL: `https://picsum.photos/seed/extra${i + 1}/200/200`
  }))
];

export const MOCK_TEAM_GOALS: TeamGoal[] = [
  {
    id: 'team-goal-dev-1-2026',
    departmentId: 'team-dev-1',
    year: 2026,
    status: 'published',
    narrative: '2026년 개발 1팀의 핵심 목표는 시스템 안정성 99.9% 달성 및 신규 아키텍처 전환입니다.',
    categoryWeights: { achievement: 40, job: 30, competency: 30 },
    customIndicators: [
      { indicatorId: 'kpi-ach-1', customDescription: '메인 서비스 가동률 99.9% 유지', category: 'achievement', weight: 40 },
      { indicatorId: 'kpi-ach-2', customDescription: '매출 목표 달성 지원', category: 'achievement', weight: 30 },
      { indicatorId: 'kpi-ach-3', customDescription: '고객 만족도 점수 향상', category: 'achievement', weight: 30 },
      { indicatorId: 'kpi-job-1', customDescription: '신규 아키텍처 전환 프로젝트 완수', category: 'job', weight: 40 },
      { indicatorId: 'kpi-job-2', customDescription: '코드 리뷰 참여도 향상', category: 'job', weight: 30 },
      { indicatorId: 'kpi-job-3', customDescription: '장애 복구 시간 단축', category: 'job', weight: 30 },
      { indicatorId: 'kpi-comp-1', customDescription: '팀 내 기술 공유 문화 정착', category: 'competency', weight: 40 },
      { indicatorId: 'kpi-comp-2', customDescription: '전문 자격증 취득 권장', category: 'competency', weight: 30 },
      { indicatorId: 'kpi-comp-5', customDescription: '협업 만족도 향상', category: 'competency', weight: 30 },
    ]
  },
  {
    id: 'team-goal-domestic-2026',
    departmentId: 'wg-domestic',
    year: 2026,
    status: 'published',
    narrative: '국내매매 파트는 안정적인 매매 시스템 운영 및 주문 처리 속도 개선을 목표로 합니다.',
    categoryWeights: { achievement: 50, job: 30, competency: 20 },
    customIndicators: [
      { indicatorId: 'kpi-ach-1', customDescription: '메인 서비스 가동률 99.9% 이상 유지', category: 'achievement', weight: 40 }, // 50% * 40% = 20%
      { indicatorId: 'kpi-ach-2', customDescription: '국내 주식 매출 목표 달성', category: 'achievement', weight: 30 }, // 50% * 30% = 15%
      { indicatorId: 'kpi-ach-3', customDescription: '고객 만족도(NPS) 향상', category: 'achievement', weight: 30 }, // 50% * 30% = 15%
      { indicatorId: 'kpi-job-1', customDescription: '매매 시스템 고도화 프로젝트 완수', category: 'job', weight: 40 }, // 30% * 40% = 12%
      { indicatorId: 'kpi-job-2', customDescription: '코드 리뷰 참여도 향상', category: 'job', weight: 30 }, // 30% * 30% = 9%
      { indicatorId: 'kpi-job-3', customDescription: '장애 조치 시간(MTTR) 단축', category: 'job', weight: 30 }, // 30% * 30% = 9%
      { indicatorId: 'kpi-comp-1', customDescription: '기술 공유 세미나 발표', category: 'competency', weight: 40 }, // 20% * 40% = 8%
      { indicatorId: 'kpi-comp-2', customDescription: '직무 관련 자격증 취득', category: 'competency', weight: 30 }, // 20% * 30% = 6%
      { indicatorId: 'kpi-comp-5', customDescription: '유관 부서 협업 만족도 향상', category: 'competency', weight: 30 }, // 20% * 30% = 6%
    ]
  },
  {
    id: 'team-goal-overseas-2026',
    departmentId: 'wg-overseas',
    year: 2026,
    status: 'published',
    narrative: '해외매매 파트는 글로벌 시장 대응력 강화 및 24시간 운영 체계 고도화를 목표로 합니다.',
    categoryWeights: { achievement: 50, job: 30, competency: 20 },
    customIndicators: [
      { indicatorId: 'kpi-ach-2', customDescription: '해외 주식 매매 목표 달성', category: 'achievement', weight: 40 },
      { indicatorId: 'kpi-ach-4', customDescription: '신규 해외 투자자 유치', category: 'achievement', weight: 30 },
      { indicatorId: 'kpi-ach-1', customDescription: '글로벌 연동 안정성 확보', category: 'achievement', weight: 30 },
      { indicatorId: 'kpi-job-1', customDescription: '글로벌 시장 데이터 연동 최적화', category: 'job', weight: 40 },
      { indicatorId: 'kpi-job-5', customDescription: '배포 성공률 관리', category: 'job', weight: 30 },
      { indicatorId: 'kpi-job-3', customDescription: '야간 장애 대응 체계 강화', category: 'job', weight: 30 },
      { indicatorId: 'kpi-comp-3', customDescription: '글로벌 역량 강화(어학 등)', category: 'competency', weight: 40 },
      { indicatorId: 'kpi-comp-5', customDescription: '글로벌 파트너사 협업', category: 'competency', weight: 30 },
      { indicatorId: 'kpi-comp-2', customDescription: '국제 금융 자격증 취득', category: 'competency', weight: 30 },
    ]
  },
  {
    id: 'team-goal-derivatives-2026',
    departmentId: 'wg-derivatives',
    year: 2026,
    status: 'published',
    narrative: '파생매매 파트는 리스크 관리 시스템 고도화 및 신규 파생상품 대응을 목표로 합니다.',
    categoryWeights: { achievement: 60, job: 20, competency: 20 },
    customIndicators: [
      { indicatorId: 'kpi-ach-2', customDescription: '파생상품 매매 수익 목표 달성', category: 'achievement', weight: 40 },
      { indicatorId: 'kpi-ach-5', customDescription: '리스크 비용 최소화', category: 'achievement', weight: 30 },
      { indicatorId: 'kpi-ach-1', customDescription: '실시간 리스크 감시 가동률', category: 'achievement', weight: 30 },
      { indicatorId: 'kpi-job-3', customDescription: '리스크 관리 시스템 장애 제로', category: 'job', weight: 40 },
      { indicatorId: 'kpi-job-4', customDescription: '보안 및 규제 준수', category: 'job', weight: 30 },
      { indicatorId: 'kpi-job-1', customDescription: '신규 파생상품 시스템 구축', category: 'job', weight: 30 },
      { indicatorId: 'kpi-comp-2', customDescription: '파생상품 전문 자격 취득', category: 'competency', weight: 40 },
      { indicatorId: 'kpi-comp-5', customDescription: '리스크 관리 협업', category: 'competency', weight: 30 },
      { indicatorId: 'kpi-comp-1', customDescription: '파생 시장 분석 공유', category: 'competency', weight: 30 },
    ]
  },
  {
    id: 'team-goal-finance-2026',
    departmentId: 'wg-finance',
    year: 2026,
    status: 'published',
    narrative: '금융상품 파트는 다양한 상품 라인업 확대 및 판매 지원 시스템 강화를 목표로 합니다.',
    categoryWeights: { achievement: 40, job: 40, competency: 20 },
    customIndicators: [
      { indicatorId: 'kpi-ach-4', customDescription: '금융상품 판매 목표 달성', category: 'achievement', weight: 40 },
      { indicatorId: 'kpi-ach-3', customDescription: '상품 가입 고객 만족도', category: 'achievement', weight: 30 },
      { indicatorId: 'kpi-ach-2', customDescription: '수수료 수익 목표 달성', category: 'achievement', weight: 30 },
      { indicatorId: 'kpi-job-1', customDescription: '상품 정보 관리 시스템 고도화', category: 'job', weight: 40 },
      { indicatorId: 'kpi-job-2', customDescription: '상품 설명서 리뷰 프로세스', category: 'job', weight: 30 },
      { indicatorId: 'kpi-job-5', customDescription: '시스템 배포 안정성', category: 'job', weight: 30 },
      { indicatorId: 'kpi-comp-5', customDescription: '상품 지식 공유 및 교육', category: 'competency', weight: 40 },
      { indicatorId: 'kpi-comp-2', customDescription: '금융 투자 분석사 자격', category: 'competency', weight: 30 },
      { indicatorId: 'kpi-comp-1', customDescription: '신상품 기술 세미나', category: 'competency', weight: 30 },
    ]
  },
  {
    id: 'team-goal-backoffice-2026',
    departmentId: 'wg-backoffice',
    year: 2026,
    status: 'published',
    narrative: '본사후선 파트는 업무 프로세스 자동화 및 효율적인 지원 체계 구축을 목표로 합니다.',
    categoryWeights: { achievement: 30, job: 40, competency: 30 },
    customIndicators: [
      { indicatorId: 'kpi-ach-5', customDescription: '업무 처리 비용 절감', category: 'achievement', weight: 40 },
      { indicatorId: 'kpi-ach-3', customDescription: '내부 고객 서비스 만족도', category: 'achievement', weight: 30 },
      { indicatorId: 'kpi-ach-1', customDescription: '백오피스 시스템 가동률', category: 'achievement', weight: 30 },
      { indicatorId: 'kpi-job-1', customDescription: '후선 업무 자동화 프로젝트 완수', category: 'job', weight: 40 },
      { indicatorId: 'kpi-job-3', customDescription: '데이터 정합성 오류 감소', category: 'job', weight: 30 },
      { indicatorId: 'kpi-job-4', customDescription: '개인정보보호 준수', category: 'job', weight: 30 },
      { indicatorId: 'kpi-comp-5', customDescription: '전사 지원 만족도 향상', category: 'competency', weight: 40 },
      { indicatorId: 'kpi-comp-1', customDescription: '업무 효율화 사례 공유', category: 'competency', weight: 30 },
      { indicatorId: 'kpi-comp-4', customDescription: '리더십 및 소통 역량', category: 'competency', weight: 30 },
    ]
  },
  {
    id: 'team-goal-dev-2-2026',
    departmentId: 'team-dev-2',
    year: 2026,
    status: 'published',
    narrative: '개발 2팀은 신규 서비스 런칭 및 사용자 경험 고도화에 집중합니다.',
    categoryWeights: { achievement: 50, job: 30, competency: 20 },
    customIndicators: [
      { indicatorId: 'kpi-ach-4', customDescription: '신규 서비스 가입자 10만명 달성', category: 'achievement', weight: 40 },
      { indicatorId: 'kpi-ach-3', customDescription: '사용자 피드백 반영률', category: 'achievement', weight: 30 },
      { indicatorId: 'kpi-ach-1', customDescription: '신규 서비스 안정성', category: 'achievement', weight: 30 },
      { indicatorId: 'kpi-job-5', customDescription: '무중단 배포 시스템 구축', category: 'job', weight: 40 },
      { indicatorId: 'kpi-job-1', customDescription: '모바일 앱 고도화 프로젝트', category: 'job', weight: 30 },
      { indicatorId: 'kpi-job-2', customDescription: '프론트엔드 코드 리뷰', category: 'job', weight: 30 },
      { indicatorId: 'kpi-comp-5', customDescription: '타 부서 협업 만족도 향상', category: 'competency', weight: 40 },
      { indicatorId: 'kpi-comp-1', customDescription: 'UI/UX 트렌드 세미나', category: 'competency', weight: 30 },
      { indicatorId: 'kpi-comp-2', customDescription: '모바일 개발 자격증', category: 'competency', weight: 30 },
    ]
  },
  {
    id: 'team-goal-ops-2026',
    departmentId: 'team-ops',
    year: 2026,
    status: 'published',
    narrative: '인프라 운영팀은 클라우드 비용 최적화 및 보안 강화를 최우선으로 합니다.',
    categoryWeights: { achievement: 40, job: 40, competency: 20 },
    customIndicators: [
      { indicatorId: 'kpi-ach-5', customDescription: '클라우드 비용 20% 절감', category: 'achievement', weight: 40 },
      { indicatorId: 'kpi-ach-1', customDescription: '전사 인프라 가동률 99.99%', category: 'achievement', weight: 30 },
      { indicatorId: 'kpi-ach-2', customDescription: 'IT 예산 효율적 집행', category: 'achievement', weight: 30 },
      { indicatorId: 'kpi-job-3', customDescription: '장애 복구 시간 30분 이내 단축', category: 'job', weight: 40 },
      { indicatorId: 'kpi-job-4', customDescription: '인프라 보안 취약점 조치', category: 'job', weight: 30 },
      { indicatorId: 'kpi-job-1', customDescription: '클라우드 네이티브 전환', category: 'job', weight: 30 },
      { indicatorId: 'kpi-comp-2', customDescription: '클라우드 전문 자격증 1인 1개 취득', category: 'competency', weight: 40 },
      { indicatorId: 'kpi-comp-1', customDescription: '인프라 자동화 기술 공유', category: 'competency', weight: 30 },
      { indicatorId: 'kpi-comp-5', customDescription: '운영 협업 프로세스 개선', category: 'competency', weight: 30 },
    ]
  },
  {
    id: 'team-goal-sec-2026',
    departmentId: 'team-sec',
    year: 2026,
    status: 'published',
    narrative: '정보 보안팀은 전사 보안 거버넌스 확립 및 제로 트러스트 아키텍처를 도입합니다.',
    categoryWeights: { achievement: 30, job: 50, competency: 20 },
    customIndicators: [
      { indicatorId: 'kpi-ach-5', customDescription: '보안 사고 비용 제로화', category: 'achievement', weight: 40 },
      { indicatorId: 'kpi-ach-3', customDescription: '보안 교육 이수율 및 만족도', category: 'achievement', weight: 30 },
      { indicatorId: 'kpi-ach-1', customDescription: '보안 시스템 가동률', category: 'achievement', weight: 30 },
      { indicatorId: 'kpi-job-4', customDescription: '보안 취약점 조치율 100% 달성', category: 'job', weight: 40 },
      { indicatorId: 'kpi-job-1', customDescription: '제로 트러스트 도입 로드맵 완수', category: 'job', weight: 30 },
      { indicatorId: 'kpi-job-3', customDescription: '침해 사고 대응 훈련', category: 'job', weight: 30 },
      { indicatorId: 'kpi-comp-1', customDescription: '전사 보안 교육 월 1회 실시', category: 'competency', weight: 40 },
      { indicatorId: 'kpi-comp-2', customDescription: '보안 전문 자격증 취득', category: 'competency', weight: 30 },
      { indicatorId: 'kpi-comp-5', customDescription: '보안 문화 확산 협업', category: 'competency', weight: 30 },
    ]
  },
  {
    id: 'team-goal-qa-2026',
    departmentId: 'team-qa',
    year: 2026,
    status: 'published',
    narrative: '품질 관리팀은 테스트 자동화 커버리지 확대 및 릴리즈 품질을 보증합니다.',
    categoryWeights: { achievement: 40, job: 40, competency: 20 },
    customIndicators: [
      { indicatorId: 'kpi-ach-3', customDescription: '릴리즈 후 결함 발생률 0.5% 이하', category: 'achievement', weight: 40 },
      { indicatorId: 'kpi-ach-1', customDescription: '테스트 환경 가동률', category: 'achievement', weight: 30 },
      { indicatorId: 'kpi-ach-5', customDescription: '품질 비용 최적화', category: 'achievement', weight: 30 },
      { indicatorId: 'kpi-job-1', customDescription: '테스트 자동화 커버리지 70% 달성', category: 'job', weight: 40 },
      { indicatorId: 'kpi-job-2', customDescription: '회귀 테스트 자동화 수행', category: 'job', weight: 30 },
      { indicatorId: 'kpi-job-5', customDescription: '릴리즈 승인 프로세스 준수', category: 'job', weight: 30 },
      { indicatorId: 'kpi-comp-5', customDescription: '개발팀과의 원활한 소통 및 협업', category: 'competency', weight: 40 },
      { indicatorId: 'kpi-comp-1', customDescription: '품질 관리 기법 세미나', category: 'competency', weight: 30 },
      { indicatorId: 'kpi-comp-2', customDescription: 'ISTQB 등 품질 자격증', category: 'competency', weight: 30 },
    ]
  }
];

export const MOCK_MEMBER_GOALS: MemberGoal[] = [
  {
    id: 'goal-member-2026',
    userId: 'mock-member-id',
    year: 2026,
    status: 'agreed',
    narrative: '국내매매 시스템 성능 최적화 및 주문 처리 로직 고도화에 집중하겠습니다.',
    customIndicators: [
      { indicatorId: 'kpi-ach-1', category: 'achievement', weight: 20, customDescription: '시스템 가동률 99.99% 이상 유지' },
      { indicatorId: 'kpi-ach-2', category: 'achievement', weight: 15, customDescription: '주문 처리 지연시간 20% 단축' },
      { indicatorId: 'kpi-job-1', category: 'job', weight: 15, customDescription: '핵심 모듈 리팩토링 및 코드 리뷰 강화' },
      { indicatorId: 'kpi-job-2', category: 'job', weight: 15, customDescription: '신규 주문 유형 대응 로직 개발' },
      { indicatorId: 'kpi-comp-1', category: 'competency', weight: 15, customDescription: '고성능 트레이딩 시스템 아키텍처 학습' },
      { indicatorId: 'kpi-comp-2', category: 'competency', weight: 20, customDescription: '팀 내 기술 세미나 4회 이상 진행' }
    ]
  },
  {
    id: 'goal-leader-id-2026',
    userId: 'mock-leader-id',
    year: 2026,
    status: 'pending',
    narrative: '팀 매니지먼트 역량 강화 및 프로젝트 리딩에 최선을 다하겠습니다.',
    customIndicators: [
      { indicatorId: 'kpi-job-1', category: 'job', weight: 30, customDescription: '팀 프로젝트 완수율 100%' },
      { indicatorId: 'kpi-comp-4', category: 'competency', weight: 20, customDescription: '팀원 다면평가 점수 향상' },
      { indicatorId: 'kpi-ach-1', category: 'achievement', weight: 20, customDescription: '팀 서비스 가동률 유지' },
      { indicatorId: 'kpi-ach-2', category: 'achievement', weight: 15, customDescription: '팀 매출 목표 달성' },
      { indicatorId: 'kpi-job-2', category: 'job', weight: 15, customDescription: '팀 내 코드 리뷰 문화 정착' }
    ]
  },
  {
    id: 'goal-admin-2026',
    userId: 'mock-admin-id',
    year: 2026,
    status: 'draft',
    narrative: '전사 시스템 보안 강화 및 인프라 고도화 전략 수립',
    customIndicators: [
      { indicatorId: 'kpi-ach-1', category: 'achievement', weight: 30, customDescription: '전사 시스템 가동률 99.9% 유지' },
      { indicatorId: 'kpi-job-4', category: 'job', weight: 20, customDescription: '보안 취약점 조치율 100%' },
      { indicatorId: 'kpi-ach-5', category: 'achievement', weight: 20, customDescription: 'IT 운영 비용 10% 절감' },
      { indicatorId: 'kpi-job-1', category: 'job', weight: 15, customDescription: '인프라 고도화 프로젝트 완수' },
      { indicatorId: 'kpi-comp-1', category: 'competency', weight: 15, customDescription: '최신 인프라 기술 트렌드 전파' }
    ]
  },
  {
    id: 'goal-leader-2-2026',
    userId: 'mock-leader-2-id',
    year: 2026,
    status: 'agreed',
    narrative: '개발 2팀의 신규 서비스 성공적 런칭을 목표로 합니다.',
    customIndicators: [
      { indicatorId: 'kpi-ach-4', category: 'achievement', weight: 30, customDescription: '신규 서비스 유입자 수 목표 달성' },
      { indicatorId: 'kpi-job-5', category: 'job', weight: 20, customDescription: '배포 성공률 100% 유지' },
      { indicatorId: 'kpi-comp-5', category: 'competency', weight: 20, customDescription: '팀 간 협업 만족도 향상' },
      { indicatorId: 'kpi-ach-3', category: 'achievement', weight: 15, customDescription: '사용자 만족도 점수 향상' },
      { indicatorId: 'kpi-job-1', category: 'job', weight: 15, customDescription: '서비스 런칭 마일스톤 준수' }
    ]
  },
  {
    id: 'goal-ops-leader-2026',
    userId: 'mock-leader-ops-id',
    year: 2026,
    status: 'agreed',
    narrative: '클라우드 인프라 안정성 확보 및 비용 최적화',
    customIndicators: [
      { indicatorId: 'kpi-ach-5', category: 'achievement', weight: 30, customDescription: '클라우드 비용 15% 절감' },
      { indicatorId: 'kpi-job-3', category: 'job', weight: 20, customDescription: '장애 조치 시간 30% 단축' },
      { indicatorId: 'kpi-comp-2', category: 'competency', weight: 20, customDescription: '인프라 관련 전문 자격 취득' },
      { indicatorId: 'kpi-ach-1', category: 'achievement', weight: 15, customDescription: '인프라 가동률 99.9% 유지' },
      { indicatorId: 'kpi-job-4', category: 'job', weight: 15, customDescription: '보안 취약점 정기 점검 및 조치' }
    ]
  },
  {
    id: 'goal-member-dev2-2026',
    userId: 'mock-member-dev2-id',
    year: 2026,
    status: 'agreed',
    narrative: '신규 서비스 백엔드 아키텍처 설계 및 API 성능 최적화',
    customIndicators: [
      { indicatorId: 'kpi-ach-4', category: 'achievement', weight: 30, customDescription: 'API 응답 속도 30% 개선' },
      { indicatorId: 'kpi-job-1', category: 'job', weight: 20, customDescription: '백엔드 모듈화 프로젝트 완수' },
      { indicatorId: 'kpi-comp-1', category: 'competency', weight: 20, customDescription: '분산 시스템 아키텍처 학습' },
      { indicatorId: 'kpi-job-5', category: 'job', weight: 15, customDescription: 'CI/CD 파이프라인 최적화' },
      { indicatorId: 'kpi-comp-2', category: 'competency', weight: 15, customDescription: '기술 블로그 포스팅 4회' }
    ]
  },
  {
    id: 'goal-member-overseas-2026',
    userId: 'mock-member-overseas-id',
    year: 2026,
    status: 'agreed',
    narrative: '해외 시장 연동 모듈 고도화 및 글로벌 장애 대응 역량 강화',
    customIndicators: [
      { indicatorId: 'kpi-ach-2', category: 'achievement', weight: 30, customDescription: '해외 시장 연동 모듈 응답 속도 15% 향상' },
      { indicatorId: 'kpi-job-1', category: 'job', weight: 20, customDescription: '글로벌 장애 대응 매뉴얼 현행화 및 훈련 2회' },
      { indicatorId: 'kpi-comp-3', category: 'competency', weight: 20, customDescription: '글로벌 금융 시장 트렌드 분석 보고서 4건 작성' },
      { indicatorId: 'kpi-job-3', category: 'job', weight: 15, customDescription: '해외 지사와의 기술 협업 세션 월 1회 진행' },
      { indicatorId: 'kpi-comp-5', category: 'competency', weight: 15, customDescription: '영어 기술 문서 작성 능력 향상' }
    ]
  },
  {
    id: 'goal-member-derivatives-2026',
    userId: 'mock-member-derivatives-id',
    year: 2026,
    status: 'agreed',
    narrative: '실시간 리스크 감시 시스템 성능 개선 및 파생상품 거래 안정성 확보',
    customIndicators: [
      { indicatorId: 'kpi-ach-2', category: 'achievement', weight: 30, customDescription: '리스크 감시 시스템 응답 속도 20% 향상' },
      { indicatorId: 'kpi-job-3', category: 'job', weight: 20, customDescription: '파생상품 거래 모듈 안정성 테스트 100% 통과' },
      { indicatorId: 'kpi-comp-2', category: 'competency', weight: 20, customDescription: '금융 파생상품 관련 전문 지식 습득 및 자격증 취득' },
      { indicatorId: 'kpi-ach-1', category: 'achievement', weight: 15, customDescription: '시스템 가동률 99.99% 유지' },
      { indicatorId: 'kpi-job-1', category: 'job', weight: 15, customDescription: '신규 파생상품 대응 개발 일정 준수' }
    ]
  },
  {
    id: 'goal-member-finance-2026',
    userId: 'mock-member-finance-id',
    year: 2026,
    status: 'agreed',
    narrative: '금융상품 정보 관리 시스템 고도화 및 대고객 서비스 품질 향상',
    customIndicators: [
      { indicatorId: 'kpi-ach-4', category: 'achievement', weight: 30, customDescription: '금융상품 정보 처리 오류율 0.1% 이하 유지' },
      { indicatorId: 'kpi-job-1', category: 'job', weight: 20, customDescription: '대고객 서비스 응답 시간 단축' },
      { indicatorId: 'kpi-comp-5', category: 'competency', weight: 20, customDescription: '팀 내 기술 공유 세션 4회 이상 진행' },
      { indicatorId: 'kpi-ach-2', category: 'achievement', weight: 15, customDescription: '시스템 성능 최적화 작업 완료' },
      { indicatorId: 'kpi-job-2', category: 'job', weight: 15, customDescription: '보안 취약점 점검 및 조치 완료' }
    ]
  },
  {
    id: 'goal-member-backoffice-2026',
    userId: 'mock-member-backoffice-id',
    year: 2026,
    status: 'agreed',
    narrative: '백오피스 업무 자동화 툴 개발 및 데이터 정합성 검증 프로세스 강화',
    customIndicators: [
      { indicatorId: 'kpi-ach-5', category: 'achievement', weight: 30, customDescription: '수작업 업무 자동화율 40% 달성' },
      { indicatorId: 'kpi-job-1', category: 'job', weight: 20, customDescription: '데이터 정합성 검증 툴 개발 완료' },
      { indicatorId: 'kpi-comp-5', category: 'competency', weight: 20, customDescription: '협업 툴 활용 능력 향상 및 팀 내 전파' },
      { indicatorId: 'kpi-job-3', category: 'job', weight: 15, customDescription: '백오피스 시스템 장애 대응 시간 단축' },
      { indicatorId: 'kpi-comp-1', category: 'competency', weight: 15, customDescription: '업무 효율성 개선 제안 2건 이상' }
    ]
  },
  {
    id: 'goal-leader-sec-2026',
    userId: 'mock-leader-sec-id',
    year: 2026,
    status: 'agreed',
    narrative: '전사 보안 거버넌스 체계 확립 및 제로 트러스트 도입 주도',
    customIndicators: [
      { indicatorId: 'kpi-ach-5', category: 'achievement', weight: 30, customDescription: '전사 보안 사고 발생 건수 0건 유지' },
      { indicatorId: 'kpi-job-4', category: 'job', weight: 20, customDescription: '제로 트러스트 보안 모델 설계 및 시범 도입' },
      { indicatorId: 'kpi-comp-1', category: 'competency', weight: 20, customDescription: '보안 전문가 육성 프로그램 운영' },
      { indicatorId: 'kpi-job-1', category: 'job', weight: 15, customDescription: '보안 정책 준수율 95% 이상 달성' },
      { indicatorId: 'kpi-comp-5', category: 'competency', weight: 15, customDescription: '보안 인식 개선 캠페인 주도' }
    ]
  },
  {
    id: 'goal-member-sec-2026',
    userId: 'mock-member-sec-id',
    year: 2026,
    status: 'agreed',
    narrative: '보안 관제 모니터링 강화 및 침해 사고 대응 훈련 참여',
    customIndicators: [
      { indicatorId: 'kpi-job-4', category: 'job', weight: 30, customDescription: '실시간 보안 이벤트 탐지 정확도 향상' },
      { indicatorId: 'kpi-job-3', category: 'job', weight: 20, customDescription: '침해 사고 대응 매뉴얼 현행화' },
      { indicatorId: 'kpi-comp-2', category: 'competency', weight: 20, customDescription: '최신 보안 위협 분석 보고서 작성' },
      { indicatorId: 'kpi-ach-3', category: 'achievement', weight: 15, customDescription: '보안 취약점 조치 이행률 100%' },
      { indicatorId: 'kpi-comp-1', category: 'competency', weight: 15, customDescription: '보안 관련 자격증 취득' }
    ]
  },
  {
    id: 'goal-leader-qa-2026',
    userId: 'mock-leader-qa-id',
    year: 2026,
    status: 'agreed',
    narrative: '전사 품질 관리 표준 수립 및 테스트 자동화 전략 실행',
    customIndicators: [
      { indicatorId: 'kpi-ach-3', category: 'achievement', weight: 30, customDescription: '릴리즈 후 중대 결함 발생 0건' },
      { indicatorId: 'kpi-job-1', category: 'job', weight: 20, customDescription: '테스트 자동화 커버리지 60% 달성' },
      { indicatorId: 'kpi-comp-5', category: 'competency', weight: 20, customDescription: '품질 관리 교육 프로그램 운영' },
      { indicatorId: 'kpi-job-2', category: 'job', weight: 15, customDescription: '테스트 프로세스 개선을 통한 리드타임 단축' },
      { indicatorId: 'kpi-comp-1', category: 'competency', weight: 15, customDescription: '품질 혁신 사례 발표' }
    ]
  },
  {
    id: 'goal-member-qa-2026',
    userId: 'mock-member-qa-id',
    year: 2026,
    status: 'agreed',
    narrative: '회귀 테스트 자동화 스크립트 작성 및 릴리즈 품질 검증',
    customIndicators: [
      { indicatorId: 'kpi-job-1', category: 'job', weight: 30, customDescription: '회귀 테스트 자동화 스크립트 50건 개발' },
      { indicatorId: 'kpi-job-2', category: 'job', weight: 20, customDescription: '단위/통합 테스트 시나리오 100% 수행' },
      { indicatorId: 'kpi-comp-2', category: 'competency', weight: 20, customDescription: '테스트 자동화 툴 숙련도 향상' },
      { indicatorId: 'kpi-job-5', category: 'job', weight: 15, customDescription: '릴리즈 품질 검증 프로세스 준수' },
      { indicatorId: 'kpi-comp-5', category: 'competency', weight: 15, customDescription: '팀 내 품질 관리 지식 공유' }
    ]
  },
  {
    id: 'goal-test-member-2026',
    userId: 'mock-member-ops-id',
    year: 2026,
    status: 'agreed',
    narrative: '인프라 모니터링 자동화 및 장애 대응 매뉴얼 현행화',
    customIndicators: [
      { indicatorId: 'kpi-ach-1', category: 'achievement', weight: 30, customDescription: '인프라 가동률 99.9% 달성' },
      { indicatorId: 'kpi-job-3', category: 'job', weight: 20, customDescription: '장애 대응 매뉴얼 현행화 및 전파' },
      { indicatorId: 'kpi-comp-1', category: 'competency', weight: 20, customDescription: '클라우드 인프라 운영 자격증 취득' },
      { indicatorId: 'kpi-job-4', category: 'job', weight: 15, customDescription: '모니터링 알람 최적화 및 오탐률 감소' },
      { indicatorId: 'kpi-comp-5', category: 'competency', weight: 15, customDescription: '팀 내 기술 공유 세션 진행' }
    ]
  },
  {
    id: 'goal-park-dev-2026',
    userId: 'mock-member-dev2-2-id',
    year: 2026,
    status: 'agreed',
    narrative: '사용자 중심의 UI 개선 및 웹 접근성 표준 준수',
    customIndicators: [
      { indicatorId: 'kpi-ach-3', category: 'achievement', weight: 30, customDescription: 'UI 개선 후 사용자 만족도 20% 향상' },
      { indicatorId: 'kpi-job-1', category: 'job', weight: 20, customDescription: '웹 접근성 표준 준수율 100% 달성' },
      { indicatorId: 'kpi-comp-5', category: 'competency', weight: 20, customDescription: '최신 프론트엔드 기술 스택 도입 및 전파' },
      { indicatorId: 'kpi-job-2', category: 'job', weight: 15, customDescription: '디자인 시스템 컴포넌트 라이브러리 구축' },
      { indicatorId: 'kpi-comp-1', category: 'competency', weight: 15, customDescription: 'UI/UX 디자인 어워드 출품' }
    ]
  },
  ...MOCK_USERS.filter(u => !['mock-member-id', 'mock-leader-id', 'mock-admin-id', 'mock-leader-2-id', 'mock-leader-ops-id', 'mock-member-dev2-id', 'mock-member-overseas-id', 'mock-member-derivatives-id', 'mock-member-finance-id', 'mock-member-backoffice-id', 'mock-leader-sec-id', 'mock-member-sec-id', 'mock-leader-qa-id', 'mock-member-qa-id', 'mock-member-ops-id', 'mock-member-dev2-2-id'].includes(u.uid)).map(u => ({
    id: `goal-${u.uid}-2026`,
    userId: u.uid,
    year: 2026,
    status: 'agreed' as const,
    narrative: `${u.name}의 2026년도 개인 성과 목표입니다.`,
    customIndicators: [
      { indicatorId: 'kpi-ach-1', category: 'achievement' as GoalCategory, weight: 40, customDescription: '주요 성과 지표 달성' },
      { indicatorId: 'kpi-job-1', category: 'job' as GoalCategory, weight: 30, customDescription: '담당 업무 프로세스 개선' },
      { indicatorId: 'kpi-comp-1', category: 'competency' as GoalCategory, weight: 30, customDescription: '자기계발 및 역량 강화' }
    ]
  }))
];

export const MOCK_EVENTS: PerformanceEvent[] = (() => {
  const events: PerformanceEvent[] = [];
  const users = MOCK_USERS;
  const teamGoals = MOCK_TEAM_GOALS;
  
  users.forEach((user, userIdx) => {
    const activeDeptId = user.workGroupId || user.teamId;
    const memberGoal = MOCK_MEMBER_GOALS.find(g => g.userId === user.uid && g.year === 2026);
    const teamGoal = teamGoals.find(g => g.departmentId === activeDeptId && g.year === 2026);
    const indicators = (() => {
      if (memberGoal?.customIndicators && memberGoal.customIndicators.length > 0) {
        return memberGoal.customIndicators;
      }
      if (memberGoal?.indicatorIds && memberGoal.indicatorIds.length > 0) {
        return memberGoal.indicatorIds.map(id => ({
          indicatorId: id,
          category: (id.toLowerCase().includes('ach') ? 'achievement' : id.toLowerCase().includes('job') ? 'job' : 'competency') as GoalCategory,
          weight: 100 / memberGoal.indicatorIds!.length,
          customDescription: MOCK_INDICATORS.find(ind => ind.id === id)?.description || ''
        }));
      }
      return teamGoal?.customIndicators || [];
    })();
    
    if (indicators.length === 0) return;

    // Generate 8-12 events per user
    const eventCount = 8 + (userIdx % 5); 
    for (let i = 0; i < eventCount; i++) {
      const ind = indicators[i % indicators.length];
      const date = new Date(2026, 0, 5 + (i * 7) + (userIdx % 3));
      
      events.push({
        id: `mock-event-${user.uid}-${i}`,
        userId: user.uid,
        date: date.toISOString(),
        title: i % 3 === 0 
          ? `${ind.customDescription.split(' ')[0]} 관련 성과 달성` 
          : i % 3 === 1 
            ? `${ind.customDescription.split(' ')[0]} 업무 프로세스 개선`
            : `${ind.customDescription.split(' ')[0]} 프로젝트 마일스톤 완료`,
        indicatorId: ind.indicatorId,
        achievement: 40 + (i * 5) % 61, // 40% to 100%
        status: i % 4 === 0 ? 'reviewed' : 'registered',
        teamId: user.teamId,
        workGroupId: user.workGroupId
      });
    }
  });

  return events;
})();
