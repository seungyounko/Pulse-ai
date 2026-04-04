import React, { useState, useEffect, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Target, 
  Trophy, 
  Users, 
  Settings, 
  LogOut, 
  Plus, 
  PlusCircle,
  CheckCircle2, 
  Clock, 
  Search,
  BarChart3,
  TrendingUp,
  AlertCircle,
  Building2,
  Briefcase,
  Flag,
  Trash2,
  Edit2,
  ChevronRight,
  X,
  Calendar,
  AlertTriangle,
  TrendingDown,
  MessageSquare,
  FileText,
  Database
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Treemap,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

import { auth, db, isMockMode } from './firebase';
import { mockDb } from './services/mockDb';
import { MOCK_USERS } from './mockData';
import { 
  UserProfile, 
  UserRole,
  Department, 
  DeptType,
  GoalIndicator, 
  MemberGoal, 
  PerformanceEvent, 
  OperationType, 
  FirestoreErrorInfo,
  TeamGoal,
  TeamIndicator,
  GoalCategory,
  TeamGoalStatus,
  MeetingComment,
  EventStatus,
  ProgressStatus,
  EventHistory,
  EventComment
} from './types';

// --- Error Handling ---
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('Firestore Error')) {
        setHasError(true);
        try {
          const info = JSON.parse(event.error.message.replace('Firestore Error: ', ''));
          setErrorMsg(info.error);
        } catch {
          setErrorMsg(event.error.message);
        }
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">시스템 오류</h2>
          <p className="text-gray-600 mb-6">{errorMsg || "데이터베이스 연결 중 예기치 않은 오류가 발생했습니다."}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            애플리케이션 새로고침
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const SidebarItem: React.FC<{ 
  icon: React.ElementType; 
  label: string; 
  active: boolean; 
  onClick: () => void 
}> = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' 
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'goals' | 'team-goals' | 'events' | 'team-events' | 'meeting' | 'admin'>('dashboard');

  useEffect(() => {
    if (profile?.role === 'member' && activeTab === 'dashboard') {
      setActiveTab('goals');
    }
  }, [profile, activeTab]);

  // Data State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [indicators, setIndicators] = useState<GoalIndicator[]>([]);
  const [myGoals, setMyGoals] = useState<MemberGoal[]>([]);
  const [teamGoals, setTeamGoals] = useState<TeamGoal[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [events, setEvents] = useState<PerformanceEvent[]>([]);
  const [meetingComments, setMeetingComments] = useState<MeetingComment[]>([]);

  useEffect(() => {
    if (isMockMode) {
      const savedUser = mockDb.getCurrentUser();
      if (savedUser) setUser(savedUser);
      setIsAuthReady(true);
      return;
    }
    if (!auth) {
      setIsAuthReady(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isMockMode) {
      if (user) {
        const savedProfile = mockDb.getCurrentProfile();
        if (savedProfile && savedProfile.uid === user.uid) {
          setProfile(savedProfile);
        } else {
          // Default profile if none saved
          const defaultProfile: UserProfile = {
            uid: user.uid,
            name: user.displayName || '데모 사용자',
            email: user.email || 'demo@example.com',
            role: 'admin',
            teamId: 'team-dev-1',
            position: '데모 관리자'
          };
          setProfile(defaultProfile);
          mockDb.setCurrentProfile(defaultProfile);
        }
      } else {
        setProfile(null);
      }
      
      // Load other data from mockDb
      setUsers(mockDb.getUsers());
      setDepartments(mockDb.getDepartments());
      setIndicators(mockDb.getIndicators());
      setTeamGoals(mockDb.getTeamGoals());
      setEvents(mockDb.getEvents());
      setMyGoals(mockDb.getMemberGoals());
      
      return;
    }

    if (!user || !db) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        const newProfile: UserProfile = {
          uid: user.uid,
          name: user.displayName || '익명 사용자',
          email: user.email || '',
          role: 'member',
          teamId: 'unassigned',
          photoURL: user.photoURL || undefined,
          position: '신입 사원'
        };
        setDoc(userDocRef, newProfile).catch(e => handleFirestoreError(e, OperationType.WRITE, 'users'));
      }
    }, (e) => handleFirestoreError(e, OperationType.GET, `users/${user.uid}`));

    const unsubUsers = onSnapshot(collection(db, 'users'), (s) => {
      setUsers(s.docs.map(d => d.data() as UserProfile));
    });
    const unsubDepts = onSnapshot(collection(db, 'departments'), (s) => {
      setDepartments(s.docs.map(d => d.data() as Department));
    });
    const unsubInds = onSnapshot(collection(db, 'goalIndicators'), (s) => {
      setIndicators(s.docs.map(d => d.data() as GoalIndicator));
    });
    const unsubGoals = onSnapshot(query(collection(db, 'memberGoals'), where('userId', '==', user.uid)), (s) => {
      setMyGoals(s.docs.map(d => d.data() as MemberGoal));
    });
    const unsubTeamGoals = onSnapshot(collection(db, 'teamGoals'), (s) => {
      setTeamGoals(s.docs.map(d => d.data() as TeamGoal));
    });
    const unsubEvents = onSnapshot(collection(db, 'performanceEvents'), (s) => {
      setEvents(s.docs.map(d => d.data() as PerformanceEvent));
    });

    return () => {
      unsubProfile();
      unsubUsers();
      unsubDepts();
      unsubInds();
      unsubGoals();
      unsubTeamGoals();
      unsubEvents();
    };
  }, [user]);

  const handleLogin = async () => {
    if (isMockMode) {
      const mockUser = {
        uid: 'mock-user-id',
        displayName: '데모 사용자',
        email: 'demo@example.com',
        photoURL: 'https://picsum.photos/seed/user/200/200'
      } as FirebaseUser;
      setUser(mockUser);
      mockDb.setCurrentUser(mockUser);
      return;
    }
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleDemoLogin = async (role: UserRole, teamId?: string, workGroupId?: string) => {
    if (isMockMode) {
      const mockUser = MOCK_USERS.find(u => 
        u.role === role && 
        (!teamId || u.teamId === teamId) && 
        (!workGroupId || u.workGroupId === workGroupId)
      ) || MOCK_USERS.find(u => u.role === role);

      if (mockUser) {
        const firebaseUser = {
          uid: mockUser.uid,
          displayName: mockUser.name,
          email: mockUser.email,
          photoURL: mockUser.photoURL
        } as FirebaseUser;
        
        setUser(firebaseUser);
        setProfile(mockUser);
        mockDb.setCurrentUser(firebaseUser);
        mockDb.setCurrentProfile(mockUser);
        alert(`${mockUser.name} (${mockUser.position}) 권한으로 설정되었습니다. (MOCK MODE)`);
      }
      return;
    }
    if (!auth || !db) return;
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userDocRef = doc(db, 'users', user.uid);
      
      let finalTeamId = teamId || 'team-dev-1';
      let finalWorkGroupId = workGroupId;
      
      if (role === 'member' && !finalWorkGroupId && finalTeamId === 'team-dev-1') {
        finalWorkGroupId = 'wg-domestic';
      }

      const demoProfile: UserProfile = {
        uid: user.uid,
        name: user.displayName || (role === 'leader' ? '데모 팀장' : role === 'admin' ? '데모 관리자' : '데모 팀원'),
        email: user.email || '',
        role: role,
        teamId: finalTeamId,
        workGroupId: finalWorkGroupId,
        photoURL: user.photoURL || undefined,
        position: role === 'leader' ? '개발 팀장' : role === 'admin' ? '시스템 관리자' : '선임 개발자'
      };
      await setDoc(userDocRef, demoProfile);
      alert(`${role === 'leader' ? '팀장' : role === 'admin' ? '관리자' : '팀원'} 권한으로 설정되었습니다.`);
    } catch (error) {
      console.error("Demo login failed", error);
    }
  };

  const handleLogout = () => {
    if (isMockMode) {
      setUser(null);
      setProfile(null);
      mockDb.setCurrentUser(null);
      mockDb.setCurrentProfile(null);
      return;
    }
    if (auth) signOut(auth);
  };

  const seedInitialData = async () => {
    if (!profile && !isMockMode) return;
    setIsSeeding(true);
    const depts: Department[] = [
      // Case 1: Team with WorkGroups
      { id: 'team-dev-1', name: '개발 1팀', type: 'Team' },
      { id: 'wg-domestic', name: '국내매매 파트', type: 'WorkGroup', parentId: 'team-dev-1', categoryWeights: { achievement: 50, job: 30, competency: 20 } },
      { id: 'wg-fe', name: '프론트엔드 파트', type: 'WorkGroup', parentId: 'team-dev-1', categoryWeights: { achievement: 40, job: 40, competency: 20 } },
      { id: 'wg-be', name: '백엔드 파트', type: 'WorkGroup', parentId: 'team-dev-1', categoryWeights: { achievement: 60, job: 20, competency: 20 } },
      // Case 2: Team without WorkGroups
      { id: 'team-dev-2', name: '개발 2팀', type: 'Team' },
      { id: 'team-ops', name: '인프라 운영팀', type: 'Team' },
      { id: 'team-sec', name: '정보 보안팀', type: 'Team' },
      { id: 'team-qa', name: '품질 관리팀', type: 'Team' },
    ];
    const inds: GoalIndicator[] = [
      { id: 'kpi-service-up', code: 'KPI-000', name: '서비스 가동률', description: '시스템의 안정적인 운영 및 가동률을 관리합니다.' }
    ];
    for (let i = 1; i <= 100; i++) {
      inds.push({
        id: `kpi-${i}`,
        code: `KPI-${String(i).padStart(3, '0')}`,
        name: i % 3 === 0 ? `기능 개선 ${i}` : i % 3 === 1 ? `성능 최적화 ${i}` : `운영 효율화 ${i}`,
        description: `기존의 기능을 효과적으로 개선하고 안정성을 확보합니다. (인덱스 ${i})`
      });
    }

    const usersToSeed: UserProfile[] = [];
    const teamGoalsToSeed: TeamGoal[] = [];
    const memberGoalsToSeed: MemberGoal[] = [];
    const names = ['김철수', '이영희', '박지민', '최도윤', '정서윤', '강하준', '조은지', '윤민수', '장예린', '한동현', '임지우', '오승우', '서현진', '권태양', '송미소', '황우진', '전나래', '문지훈', '양다솜', '고건우', '심보람', '노현우', '배성진', '안지혜', '유재석', '강호동', '신동엽', '이수근', '서장훈', '김희철', '민경훈', '이상민'];
    
    names.forEach((name, idx) => {
      const deptIdx = idx % depts.length;
      const dept = depts[deptIdx];
      const role: UserRole = idx < depts.length ? 'leader' : 'member';
      
      let teamId = '';
      let workGroupId: string | undefined = undefined;

      if (dept.type === 'WorkGroup') {
        teamId = dept.parentId!;
        workGroupId = dept.id;
      } else {
        teamId = dept.id;
      }

      usersToSeed.push({
        uid: `user-seed-${idx}`,
        name,
        email: `user${idx}@example.com`,
        role,
        teamId,
        workGroupId,
        position: role === 'leader' ? '팀장' : '팀원'
      });
    });

    // Seed Team Goals
    const years = [2025, 2026];
    for (const d of depts) {
      if (d.type === 'Team' || d.type === 'WorkGroup') {
        for (const y of years) {
          const goalId = `team-goal-${d.id}-${y}`;
          
          const usedIds = new Set<string>();
          const getUniqueIndId = (start: number, end: number) => {
            let id = `kpi-${start + Math.floor(Math.random() * (end - start + 1))}`;
            let attempts = 0;
            while (usedIds.has(id) && attempts < 100) {
              id = `kpi-${start + Math.floor(Math.random() * (end - start + 1))}`;
              attempts++;
            }
            usedIds.add(id);
            return id;
          };

          const customIndicators: TeamIndicator[] = [];
          
          if (d.id === 'wg-domestic') {
            // Achievement (50%)
            customIndicators.push({ indicatorId: 'kpi-ach-1', customDescription: '서비스 가동률 99.9% 이상 유지', category: 'achievement', weight: 40 }); // 20% total
            customIndicators.push({ indicatorId: 'kpi-ach-2', customDescription: '매출 목표 달성률 달성', category: 'achievement', weight: 30 }); // 15% total
            customIndicators.push({ indicatorId: 'kpi-ach-3', customDescription: '고객 만족도(NPS) 향상', category: 'achievement', weight: 30 }); // 15% total
            
            // Job (30%)
            customIndicators.push({ indicatorId: 'kpi-job-1', customDescription: '매매 시스템 고도화 프로젝트 완수', category: 'job', weight: 40 }); // 12% total
            customIndicators.push({ indicatorId: 'kpi-job-2', customDescription: '코드 리뷰 참여도 향상', category: 'job', weight: 30 }); // 9% total
            customIndicators.push({ indicatorId: 'kpi-job-3', customDescription: '장애 조치 시간(MTTR) 단축', category: 'job', weight: 30 }); // 9% total
            
            // Competency (20%)
            customIndicators.push({ indicatorId: 'kpi-comp-1', customDescription: '기술 공유 세미나 발표', category: 'competency', weight: 40 }); // 8% total
            customIndicators.push({ indicatorId: 'kpi-comp-2', customDescription: '직무 관련 자격증 취득', category: 'competency', weight: 30 }); // 6% total
            customIndicators.push({ indicatorId: 'kpi-comp-5', customDescription: '유관 부서 협업 만족도 향상', category: 'competency', weight: 30 }); // 6% total
          } else {
            for (let i = 0; i < 4; i++) {
              customIndicators.push({
                indicatorId: getUniqueIndId(1, 33),
                customDescription: `${d.name} 업적 지표 ${i + 1}: 핵심 성과 지표 달성 및 품질 관리`,
                category: 'achievement',
                weight: 25
              });
            }
            for (let i = 0; i < 3; i++) {
              customIndicators.push({
                indicatorId: getUniqueIndId(34, 66),
                customDescription: `${d.name} 직무 지표 ${i + 1}: 프로세스 혁신 및 기술 역량 고도화`,
                category: 'job',
                weight: i === 2 ? 34 : 33
              });
            }
            for (let i = 0; i < 3; i++) {
              customIndicators.push({
                indicatorId: getUniqueIndId(67, 100),
                customDescription: `${d.name} 역량 지표 ${i + 1}: 조직 문화 적응 및 리더십/협업 역량 강화`,
                category: 'competency',
                weight: i === 2 ? 34 : 33
              });
            }
          }

          teamGoalsToSeed.push({
            id: goalId,
            departmentId: d.id,
            year: y,
            narrative: `${d.name}의 ${y}년도 핵심 목표입니다. 고객 만족도 향상과 시스템 안정성을 최우선으로 하며, 팀원들의 성장을 지원합니다.`,
            categoryWeights: d.categoryWeights || {
              achievement: 50,
              job: 30,
              competency: 20
            },
            customIndicators,
            status: 'published'
          });
        }
      }
    }

    // Seed Member Goals
    for (const u of usersToSeed) {
      const activeDeptId = u.workGroupId || u.teamId;
      const teamGoal = teamGoalsToSeed.find(g => g.departmentId === activeDeptId && g.year === 2026);
      const teamIndIds = teamGoal?.customIndicators.map(ci => ci.indicatorId) || ['kpi-1', 'kpi-2', 'kpi-3'];
      
      memberGoalsToSeed.push({
        id: `goal-${u.uid}-2026`,
        userId: u.uid,
        year: 2026,
        status: 'agreed',
        narrative: `${u.name}의 2026년도 개인 성과 목표입니다.`,
        indicatorIds: teamIndIds.slice(0, 5)
      });
    }

    // Seed Performance Events (150+ total)
    const eventsToSeed: PerformanceEvent[] = [];
    for (const u of usersToSeed) {
      const activeDeptId = u.workGroupId || u.teamId;
      const teamGoal = teamGoalsToSeed.find(g => g.departmentId === activeDeptId && g.year === 2026);
      const teamIndIds = teamGoal?.customIndicators.map(ci => ci.indicatorId) || ['kpi-1', 'kpi-2', 'kpi-3'];

      // Generate 8-15 events per user to ensure 200+ total for 30+ users
      const eventCount = 8 + Math.floor(Math.random() * 8);
      for (let i = 0; i < eventCount; i++) {
        const eventId = `event-${u.uid}-${i}`;
        const randomIndId = teamIndIds[Math.floor(Math.random() * teamIndIds.length)];
        eventsToSeed.push({
          id: eventId,
          userId: u.uid,
          date: new Date(2026, 0, 1 + Math.floor(Math.random() * 80)).toISOString(),
          title: i % 3 === 0 ? `${randomIndId} 관련 성과 달성` : i % 3 === 1 ? `${randomIndId} 업무 프로세스 개선` : `${randomIndId} 프로젝트 마일스톤 완료`,
          indicatorId: randomIndId,
          achievement: 40 + Math.floor(Math.random() * 60),
          status: i % 4 === 0 ? 'reviewed' : 'registered',
          teamId: u.teamId,
          workGroupId: u.workGroupId
        });
      }
    }

    if (isMockMode) {
      setDepartments(depts);
      setIndicators(inds);
      setUsers(usersToSeed);
      setTeamGoals(teamGoalsToSeed);
      setMyGoals(memberGoalsToSeed);
      setEvents(eventsToSeed);
      
      // Save to mockDb
      mockDb.setDepartments(depts);
      mockDb.setIndicators(inds);
      mockDb.setUsers(usersToSeed);
      mockDb.setTeamGoals(teamGoalsToSeed);
      mockDb.setMemberGoals(memberGoalsToSeed);
      mockDb.setEvents(eventsToSeed);
      
      setIsSeeding(false);
      alert(`기초 데이터가 저장되었습니다. (팀 6개, 직원 ${usersToSeed.length}명, 팀 목표 10개, 기록 ${eventsToSeed.length}건)`);
      return;
    }

    try {
      for (const d of depts) await setDoc(doc(db, 'departments', d.id), d);
      for (const i of inds) await setDoc(doc(db, 'goalIndicators', i.id), i);
      for (const u of usersToSeed) await setDoc(doc(db, 'users', u.uid), u);
      for (const g of teamGoalsToSeed) await setDoc(doc(db, 'teamGoals', g.id), g);
      for (const g of memberGoalsToSeed) await setDoc(doc(db, 'memberGoals', g.id), g);
      for (const e of eventsToSeed) await setDoc(doc(db, 'performanceEvents', e.id), e);

      alert(`초기 데이터(팀 6개, 직원 22명, 팀 목표 10개, 기록 ${eventsToSeed.length}건)가 성공적으로 생성되었습니다!`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'seed');
    } finally {
      setIsSeeding(false);
    }
  };

  if (!isAuthReady) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-12 rounded-[2rem] shadow-2xl max-w-md w-full text-center border border-gray-100 relative overflow-hidden"
        >
          {isMockMode && (
            <div className="absolute top-0 left-0 right-0 bg-amber-500 text-white text-[10px] font-bold py-1 uppercase tracking-widest">
              Mock Mode Active - No Firebase Config Found
            </div>
          )}
          <div className="w-20 h-20 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl">
            <TrendingUp className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Pulse</h1>
          <div className="space-y-4">
            <div className="pt-6 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest">데모 모드 로그인</p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={() => handleDemoLogin('admin')}
                    className="py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all"
                  >
                    시스템 관리자
                  </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-wider">개발 1팀 시뮬레이션</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleDemoLogin('leader', 'team-dev-1')}
                      className="py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-50 transition-all"
                    >
                      팀장
                    </button>
                    <button 
                      onClick={() => handleDemoLogin('member', 'team-dev-1')}
                      className="py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium text-xs hover:bg-gray-50 transition-all"
                    >
                      팀원
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-wider">인프라 운영팀 시뮬레이션</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleDemoLogin('leader', 'team-ops')}
                      className="py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-50 transition-all"
                    >
                      팀장
                    </button>
                    <button 
                      onClick={() => handleDemoLogin('member', 'team-ops')}
                      className="py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium text-xs hover:bg-gray-50 transition-all"
                    >
                      팀원
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#F8F9FA] flex">
        <aside className="w-72 bg-white border-r border-gray-100 flex flex-col p-6 sticky top-0 h-screen">
          <div className="flex items-center gap-3 mb-12 px-2">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">Pulse</span>
          </div>

          <nav className="flex-1 space-y-2">
            {profile?.role !== 'member' && (
              <SidebarItem icon={LayoutDashboard} label="대시보드" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            )}
            <SidebarItem icon={Flag} label="팀 목표" active={activeTab === 'team-goals'} onClick={() => setActiveTab('team-goals')} />
            <SidebarItem icon={Target} label="나의 목표" active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} />
            {(profile?.role === 'leader' || profile?.role === 'admin') && (
              <SidebarItem icon={Database} label="팀 기록실" active={activeTab === 'team-events'} onClick={() => setActiveTab('team-events')} />
            )}
            <SidebarItem icon={Trophy} label="나의 기록실" active={activeTab === 'events'} onClick={() => setActiveTab('events')} />
            {(profile?.role === 'leader' || profile?.role === 'admin') && (
              <SidebarItem icon={MessageSquare} label="팀원 관리" active={activeTab === 'meeting'} onClick={() => setActiveTab('meeting')} />
            )}
            {(profile?.role === 'admin' || profile?.email === 'withGossing@gmail.com') && (
              <SidebarItem icon={Settings} label="관리자" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
            )}
          </nav>

          <div className="mt-auto pt-6 border-t border-gray-100">
            <div className="flex items-center gap-3 px-2 mb-6">
              <img src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.name || 'User'}`} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{profile?.name}</p>
                <p className="text-xs text-gray-500 truncate capitalize">{profile?.role === 'member' ? '팀원' : profile?.role === 'leader' ? '팀장' : profile?.role === 'head' ? '본부장' : '관리자'}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors font-medium">
              <LogOut size={20} />
              <span>로그아웃</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 p-10 overflow-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && <DashboardView key="dashboard" profile={profile!} events={events} users={users} teamGoals={teamGoals} indicators={indicators} departments={departments} myGoals={myGoals} />}
            {activeTab === 'team-goals' && (
              <TeamGoalsView 
                key="team-goals" 
                profile={profile!} 
                teamGoals={teamGoals} 
                indicators={indicators} 
                departments={departments} 
                events={events} 
                users={users} 
                isMockMode={isMockMode}
                setTeamGoals={setTeamGoals}
              />
            )}
            {activeTab === 'goals' && (
              <GoalsView 
                key="goals" 
                profile={profile!} 
                myGoals={myGoals} 
                indicators={indicators} 
                teamGoals={teamGoals} 
                departments={departments} 
                users={users}
                events={events}
                isMockMode={isMockMode}
                setMyGoals={setMyGoals}
              />
            )}
            {activeTab === 'events' && (
              <EventsView 
                key="events" 
                profile={profile!} 
                events={events} 
                indicators={indicators} 
                users={users} 
                departments={departments} 
                teamGoals={teamGoals} 
                myGoals={myGoals}
                isMockMode={isMockMode}
                setEvents={setEvents}
              />
            )}
            {activeTab === 'team-events' && (
              <TeamRecordsView 
                key="team-events"
                profile={profile!} 
                events={events} 
                indicators={indicators} 
                users={users}
                departments={departments}
                teamGoals={teamGoals}
                isMockMode={isMockMode}
                setEvents={setEvents}
              />
            )}
            {activeTab === 'meeting' && (
              <MeetingView
                key="meeting"
                profile={profile!}
                users={users}
                events={events}
                meetingComments={meetingComments}
                myGoals={myGoals}
                indicators={indicators}
                teamGoals={teamGoals}
                departments={departments}
                isMockMode={isMockMode}
                setMeetingComments={setMeetingComments}
              />
            )}
            {activeTab === 'admin' && (
              <AdminView 
                key="admin" 
                seedData={seedInitialData} 
                isSeeding={isSeeding}
                users={users} 
                departments={departments} 
                indicators={indicators} 
                teamGoals={teamGoals} 
                myGoals={myGoals}
                isMockMode={isMockMode}
                setUsers={setUsers}
                setDepartments={setDepartments}
                setIndicators={setIndicators}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    </ErrorBoundary>
  );
}

// --- Views ---

const DashboardView: React.FC<{ 
  profile: UserProfile; 
  events: PerformanceEvent[]; 
  users: UserProfile[]; 
  teamGoals: TeamGoal[];
  indicators: GoalIndicator[];
  departments: Department[];
  myGoals: MemberGoal[];
}> = ({ profile, events, users, teamGoals, indicators, departments, myGoals }) => {
  const isLeader = profile.role === 'leader';
  const [showSettings, setShowSettings] = useState(false);
  const [widgets, setWidgets] = useState([
    { id: 'summary', title: '성과 요약', enabled: true, icon: <Trophy size={16} /> },
    { id: 'monthly', title: '월별 추이', enabled: true, icon: <TrendingUp size={16} /> },
    { id: 'category', title: '영역별 현황', enabled: true, icon: <Target size={16} /> },
    { id: 'workgroup', title: '업무그룹별', enabled: true, icon: <Building2 size={16} />, leaderOnly: true },
    { id: 'ranking', title: '팀원 랭킹', enabled: true, icon: <Users size={16} />, leaderOnly: true },
    { id: 'recent', title: '최근 성과', enabled: true, icon: <CheckCircle2 size={16} /> },
    { id: 'pending', title: '대기 업무', enabled: true, icon: <Clock size={16} /> },
  ]);

  const toggleWidget = (id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  };

  const myEvents = events.filter(e => e.userId === profile.uid && (profile.role !== 'member' || e.status === 'reviewed'));
  const avgAchievement = myEvents.length > 0 ? Math.round(myEvents.reduce((acc, curr) => acc + curr.achievement, 0) / myEvents.length) : 0;

  const activeDeptId = profile.workGroupId || profile.teamId;
  const myDept = departments.find(d => d.id === activeDeptId);
  const parentDept = myDept?.parentId ? departments.find(d => d.id === myDept.parentId) : null;
  const parentTeamGoal = parentDept ? teamGoals.find(g => g.departmentId === parentDept.id && g.year === new Date().getFullYear()) : null;
  const myTeamGoal = teamGoals.find(g => g.departmentId === activeDeptId && g.year === new Date().getFullYear());

  const effectiveIndicators = useMemo(() => {
    if (myDept?.type === 'WorkGroup' && parentTeamGoal) {
      return parentTeamGoal.customIndicators;
    }
    return myTeamGoal?.customIndicators || [];
  }, [myDept, parentTeamGoal, myTeamGoal]);

  const teamMembers = useMemo(() => {
    return users.filter(u => profile.workGroupId ? u.workGroupId === activeDeptId : u.teamId === activeDeptId);
  }, [users, activeDeptId, profile.workGroupId, profile.teamId]);

  const memberIds = useMemo(() => teamMembers.map(m => m.uid), [teamMembers]);

  const teamAchievementRates = useMemo(() => {
    return teamMembers.map(m => {
      const mEvents = events.filter(e => e.userId === m.uid);
      return mEvents.length > 0 ? mEvents.reduce((acc, curr) => acc + curr.achievement, 0) / mEvents.length : 0;
    });
  }, [teamMembers, events]);

  const teamAvgAchievement = useMemo(() => {
    return teamAchievementRates.length > 0 
      ? Math.round(teamAchievementRates.reduce((acc, curr) => acc + curr.achievement, 0) / teamAchievementRates.length)
      : 0;
  }, [teamAchievementRates]);

  const eventStats = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const totalThisYear = events.filter(e => e.date.startsWith(currentYear) && memberIds.includes(e.userId)).length;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentCount = events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= oneWeekAgo && memberIds.includes(e.userId);
    }).length;

    const unassignedCount = events.filter(e => (!e.indicatorId || !e.category) && memberIds.includes(e.userId)).length;

    return { totalThisYear, recentCount, unassignedCount };
  }, [events, memberIds]);

  const categoryAchievementData = useMemo(() => {
    const categories: GoalCategory[] = ['achievement', 'job', 'competency'];
    return categories.map(cat => {
      const catInds = effectiveIndicators.filter(ci => ci.category === cat);
      const indIds = catInds.map(ci => ci.indicatorId);
      
      const catEvents = events.filter(e => (indIds.includes(e.indicatorId) || e.category === cat) && memberIds.includes(e.userId));
      const avg = catEvents.length > 0 
        ? Math.round(catEvents.reduce((acc, curr) => acc + curr.achievement, 0) / catEvents.length)
        : 0;
        
      return { 
        name: cat === 'achievement' ? '업적' : cat === 'job' ? '직무' : '역량', 
        achievement: avg,
        color: cat === 'achievement' ? '#3B82F6' : cat === 'job' ? '#10B981' : '#A855F7'
      };
    });
  }, [effectiveIndicators, events, memberIds]);

  const indicatorAchievementData = useMemo(() => {
    return effectiveIndicators.map(ci => {
      const ind = indicators.find(i => i.id === ci.indicatorId);
      const indEvents = events.filter(e => e.indicatorId === ci.indicatorId && memberIds.includes(e.userId));
      const avg = indEvents.length > 0 
        ? Math.round(indEvents.reduce((acc, curr) => acc + curr.achievement, 0) / indEvents.length)
        : 0;
      return {
        id: ci.indicatorId,
        name: ind?.name || 'Unknown',
        achievement: avg,
        category: ci.category
      };
    });
  }, [effectiveIndicators, indicators, events, memberIds]);

  const workGroupAchievementData = useMemo(() => {
    if (profile.role !== 'leader') return [];
    const workGroups = departments.filter(d => d.parentId === profile.teamId && d.type === 'WorkGroup');
    return workGroups.map(wg => {
      const wgMemberIds = users.filter(u => u.workGroupId === wg.id).map(u => u.uid);
      const wgEvents = events.filter(e => wgMemberIds.includes(e.userId));
      const avg = wgEvents.length > 0 ? Math.round(wgEvents.reduce((acc, curr) => acc + curr.achievement, 0) / wgEvents.length) : 0;
      return { name: wg.name, achievement: avg };
    });
  }, [profile, departments, users, events]);

  const sortedIndicators = useMemo(() => [...indicatorAchievementData].sort((a, b) => b.achievement - a.achievement), [indicatorAchievementData]);
  const maxIndicator = sortedIndicators[0];
  const minIndicator = sortedIndicators[sortedIndicators.length - 1];

  const memberAchievementData = useMemo(() => {
    return teamMembers.map((m, i) => ({
      name: m.name,
      achievement: Math.round(teamAchievementRates[i])
    })).sort((a, b) => b.achievement - a.achievement);
  }, [teamMembers, teamAchievementRates]);
  
  const topMember = memberAchievementData[0];
  const bottomMember = memberAchievementData[memberAchievementData.length - 1];

  const monthlyAchievementData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const data = [];
    
    for (let m = 1; m <= currentMonth; m++) {
      const monthStr = `${currentYear}-${m.toString().padStart(2, '0')}`;
      const monthEvents = events.filter(e => e.date.startsWith(monthStr) && memberIds.includes(e.userId));
      const avg = monthEvents.length > 0 
        ? Math.round(monthEvents.reduce((acc, curr) => acc + curr.achievement, 0) / monthEvents.length)
        : 0;
        
      data.push({
        name: `${m}월`,
        achievement: avg
      });
    }
    return data;
  }, [events, memberIds]);

  const recentAchievements = useMemo(() => {
    return events
      .filter(e => e.status === 'reviewed' && memberIds.includes(e.userId) && e.achievement >= 80)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [events, memberIds]);

  const pendingTasks = useMemo(() => {
    const tasks = [];
    
    // Events needing review (for leaders)
    if (isLeader) {
      const unreviewedEvents = events.filter(e => e.status === 'registered' && memberIds.includes(e.userId));
      unreviewedEvents.forEach(e => {
        const user = users.find(u => u.uid === e.userId);
        tasks.push({
          id: `task-event-${e.id}`,
          type: 'review',
          title: `성과 검토: ${user?.name} - ${e.title}`,
          date: e.date,
          priority: 'high'
        });
      });
    }

    // Goals needing agreement
    const pendingGoals = myGoals.filter(g => g.status === 'pending' && (isLeader ? memberIds.includes(g.userId) : g.userId === profile.uid));
    pendingGoals.forEach(g => {
      const user = users.find(u => u.uid === g.userId);
      tasks.push({
        id: `task-goal-${g.id}`,
        type: 'goal',
        title: isLeader ? `목표 합의 대기: ${user?.name}` : `나의 목표 합의 대기`,
        date: new Date().toISOString(),
        priority: 'medium'
      });
    });

    return tasks.sort((a, b) => (a.priority === 'high' ? -1 : 1));
  }, [events, myGoals, isLeader, memberIds, users, profile.uid]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
      <header className="flex justify-between items-end">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black text-gray-900">Dashboard</h2>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-white border border-gray-100 rounded-xl shadow-sm hover:bg-gray-50 transition-all text-gray-400 hover:text-blue-600"
            title="대시보드 설정"
          >
            <Settings size={20} />
          </button>
        </div>
        {isLeader && (
          <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            <span className="text-sm font-bold text-blue-700">팀원 {teamMembers.length}명</span>
          </div>
        )}
      </header>

      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gray-900 text-white p-6 rounded-[2rem] overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold">대시보드 위젯 설정</h4>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {widgets.map(w => {
                if (w.leaderOnly && !isLeader) return null;
                return (
                  <button
                    key={w.id}
                    onClick={() => toggleWidget(w.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                      w.enabled 
                        ? 'bg-blue-600 border-blue-500 text-white' 
                        : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}
                  >
                    {w.icon}
                    <span className="text-sm font-bold">{w.title}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {widgets.find(w => w.id === 'summary')?.enabled && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Trophy size={80} />
            </div>
            <Trophy className="text-blue-500 mb-4" size={24} />
            <p className="text-gray-500 text-sm font-medium">{isLeader ? '팀 평균 달성도' : '나의 평균 달성도'}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl font-bold text-gray-900 mt-1">{isLeader ? teamAvgAchievement : avgAchievement}%</h3>
              {isLeader && <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">Team</span>}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Calendar size={80} />
            </div>
            <CheckCircle2 className="text-emerald-500 mb-4" size={24} />
            <p className="text-gray-500 text-sm font-medium">{isLeader ? '팀 전체 등록 건수 (올해)' : '등록된 이벤트'}</p>
            <h3 className="text-4xl font-bold text-gray-900 mt-1">{isLeader ? eventStats.totalThisYear : myEvents.length}건</h3>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Target size={80} />
            </div>
            <Target className="text-amber-500 mb-4" size={24} />
            <p className="text-gray-500 text-sm font-medium">{isLeader ? '최근 1주일 등록 건수' : '나의 목표 상태'}</p>
            <h3 className="text-4xl font-bold text-gray-900 mt-1">{isLeader ? eventStats.recentCount : '진행 중'}</h3>
          </div>
        </div>
      )}

      {isLeader && eventStats.unassignedCount > 0 && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="text-amber-600" size={20} />
          <p className="text-sm font-medium text-amber-800">
            영역이 미할당된 기록이 <span className="font-bold">{eventStats.unassignedCount}건</span> 있습니다. 팀원들에게 확인을 요청하세요.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          {widgets.find(w => w.id === 'monthly')?.enabled && (
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 mb-6">{isLeader ? '팀 월별 달성도 추이' : '나의 월별 달성도 추이'}</h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyAchievementData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 600 }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontWeight: 700, color: '#3B82F6' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="achievement" 
                      stroke="#3B82F6" 
                      strokeWidth={4} 
                      dot={{ r: 6, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 8, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {widgets.find(w => w.id === 'category')?.enabled && (
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 mb-6">{isLeader ? '팀 영역별 달성 비율' : '영역별 목표 달성 현황'}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {categoryAchievementData.map((data) => (
                  <div key={data.name} className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-bold text-gray-500">{data.name}</span>
                      <span className="text-2xl font-black text-gray-900">{data.achievement}%</span>
                    </div>
                    <div className="relative h-24 flex items-end justify-center bg-gray-50 rounded-2xl overflow-hidden p-2">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${data.achievement}%` }}
                        className="w-full rounded-xl shadow-lg"
                        style={{ backgroundColor: data.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLeader && widgets.find(w => w.id === 'workgroup')?.enabled && workGroupAchievementData.length > 0 && (
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 mb-6">업무그룹별 달성율</h4>
              <div className="space-y-4">
                {workGroupAchievementData.map((wg) => (
                  <div key={wg.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-700">{wg.name}</span>
                      <span className="text-sm font-black text-gray-900">{wg.achievement}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${wg.achievement}%` }}
                        className="h-full bg-blue-500 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLeader && widgets.find(w => w.id === 'summary')?.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="text-emerald-600" size={20} />
                  <span className="text-sm font-bold text-emerald-800">최고 핵심지표</span>
                </div>
                <p className="text-xs text-emerald-600 font-medium mb-1">{maxIndicator?.name}</p>
                <h5 className="text-3xl font-black text-emerald-900">{maxIndicator?.achievement}%</h5>
              </div>
              <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown className="text-rose-600" size={20} />
                  <span className="text-sm font-bold text-rose-800">최저 핵심지표</span>
                </div>
                <p className="text-xs text-rose-600 font-medium mb-1">{minIndicator?.name}</p>
                <h5 className="text-3xl font-black text-rose-900">{minIndicator?.achievement}%</h5>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          {widgets.find(w => w.id === 'pending')?.enabled && pendingTasks.length > 0 && (
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-bold text-gray-900">대기 업무 ({pendingTasks.length})</h4>
                <Clock className="text-amber-500" size={20} />
              </div>
              <div className="space-y-3">
                {pendingTasks.map(task => (
                  <div key={task.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                      <div>
                        <p className="text-sm font-bold text-gray-900">{task.title}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{new Date(task.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {widgets.find(w => w.id === 'recent')?.enabled && recentAchievements.length > 0 && (
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-bold text-gray-900">최근 주요 성과</h4>
                <Trophy className="text-blue-500" size={20} />
              </div>
              <div className="space-y-4">
                {recentAchievements.map(event => {
                  const user = users.find(u => u.uid === event.userId);
                  return (
                    <div key={event.id} className="flex gap-4">
                      <img src={user?.photoURL} alt={user?.name} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-bold text-gray-900">{event.title}</p>
                          <span className="text-xs font-black text-blue-600">{event.achievement}%</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium">{user?.name} • {new Date(event.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isLeader && widgets.find(w => w.id === 'ranking')?.enabled && (
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 mb-6">팀원별 성과 랭킹</h4>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">TOP</div>
                    <div>
                      <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">최고 달성 팀원</p>
                      <p className="text-lg font-black text-blue-900">{topMember?.name}</p>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-blue-600">{topMember?.achievement}%</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold text-xs">LOW</div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">최저 달성 팀원</p>
                      <p className="text-lg font-black text-gray-900">{bottomMember?.name}</p>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-gray-400">{bottomMember?.achievement}%</span>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm font-bold text-gray-900 mb-4">전체 팀원 현황</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={memberAchievementData} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} width={60} />
                        <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                        <Bar dataKey="achievement" radius={[0, 4, 4, 0]} barSize={16}>
                          {memberAchievementData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#3B82F6' : index === memberAchievementData.length - 1 ? '#94A3B8' : '#E2E8F0'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isLeader && (
            <div className="bg-indigo-900 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <BarChart3 size={120} />
              </div>
              <h4 className="text-xl font-bold mb-4">성과 요약 리포트</h4>
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-indigo-200 text-sm">팀 목표 달성률</span>
                  <span className="font-bold">{teamAvgAchievement}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-indigo-200 text-sm">미할당 기록 건수</span>
                  <span className={`font-bold ${eventStats.unassignedCount > 0 ? 'text-amber-400' : ''}`}>{eventStats.unassignedCount}건</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-indigo-200 text-sm">최근 주간 활동성</span>
                  <span className="font-bold">{eventStats.recentCount}건</span>
                </div>
              </div>
              <button className="w-full mt-6 bg-white/10 hover:bg-white/20 py-3 rounded-xl font-bold text-sm transition-colors">
                상세 리포트 다운로드
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const MeetingView: React.FC<{
  profile: UserProfile;
  users: UserProfile[];
  events: PerformanceEvent[];
  meetingComments: MeetingComment[];
  myGoals: MemberGoal[];
  indicators: GoalIndicator[];
  teamGoals: TeamGoal[];
  departments: Department[];
  isMockMode: boolean;
  setMeetingComments: React.Dispatch<React.SetStateAction<MeetingComment[]>>;
}> = ({ profile, users, events, meetingComments, myGoals, indicators, teamGoals, departments, isMockMode, setMeetingComments }) => {
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'comments' | 'goals' | 'records'>('comments');
  const [selectedQuarter, setSelectedQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
  const [commentContent, setCommentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const activeDeptId = profile.workGroupId || profile.teamId;
  const teamMembers = useMemo(() => {
    return users.filter(u => (profile.workGroupId ? u.workGroupId === activeDeptId : u.teamId === activeDeptId) && u.uid !== profile.uid);
  }, [users, activeDeptId, profile.uid, profile.workGroupId, profile.teamId]);

  const handleSaveComment = async () => {
    if (!selectedMember || !commentContent.trim()) return;
    setIsSubmitting(true);

    const newComment: MeetingComment = {
      id: Math.random().toString(36).substr(2, 9),
      userId: selectedMember.uid,
      leaderId: profile.uid,
      quarter: selectedQuarter,
      year: new Date().getFullYear(),
      content: commentContent,
      createdAt: new Date().toISOString(),
    };

    if (isMockMode) {
      setMeetingComments(prev => [...prev, newComment]);
      setCommentContent('');
      alert('의견이 등록되었습니다. (MOCK MODE)');
    } else {
      try {
        await setDoc(doc(db, 'meetingComments', newComment.id), newComment);
        setCommentContent('');
        alert('의견이 등록되었습니다.');
      } catch (error) {
        console.error('Failed to save comment', error);
      }
    }
    setIsSubmitting(false);
  };

  const getMemberStats = (memberId: string) => {
    const mEvents = events.filter(e => e.userId === memberId);
    const avg = mEvents.length > 0 ? Math.round(mEvents.reduce((acc, curr) => acc + curr.achievement, 0) / mEvents.length) : 0;
    return { avg, count: mEvents.length };
  };

  const selectedMemberGoals = useMemo(() => {
    if (!selectedMember) return [];
    return myGoals.filter(g => g.userId === selectedMember.uid);
  }, [selectedMember, myGoals]);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const currentGoal = useMemo(() => {
    if (!selectedMember) return null;
    return myGoals.find(g => g.year === selectedYear && g.userId === selectedMember.uid);
  }, [selectedMember, myGoals, selectedYear]);

  const memberDeptId = selectedMember?.workGroupId || selectedMember?.teamId;
  const memberDept = departments.find(d => d.id === memberDeptId);
  const parentDept = memberDept?.parentId ? departments.find(d => d.id === memberDept.parentId) : null;
  const parentTeamGoal = parentDept ? teamGoals.find(g => 
    g.departmentId === parentDept.id && 
    g.year === selectedYear &&
    g.status === 'published'
  ) : null;
  const myTeamGoal = teamGoals.find(g => 
    g.departmentId === memberDeptId && 
    g.year === selectedYear &&
    g.status === 'published'
  );
  const effectiveTeamGoal = myTeamGoal || parentTeamGoal;

  const goalIndicators = useMemo(() => {
    if (!currentGoal) return [];
    if (currentGoal.customIndicators && currentGoal.customIndicators.length > 0) {
      return currentGoal.customIndicators;
    }
    if (currentGoal.indicatorIds && currentGoal.indicatorIds.length > 0) {
      return currentGoal.indicatorIds.map(id => {
        const ind = indicators.find(i => i.id === id);
        return {
          indicatorId: id,
          name: ind?.name,
          customDescription: ind?.description || '',
          category: (ind?.code.includes('ACH') ? 'achievement' : ind?.code.includes('JOB') ? 'job' : 'competency') as GoalCategory,
          weight: 100 / currentGoal.indicatorIds!.length
        };
      });
    }
    return [];
  }, [currentGoal, indicators]);

  const achievementData = useMemo(() => {
    if (!currentGoal || !selectedMember) return null;
    
    const mEvents = events.filter(e => e.userId === selectedMember.uid);

    const categoryStats = {
      achievement: { current: 0, total: 0 },
      job: { current: 0, total: 0 },
      competency: { current: 0, total: 0 }
    };

    goalIndicators.forEach(ci => {
      const indEvents = mEvents.filter(e => e.indicatorId === ci.indicatorId);
      const indAchievement = indEvents.reduce((sum, e) => sum + e.achievement, 0);
      
      const catWeight = effectiveTeamGoal?.categoryWeights[ci.category] || 33.3;
      const absoluteWeight = (catWeight * ci.weight) / 100;
      
      const contribution = (indAchievement * absoluteWeight) / 100;
      
      categoryStats[ci.category].current += contribution;
      categoryStats[ci.category].total += absoluteWeight;
    });

    const totalCurrent = categoryStats.achievement.current + categoryStats.job.current + categoryStats.competency.current;
    
    return {
      categories: categoryStats,
      total: totalCurrent
    };
  }, [currentGoal, events, selectedMember, goalIndicators, effectiveTeamGoal]);

  const selectedMemberEvents = useMemo(() => {
    if (!selectedMember) return [];
    return events.filter(e => e.userId === selectedMember.uid).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedMember, events]);

  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return teamMembers;
    return teamMembers.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [teamMembers, searchTerm]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
        </div>
        
        <div className="relative w-full md:w-80">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="팀원 이름 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
            />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto w-full">
        {selectedMember ? (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-8 items-center md:items-start relative">
              <button 
                onClick={() => setSelectedMember(null)}
                className="absolute top-6 right-6 p-2 text-gray-300 hover:text-gray-500 hover:bg-gray-50 rounded-full transition-all"
              >
                <X size={20} />
              </button>
              <img src={selectedMember.photoURL || `https://ui-avatars.com/api/?name=${selectedMember.name}`} className="w-32 h-32 rounded-[2rem] object-cover shadow-xl" alt="" />
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                  <h3 className="text-3xl font-black text-gray-900">{selectedMember.name}</h3>
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-100 self-center md:self-auto">
                    {selectedMember.position}
                  </span>
                </div>
                <p className="text-gray-500 mb-6">{selectedMember.email}</p>
                
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto md:mx-0">
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">평균 달성도</p>
                    <p className="text-2xl font-black text-gray-900">{getMemberStats(selectedMember.uid).avg}%</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">총 기록 건수</p>
                    <p className="text-2xl font-black text-gray-900">{getMemberStats(selectedMember.uid).count}건</p>
                  </div>
                </div>
              </div>
            </div>

              {/* Sub Tabs */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
                <button
                  onClick={() => setActiveSubTab('comments')}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeSubTab === 'comments' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  면담 의견
                </button>
                <button
                  onClick={() => setActiveSubTab('goals')}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeSubTab === 'goals' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  목표 현황
                </button>
                <button
                  onClick={() => setActiveSubTab('records')}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeSubTab === 'records' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  성과 기록
                </button>
              </div>

              <AnimatePresence mode="wait">
                {activeSubTab === 'comments' && (
                  <motion.div
                    key="comments"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare size={18} className="text-blue-500" />
                        분기별 면담 의견
                      </h4>
                      <div className="flex bg-gray-100 p-1 rounded-xl">
                        {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => (
                          <button
                            key={q}
                            onClick={() => setSelectedQuarter(q)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              selectedQuarter === q ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">의견 작성 ({selectedQuarter})</label>
                        <textarea
                          value={commentContent}
                          onChange={(e) => setCommentContent(e.target.value)}
                          placeholder={`${selectedMember.name} 팀원의 ${selectedQuarter} 성과 및 역량에 대한 의견을 작성해주세요.`}
                          className="w-full h-24 bg-transparent border-none focus:ring-0 text-gray-900 placeholder-gray-300 resize-none text-sm font-medium"
                        />
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={handleSaveComment}
                            disabled={isSubmitting || !commentContent.trim()}
                            className="px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isSubmitting ? <Clock size={16} className="animate-spin" /> : <Plus size={16} />}
                            의견 저장
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">이전 면담 기록</h5>
                        <div className="border-t border-gray-100 divide-y divide-gray-50">
                          {meetingComments
                            .filter(c => c.userId === selectedMember.uid)
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .map(comment => (
                              <div key={comment.id} className="py-4 group transition-colors hover:bg-gray-50/50 px-1">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="px-2 py-0.5 bg-gray-900 text-white text-[9px] font-black rounded-md uppercase tracking-widest">
                                    {comment.year} {comment.quarter}
                                  </span>
                                  <span className="text-[10px] font-bold text-gray-300">
                                    {new Date(comment.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed font-medium">{comment.content}</p>
                              </div>
                            ))}
                          {meetingComments.filter(c => c.userId === selectedMember.uid).length === 0 && (
                            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200 mt-2">
                              <FileText className="mx-auto text-gray-300 mb-2" size={32} />
                              <p className="text-gray-400 text-sm font-medium">등록된 면담 기록이 없습니다.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeSubTab === 'goals' && (
                  <motion.div
                    key="goals"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Target size={18} className="text-blue-500" />
                          목표 현황
                        </h4>
                        <div className="flex gap-3">
                          {[2024, 2025, 2026].map(year => (
                            <button
                              key={year}
                              onClick={() => setSelectedYear(year)}
                              className={`text-xs font-bold transition-all ${selectedYear === year ? 'text-gray-900 underline underline-offset-4' : 'text-gray-300 hover:text-gray-500'}`}
                            >
                              {year}
                            </button>
                          ))}
                        </div>
                      </div>
                      {currentGoal && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase w-fit ${
                          currentGoal.status === 'agreed' ? 'bg-emerald-100 text-emerald-700' : 
                          currentGoal.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {currentGoal.status === 'pending' ? '합의 대기' : currentGoal.status === 'agreed' ? '합의 완료' : '초안'}
                        </span>
                      )}
                    </div>

                    {currentGoal ? (
                      <div className="space-y-6">
                        {/* Compact Achievement Summary */}
                        {achievementData && (
                          <div className="bg-gray-900 rounded-2xl p-5 text-white">
                            <div className="flex justify-between items-center mb-4">
                              <div>
                                <p className="text-xs font-black uppercase tracking-widest opacity-50">전체 달성률</p>
                                <p className="text-2xl font-black">{achievementData.total.toFixed(1)}%</p>
                              </div>
                              <div className="flex gap-3">
                                {(['achievement', 'job', 'competency'] as GoalCategory[]).map(cat => {
                                  const stats = achievementData.categories[cat];
                                  const label = cat === 'achievement' ? '업적' : cat === 'job' ? '직무' : '역량';
                                  const colorClass = cat === 'achievement' ? 'bg-emerald-400' : cat === 'job' ? 'bg-blue-400' : 'bg-purple-400';
                                  return (
                                    <div key={cat} className="flex flex-col items-center">
                                      <div className={`w-1.5 h-1.5 rounded-full ${colorClass} mb-1`} />
                                      <p className="text-xs font-bold opacity-70">{label}</p>
                                      <p className="text-xs font-black">{stats.current.toFixed(0)}%</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, achievementData.total)}%` }}
                                className="h-full bg-emerald-400"
                              />
                            </div>
                          </div>
                        )}

                        {/* Narrative Goal - Compact */}
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <p className="text-sm text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">{currentGoal.narrative}</p>
                        </div>

                        {/* Indicators List - Vertical & Compact List Mode */}
                        <div className="space-y-4">
                          <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">핵심 지표 상세</h5>
                          <div className="border-t border-gray-100 divide-y divide-gray-50">
                            {goalIndicators.map(ci => {
                              const ind = indicators.find(i => i.id === ci.indicatorId);
                              const indName = ci.name || ind?.name || '커스텀 지표';
                              const weight = ci.weight || 0;
                              const category = ci.category || 'achievement';
                              const indEvents = selectedMemberEvents.filter(e => e.indicatorId === ci.indicatorId);
                              const indAchievement = Math.min(100, indEvents.reduce((sum, e) => sum + e.achievement, 0));
                              
                              return (
                                <div key={ci.indicatorId} className="py-4 flex items-center gap-4 group transition-colors hover:bg-gray-50/50 px-1">
                                  <div className="w-12 shrink-0">
                                    <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                                      category === 'achievement' ? 'text-emerald-600 bg-emerald-50' : 
                                      category === 'job' ? 'text-blue-600 bg-blue-50' : 
                                      'text-purple-600 bg-purple-50'
                                    }`}>
                                      {category === 'achievement' ? '업적' : category === 'job' ? '직무' : '역량'}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-900 text-sm truncate">{indName}</p>
                                    <p className="text-xs text-gray-400 truncate font-medium">{ci.customDescription || ind?.description}</p>
                                  </div>
                                  <div className="w-32 shrink-0 flex items-center gap-4">
                                    <div className="text-right min-w-[32px]">
                                      <p className="text-[9px] font-bold text-gray-400 uppercase leading-none mb-1">비중</p>
                                      <p className="text-xs font-black text-gray-900 leading-none">{Math.round(weight)}%</p>
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex justify-between items-center mb-1">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase leading-none">달성</p>
                                        <p className="text-xs font-black text-gray-900 leading-none">{indAchievement}%</p>
                                      </div>
                                      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: `${indAchievement}%` }}
                                          className={`h-full ${
                                            category === 'achievement' ? 'bg-emerald-500' : 
                                            category === 'job' ? 'bg-blue-500' : 
                                            'bg-purple-500'
                                          }`}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <Target className="mx-auto text-gray-300 mb-2" size={32} />
                        <p className="text-gray-400 text-sm font-medium">{selectedYear}년도 목표가 없습니다.</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeSubTab === 'records' && (
                  <motion.div
                    key="records"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm"
                  >
                    <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Trophy size={18} className="text-blue-500" />
                      성과 기록실
                    </h4>
                    <div className="border-t border-gray-100 divide-y divide-gray-50">
                      {selectedMemberEvents.length > 0 ? (
                        selectedMemberEvents.map(event => {
                          const indicator = indicators.find(i => i.id === event.indicatorId);
                          return (
                            <div key={event.id} className="py-5 group transition-colors hover:bg-gray-50/50 px-1">
                              <div className="flex justify-between items-start gap-4 mb-2">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${
                                    event.achievement >= 80 ? 'bg-emerald-50 text-emerald-600' : 
                                    event.achievement >= 50 ? 'bg-blue-50 text-blue-600' : 
                                    'bg-amber-50 text-amber-600'
                                  }`}>
                                    <Trophy size={20} />
                                  </div>
                                  <div className="min-w-0">
                                    <h5 className="font-bold text-gray-900 text-sm truncate">{event.title}</h5>
                                    <p className="text-xs text-gray-400 font-medium truncate">{indicator?.name || '일반 활동'}</p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-xl font-black text-gray-900">{event.achievement}%</span>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{new Date(event.date).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 leading-relaxed pl-13 line-clamp-2 group-hover:line-clamp-none transition-all">
                                {event.description}
                              </p>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200 mt-4">
                          <Trophy className="mx-auto text-gray-300 mb-2" size={32} />
                          <p className="text-gray-400 text-sm font-medium">등록된 성과 기록이 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-gray-900">팀원 목록</h3>
                <span className="text-sm font-bold text-gray-400">총 {filteredMembers.length}명</span>
              </div>
              
              <div className="space-y-3">
                {filteredMembers.map(member => {
                  const stats = getMemberStats(member.uid);
                  const memberGoal = myGoals.find(g => g.userId === member.uid && g.year === new Date().getFullYear());
                  const hasPendingGoal = memberGoal?.status === 'pending';
                  
                  return (
                    <button
                      key={member.uid}
                      onClick={() => setSelectedMember(member)}
                      className="w-full bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-lg hover:scale-[1.01] transition-all duration-300 text-left group flex items-center gap-6"
                    >
                      <div className="relative shrink-0">
                        <img 
                          src={member.photoURL || `https://ui-avatars.com/api/?name=${member.name}`} 
                          className="w-14 h-14 rounded-2xl object-cover shadow-md group-hover:shadow-blue-100 transition-all" 
                          alt="" 
                        />
                        {hasPendingGoal && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 border-2 border-white rounded-full animate-pulse" title="합의 대기중인 목표가 있습니다" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div className="md:col-span-1">
                          <h4 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">{member.name}</h4>
                          <p className="text-xs font-medium text-gray-400 truncate">{member.position}</p>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          <div className="flex justify-between items-end">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">평균 달성률</p>
                            <p className="text-sm font-black text-gray-900">{stats.avg}%</p>
                          </div>
                          <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${stats.avg}%` }}
                              className={`h-full transition-all ${
                                stats.avg >= 80 ? 'bg-emerald-500' : 
                                stats.avg >= 50 ? 'bg-blue-500' : 
                                'bg-amber-500'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="md:col-span-1 flex items-center justify-end gap-4">
                          <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">기록</p>
                            <p className="text-sm font-black text-gray-900">{stats.count}건</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                            <ChevronRight size={18} />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {teamMembers.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200 p-24 text-center">
                  <div className="w-24 h-24 bg-white rounded-[2rem] shadow-sm flex items-center justify-center mb-8">
                    <Users size={48} className="text-gray-200" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">관리할 팀원이 없습니다</h3>
                  <p className="text-gray-500 max-w-xs mx-auto">현재 소속된 팀에 팀원이 존재하지 않거나 정보를 불러올 수 없습니다.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

const TeamGoalsView: React.FC<{ 
  profile: UserProfile; 
  teamGoals: TeamGoal[]; 
  indicators: GoalIndicator[];
  departments: Department[];
  events: PerformanceEvent[];
  users: UserProfile[];
  isMockMode: boolean;
  setTeamGoals: React.Dispatch<React.SetStateAction<TeamGoal[]>>;
}> = ({ profile, teamGoals, indicators, departments, events, users, isMockMode, setTeamGoals }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [selectedIndicators, setSelectedIndicators] = useState<TeamIndicator[]>([]);
  const [indicatorSearch, setIndicatorSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory>('achievement');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (departments.length > 0 && !selectedDeptId) {
      // Default to user's own department if it exists in the list
      const activeDeptId = profile.workGroupId || profile.teamId;
      const myDept = departments.find(d => d.id === activeDeptId);
      if (myDept) {
        setSelectedDeptId(myDept.id);
      } else {
        // Fallback to first team if user's dept not found
        const firstTeam = departments.find(d => d.type === 'Team');
        if (firstTeam) {
          const firstWG = departments.find(d => d.type === 'WorkGroup' && d.parentId === firstTeam.id);
          setSelectedDeptId(firstWG ? firstWG.id : firstTeam.id);
        }
      }
    }
  }, [departments, selectedDeptId, profile.teamId, profile.workGroupId]);

  const targetDept = departments.find(d => d.id === selectedDeptId);
  const selectedTeamId = targetDept?.type === 'WorkGroup' ? targetDept.parentId : selectedDeptId;
  
  const [categoryWeights, setCategoryWeights] = useState({
    achievement: 40,
    job: 30,
    competency: 30
  });
  
  const currentTeamGoal = teamGoals.find(g => g.departmentId === selectedDeptId && g.year === selectedYear);
  
  // Inheritance logic for WorkGroups
  const parentDept = targetDept?.parentId ? departments.find(d => d.id === targetDept.parentId) : null;
  const parentTeamGoal = parentDept ? teamGoals.find(g => g.departmentId === parentDept.id && g.year === selectedYear) : null;

  const effectiveIndicators = useMemo(() => {
    if (targetDept?.type === 'WorkGroup' && parentTeamGoal) {
      return parentTeamGoal.customIndicators;
    }
    return selectedIndicators;
  }, [targetDept, parentTeamGoal, selectedIndicators]);

  const teamDepts = useMemo(() => departments.filter(d => d.type === 'Team' || d.type === 'WorkGroup'), [departments]);

  const renderDeptFullPath = (deptId: string) => {
    const path: string[] = [];
    let currentId: string | undefined = deptId;
    while (currentId) {
      const dept = departments.find(d => d.id === currentId);
      if (dept) {
        path.unshift(dept.name);
        currentId = dept.parentId;
      } else {
        break;
      }
    }
    return (
      <div className="flex items-center gap-1.5 overflow-hidden">
        {path.map((name, index) => (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />}
            <span className={`whitespace-nowrap ${index === path.length - 1 ? 'text-gray-900 font-bold' : 'text-gray-400 font-medium'}`}>
              {name}
            </span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  const filteredIndicators = useMemo(() => {
    const search = indicatorSearch.toLowerCase();
    const list = indicators.filter(ind => 
      !search || 
      ind.name.toLowerCase().includes(search) || 
      ind.code.toLowerCase().includes(search)
    );
    return list.slice(0, 8);
  }, [indicators, indicatorSearch]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [indicatorSearch]);

  useEffect(() => {
    if (currentTeamGoal) {
      setNarrative(currentTeamGoal.narrative || '');
      setSelectedIndicators(currentTeamGoal.customIndicators || []);
      setCategoryWeights(currentTeamGoal.categoryWeights || { achievement: 40, job: 30, competency: 30 });
    } else {
      setNarrative('');
      setSelectedIndicators([]);
      const dept = departments.find(d => d.id === selectedDeptId);
      setCategoryWeights(dept?.categoryWeights || { achievement: 40, job: 30, competency: 30 });
    }
  }, [currentTeamGoal, selectedYear, selectedDeptId, departments]);

  const handleAddIndicator = (ind: GoalIndicator) => {
    if (selectedIndicators.some(si => si.indicatorId === ind.id)) return;
    setSelectedIndicators(prev => [...prev, {
      indicatorId: ind.id,
      customDescription: ind.description,
      category: selectedCategory,
      weight: 0
    }]);
    setIndicatorSearch('');
  };

  const handleUpdateCustomDescription = (id: string, desc: string) => {
    setSelectedIndicators(prev => prev.map(si => 
      si.indicatorId === id ? { ...si, customDescription: desc } : si
    ));
  };

  const handleUpdateCategory = (id: string, category: GoalCategory) => {
    setSelectedIndicators(prev => prev.map(si => 
      si.indicatorId === id ? { ...si, category } : si
    ));
  };

  const handleUpdateWeight = (id: string, weight: number) => {
    setSelectedIndicators(prev => prev.map(si => 
      si.indicatorId === id ? { ...si, weight } : si
    ));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredIndicators.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % filteredIndicators.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + filteredIndicators.length) % filteredIndicators.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleAddIndicator(filteredIndicators[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsSearchFocused(false);
    }
  };

  const handleRemoveIndicator = (id: string) => {
    setSelectedIndicators(prev => prev.filter(si => si.indicatorId !== id));
  };

  const handleSaveTeamGoal = async (status: TeamGoalStatus) => {
    if (!narrative) return;
    
    const totalWeight = categoryWeights.achievement + categoryWeights.job + categoryWeights.competency;
    if (totalWeight !== 100) {
      alert('영역별 가중치의 합은 100%가 되어야 합니다.');
      return;
    }

    // Validate indicator weights per category
    const categories: GoalCategory[] = ['achievement', 'job', 'competency'];
    for (const cat of categories) {
      const catInds = selectedIndicators.filter(si => si.category === cat);
      if (catInds.length > 0) {
        const sum = catInds.reduce((acc, curr) => acc + curr.weight, 0);
        if (sum !== 100) {
          alert(`${cat === 'achievement' ? '업적' : cat === 'job' ? '직무' : '역량'} 영역 지표 가중치의 합이 100%가 아닙니다. (현재: ${sum}%)`);
          return;
        }
      }
    }

    const goalData: TeamGoal = {
      id: currentTeamGoal?.id || `team-goal-${selectedDeptId}-${selectedYear}`,
      departmentId: selectedDeptId,
      year: selectedYear,
      status,
      narrative,
      customIndicators: targetDept?.type === 'WorkGroup' ? effectiveIndicators : selectedIndicators,
      categoryWeights
    };

    if (isMockMode) {
      const newGoals = [...teamGoals.filter(g => g.id !== goalData.id), goalData];
      setTeamGoals(newGoals);
      mockDb.setTeamGoals(newGoals);
      setIsEditing(false);
      alert(`${selectedYear}년도 팀 목표가 ${status === 'published' ? '게시' : '임시 저장'}되었습니다. (MOCK MODE)`);
      return;
    }

    if (!db) return;
    try {
      await setDoc(doc(db, 'teamGoals', goalData.id), goalData);
      setIsEditing(false);
      alert(`${selectedYear}년도 팀 목표가 ${status === 'published' ? '게시' : '임시 저장'}되었습니다.`);
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'teamGoals'); }
  };

  const activeDeptId = profile.workGroupId || profile.teamId;
  const canEdit = (profile.role === 'leader' && activeDeptId === selectedDeptId) || 
                  profile.role === 'head' || 
                  profile.role === 'admin';

  const isDraftHidden = currentTeamGoal?.status === 'draft' && !canEdit;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-6xl mx-auto space-y-8">
      <div className="space-y-2">
        {/* Top: Team List (Concise) */}
        <div className="border-b border-gray-100">
          <div className="flex gap-8 px-2 overflow-x-auto pb-1 scrollbar-hide">
            {departments.filter(d => d.type === 'Team').map(team => {
              const isActive = selectedTeamId === team.id;
              return (
                <button
                  key={team.id}
                  onClick={() => {
                    const wgs = departments.filter(d => d.type === 'WorkGroup' && d.parentId === team.id);
                    if (wgs.length > 0) {
                      setSelectedDeptId(wgs[0].id);
                    } else {
                      setSelectedDeptId(team.id);
                    }
                    setIsEditing(false);
                  }}
                  className={`relative py-2 text-sm font-bold transition-all whitespace-nowrap ${isActive ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {team.name}
                  {isActive && (
                    <motion.div layoutId="team-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub: WorkGroup List (Only if selected team has workgroups) */}
        {departments.some(d => d.type === 'WorkGroup' && d.parentId === selectedTeamId) && (
          <div className="flex flex-wrap gap-5 px-3 py-0.5">
            {departments.filter(d => d.type === 'WorkGroup' && d.parentId === selectedTeamId).map(wg => (
              <button
                key={wg.id}
                onClick={() => { setSelectedDeptId(wg.id); setIsEditing(false); }}
                className={`flex items-center gap-1.5 transition-all ${selectedDeptId === wg.id ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <div className={`w-1 h-1 rounded-full ${selectedDeptId === wg.id ? 'bg-gray-900' : 'bg-gray-300'}`} />
                <span className={`text-[11px] ${selectedDeptId === wg.id ? 'font-bold' : 'font-medium'}`}>{wg.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Main Content */}
        <div className="w-full pt-2">
          {isDraftHidden ? (
            <div className="bg-white p-20 rounded-[2rem] border border-gray-100 shadow-sm text-center">
              <AlertCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">목표가 아직 게시되지 않았습니다.</h3>
              <p className="text-gray-500">팀장이 목표를 최종 등록한 이후에 조회가 가능합니다.</p>
            </div>
          ) : isEditing ? (
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-8">
              <div className="flex items-center gap-3 pb-6 border-b border-gray-50">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Building2 size={20} className="text-gray-600" />
                </div>
                <div>
                  {renderDeptFullPath(selectedDeptId)}
                  <p className="text-xs text-gray-400 mt-0.5">{selectedYear}년도 목표 설정 중</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">영역별 가중치 설정 (합계 100%)</label>
                <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <div>
                    <p className="text-sm font-bold text-blue-600 mb-2 uppercase flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      업적
                    </p>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={categoryWeights.achievement} 
                        onChange={(e) => setCategoryWeights(prev => ({ ...prev, achievement: parseInt(e.target.value) || 0 }))}
                        className="w-full p-3 bg-white border border-blue-100 rounded-xl text-center font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-blue-400">%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-600 mb-2 uppercase flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      직무
                    </p>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={categoryWeights.job} 
                        onChange={(e) => setCategoryWeights(prev => ({ ...prev, job: parseInt(e.target.value) || 0 }))}
                        className="w-full p-3 bg-white border border-emerald-100 rounded-xl text-center font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-emerald-400">%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-600 mb-2 uppercase flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      역량
                    </p>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={categoryWeights.competency} 
                        onChange={(e) => setCategoryWeights(prev => ({ ...prev, competency: parseInt(e.target.value) || 0 }))}
                        className="w-full p-3 bg-white border border-amber-100 rounded-xl text-center font-bold outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-amber-400">%</span>
                    </div>
                  </div>
                </div>
                <p className={`text-xs mt-2 font-bold ${categoryWeights.achievement + categoryWeights.job + categoryWeights.competency === 100 ? 'text-emerald-500' : 'text-red-500'}`}>
                  현재 합계: {categoryWeights.achievement + categoryWeights.job + categoryWeights.competency}%
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">
                  {targetDept?.type === 'WorkGroup' ? '업무그룹 서술형 목표' : '팀 서술형 목표'}
                </label>
                <textarea value={narrative} onChange={(e) => setNarrative(e.target.value)} placeholder={targetDept?.type === 'WorkGroup' ? "업무그룹의 목표를 입력하세요..." : "팀원들과 공유할 올해의 팀 목표를 기술해주세요..."} className="w-full h-48 p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              
              <div className="space-y-6">
                {targetDept?.type !== 'WorkGroup' ? (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">핵심 지표 검색 및 추가</label>
                    <div className="flex gap-4 mb-4">
                      {['achievement', 'job', 'competency'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat as GoalCategory)}
                          className={`flex-1 py-4 rounded-xl text-sm font-bold transition-all border-2 ${
                            selectedCategory === cat 
                              ? cat === 'achievement' ? 'bg-blue-600 text-white border-blue-600 shadow-lg' :
                                cat === 'job' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' :
                                'bg-amber-600 text-white border-amber-600 shadow-lg'
                              : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          {cat === 'achievement' ? '업적 지표' : cat === 'job' ? '직무 지표' : '역량 지표'}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        value={indicatorSearch} 
                        onChange={(e) => setIndicatorSearch(e.target.value)} 
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        onKeyDown={handleKeyDown}
                        placeholder="지표명 또는 코드로 검색 (예: 기능 개선, DEV-001)" 
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-gray-900" 
                      />
                      
                      {isSearchFocused && filteredIndicators.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 overflow-hidden">
                          {filteredIndicators.map((ind, index) => (
                            <button 
                              key={ind.id} 
                              onClick={() => handleAddIndicator(ind)}
                              onMouseEnter={() => setHighlightedIndex(index)}
                              className={`w-full p-4 text-left flex items-center justify-between group border-b border-gray-50 last:border-0 transition-colors ${highlightedIndex === index ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}
                            >
                              <div>
                                <p className={`font-bold ${highlightedIndex === index ? 'text-white' : 'text-gray-900'}`}>{ind.name}</p>
                                <p className={`text-xs ${highlightedIndex === index ? 'text-gray-400' : 'text-gray-500'}`}>{ind.code}</p>
                              </div>
                              <Plus size={16} className={highlightedIndex === index ? 'text-white' : 'text-gray-300 group-hover:text-gray-900'} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertCircle className="text-blue-600" size={20} />
                      <h4 className="font-bold text-blue-900">지표 상속 안내</h4>
                    </div>
                    <p className="text-sm text-blue-700 leading-relaxed">
                      업무그룹은 상위 팀({parentDept?.name})의 핵심 지표를 상속받아 사용합니다. <br/>
                      이곳에서는 영역별 가중치와 서술형 목표만 설정하며, 지표 구성은 팀 목표 설정을 따릅니다.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <label className="block text-sm font-bold text-gray-900 uppercase tracking-wider">
                    {targetDept?.type === 'WorkGroup' ? '상속된 팀 지표 확인' : '선택된 지표 및 세부 내용 수정'}
                  </label>
                  {effectiveIndicators.length > 0 ? (
                    <div className="space-y-4">
                      {effectiveIndicators.map(si => {
                        const ind = indicators.find(i => i.id === si.indicatorId);
                        const isWorkGroup = targetDept?.type === 'WorkGroup';
                        return (
                          <div key={si.indicatorId} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                  <BarChart3 size={16} className="text-gray-900" />
                                </div>
                                <h4 className="font-bold text-gray-900">{ind?.name} <span className="text-xs font-normal text-gray-400 ml-2">{ind?.code}</span></h4>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border ${
                                  si.category === 'achievement' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                                  si.category === 'job' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                  'bg-amber-50 border-amber-100 text-amber-600'
                                }`}>
                                  {si.category === 'achievement' ? '업적' : si.category === 'job' ? '직무' : '역량'}
                                </span>
                                <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-1.5">
                                  <span className="text-xs font-bold text-gray-900">{si.weight}</span>
                                  <span className="text-[10px] text-gray-400 font-bold">%</span>
                                </div>
                                {!isWorkGroup && (
                                  <button onClick={() => handleRemoveIndicator(si.indicatorId)} className="text-gray-400 hover:text-red-500 transition-colors ml-2">
                                    <LogOut size={16} className="rotate-180" />
                                  </button>
                                )}
                              </div>
                            </div>
                            {isWorkGroup ? (
                              <p className="text-sm text-gray-600 bg-white/50 p-4 rounded-xl border border-gray-50 italic">
                                {si.customDescription}
                              </p>
                            ) : (
                              <textarea 
                                value={si.customDescription} 
                                onChange={(e) => handleUpdateCustomDescription(si.indicatorId, e.target.value)}
                                className="w-full p-3 bg-white border border-gray-100 rounded-xl text-sm text-gray-600 outline-none focus:ring-2 focus:ring-gray-900 h-24"
                                placeholder="지표에 대한 팀별 세부 내용을 입력하세요..."
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-12 border-2 border-dashed border-gray-100 rounded-[2rem] text-center">
                      <p className="text-gray-400 text-sm">
                        {targetDept?.type === 'WorkGroup' 
                          ? '상위 팀에 등록된 지표가 없습니다. 팀 목표를 먼저 설정해주세요.' 
                          : '추가된 지표가 없습니다. 위 검색창에서 지표를 검색하여 추가하세요.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-gray-50">
                <button onClick={() => handleSaveTeamGoal('published')} className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg shadow-gray-200">목표 게시하기</button>
                <button onClick={() => handleSaveTeamGoal('draft')} className="flex-1 py-4 bg-white border border-gray-900 text-gray-900 rounded-2xl font-bold">임시 저장</button>
                <button onClick={() => setIsEditing(false)} className="px-8 py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold">취소</button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {currentTeamGoal ? (
                <>
                  <div className="bg-white p-10 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-gray-900 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">{selectedYear} GOAL</span>
                          {currentTeamGoal.status === 'draft' && (
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-widest">임시 저장</span>
                          )}
                          <span className="text-gray-300">/</span>
                          {renderDeptFullPath(selectedDeptId)}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <select 
                              value={selectedYear}
                              onChange={(e) => { setSelectedYear(parseInt(e.target.value)); setIsEditing(false); }}
                              className="appearance-none pl-4 pr-10 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer transition-all"
                            >
                              {[2024, 2025, 2026, 2027, 2028].map(year => (
                                <option key={year} value={year}>{year}년</option>
                              ))}
                            </select>
                            <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" />
                          </div>
                          {canEdit && !isEditing && (
                            <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all flex items-center gap-2 shadow-md">
                              <Settings size={14} />
                              수정
                            </button>
                          )}
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-6 leading-tight whitespace-pre-wrap">{currentTeamGoal.narrative}</h3>
                      
                      <div className="mb-8">
                        <div className="h-10 w-full bg-gray-100 rounded-xl overflow-hidden flex shadow-inner border border-gray-100">
                          {(currentTeamGoal.categoryWeights?.achievement || 0) > 0 && (
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${currentTeamGoal.categoryWeights?.achievement}%` }}
                              className="h-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold whitespace-nowrap overflow-hidden px-2 tracking-tight"
                            >
                              업적 {currentTeamGoal.categoryWeights?.achievement}%
                            </motion.div>
                          )}
                          {(currentTeamGoal.categoryWeights?.job || 0) > 0 && (
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${currentTeamGoal.categoryWeights?.job}%` }}
                              className="h-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold whitespace-nowrap overflow-hidden px-2 border-l border-white/10 tracking-tight"
                            >
                              직무 {currentTeamGoal.categoryWeights?.job}%
                            </motion.div>
                          )}
                          {(currentTeamGoal.categoryWeights?.competency || 0) > 0 && (
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${currentTeamGoal.categoryWeights?.competency}%` }}
                              className="h-full bg-amber-500 flex items-center justify-center text-white text-sm font-bold whitespace-nowrap overflow-hidden px-2 border-l border-white/10 tracking-tight"
                            >
                              역량 {currentTeamGoal.categoryWeights?.competency}%
                            </motion.div>
                          )}
                        </div>
                      </div>

                      <div className="w-full overflow-hidden whitespace-nowrap text-ellipsis">
                        {effectiveIndicators?.map(ci => {
                          const ind = indicators.find(i => i.id === ci.indicatorId);
                          return ind ? (
                            <span key={ci.indicatorId} className="inline-block px-4 py-2 bg-gray-50 text-gray-600 text-xs font-bold rounded-xl border border-gray-100 mr-2 last:mr-0">
                              #{ind.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {['achievement', 'job', 'competency'].map(category => {
                      const categoryIndicators = effectiveIndicators?.filter(ci => ci.category === category);
                      if (!categoryIndicators || categoryIndicators.length === 0) return null;

                      return (
                        <div key={category} className="space-y-4">
                          <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${
                            category === 'achievement' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                            category === 'job' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                            'bg-amber-50 border-amber-100 text-amber-700'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${
                              category === 'achievement' ? 'bg-blue-500' :
                              category === 'job' ? 'bg-emerald-500' :
                              'bg-amber-500'
                            }`} />
                            <h3 className="text-sm font-black uppercase tracking-wider">
                              {category === 'achievement' ? '업적' : category === 'job' ? '직무' : '역량'}
                            </h3>
                          </div>

                          <div className="space-y-3">
                            {categoryIndicators.map(ci => {
                              const ind = indicators.find(i => i.id === ci.indicatorId);
                              if (!ind) return null;

                              return (
                                <div key={ci.indicatorId} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-bold text-gray-900 mb-1 truncate">{ind.name}</h4>
                                      <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2">{ci.customDescription}</p>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter mb-0.5">비중</span>
                                      <span className="text-lg font-black text-gray-900 leading-none">{ci.weight}%</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="bg-white p-16 rounded-[2rem] border border-gray-100 shadow-sm text-center relative overflow-hidden">
                  <div className="absolute top-8 right-8 flex items-center gap-3">
                    <div className="relative">
                      <select 
                        value={selectedYear}
                        onChange={(e) => { setSelectedYear(parseInt(e.target.value)); setIsEditing(false); }}
                        className="appearance-none pl-4 pr-10 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer transition-all"
                      >
                        {[2024, 2025, 2026, 2027, 2028].map(year => (
                          <option key={year} value={year}>{year}년</option>
                        ))}
                      </select>
                      <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" />
                    </div>
                    {canEdit && (
                      <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all flex items-center gap-2 shadow-md">
                        <Plus size={14} />
                        등록
                      </button>
                    )}
                  </div>
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle size={40} className="text-gray-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedYear}년도 목표가 없습니다</h3>
                  <p className="text-gray-500">해당 부서의 {selectedYear}년도 목표가 아직 설정되지 않았습니다.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const GoalsView: React.FC<{ 
  profile: UserProfile; 
  myGoals: MemberGoal[]; 
  indicators: GoalIndicator[];
  teamGoals: TeamGoal[];
  departments: Department[];
  users: UserProfile[];
  events: PerformanceEvent[];
  isMockMode: boolean;
  setMyGoals: React.Dispatch<React.SetStateAction<MemberGoal[]>>;
}> = ({ profile, myGoals, indicators, teamGoals, departments, users, events, isMockMode, setMyGoals }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewingUserId, setViewingUserId] = useState(profile.uid);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [adminSelectedTeamId, setAdminSelectedTeamId] = useState<string>('');
  
  const viewingUser = useMemo(() => users.find(u => u.uid === viewingUserId) || profile, [users, viewingUserId, profile]);
  const isViewingSelf = viewingUserId === profile.uid;
  const isLeader = profile.role === 'leader' || profile.role === 'admin';

  const activeDeptId = useMemo(() => {
    if (profile.role === 'admin' && adminSelectedTeamId && isViewingSelf) {
      return adminSelectedTeamId;
    }
    return viewingUser.workGroupId || viewingUser.teamId;
  }, [profile.role, adminSelectedTeamId, isViewingSelf, viewingUser]);

  const currentGoal = myGoals.find(g => g.year === selectedYear && g.userId === viewingUserId);
  const myDept = departments.find(d => d.id === activeDeptId);
  const parentDept = myDept?.parentId ? departments.find(d => d.id === myDept.parentId) : null;
  const parentTeamGoal = parentDept ? teamGoals.find(g => 
    g.departmentId === parentDept.id && 
    g.year === selectedYear &&
    g.status === 'published'
  ) : null;

  const myTeamGoal = teamGoals.find(g => 
    g.departmentId === activeDeptId && 
    g.year === selectedYear &&
    g.status === 'published'
  );

  const effectiveTeamGoal = myTeamGoal || parentTeamGoal;

  const teamIndicators = useMemo(() => {
    if (!effectiveTeamGoal || !effectiveTeamGoal.customIndicators) return [];
    return effectiveTeamGoal.customIndicators;
  }, [effectiveTeamGoal]);

  const goalIndicators = useMemo(() => {
    if (!currentGoal) return [];
    if (currentGoal.customIndicators && currentGoal.customIndicators.length > 0) {
      return currentGoal.customIndicators;
    }
    if (currentGoal.indicatorIds && currentGoal.indicatorIds.length > 0) {
      return currentGoal.indicatorIds.map(id => {
        const ind = indicators.find(i => i.id === id);
        return {
          indicatorId: id,
          name: ind?.name,
          customDescription: ind?.description || '',
          category: (ind?.code.includes('ACH') ? 'achievement' : ind?.code.includes('JOB') ? 'job' : 'competency') as GoalCategory,
          weight: 100 / currentGoal.indicatorIds!.length
        };
      });
    }
    return [];
  }, [currentGoal, indicators]);

  const achievementData = useMemo(() => {
    if (!currentGoal) return null;
    
    const myEvents = events.filter(e => e.userId === viewingUserId && (viewingUser.role !== 'member' || e.status === 'reviewed'));

    const categoryStats = {
      achievement: { current: 0, total: 0 },
      job: { current: 0, total: 0 },
      competency: { current: 0, total: 0 }
    };

    goalIndicators.forEach(ci => {
      const indEvents = myEvents.filter(e => e.indicatorId === ci.indicatorId);
      const indAchievement = indEvents.reduce((sum, e) => sum + e.achievement, 0);
      
      const catWeight = effectiveTeamGoal?.categoryWeights[ci.category] || 33.3;
      const absoluteWeight = (catWeight * ci.weight) / 100;
      
      const contribution = (indAchievement * absoluteWeight) / 100;
      
      categoryStats[ci.category].current += contribution;
      categoryStats[ci.category].total += absoluteWeight;
    });

    const totalCurrent = categoryStats.achievement.current + categoryStats.job.current + categoryStats.competency.current;
    
    return {
      categories: categoryStats,
      total: totalCurrent
    };
  }, [currentGoal, events, viewingUserId, goalIndicators, effectiveTeamGoal]);

  useEffect(() => {
    if (currentGoal) {
      setNarrative(currentGoal.narrative || '');
    } else {
      setNarrative('');
    }
  }, [currentGoal, selectedYear]);

  const handleSaveGoal = async () => {
    const goalData: MemberGoal = {
      id: currentGoal?.id || `goal-${viewingUserId}-${selectedYear}`,
      userId: viewingUserId,
      year: selectedYear,
      status: 'pending',
      narrative,
      customIndicators: []
    };

    if (isMockMode) {
      const newGoals = [...myGoals.filter(g => g.id !== goalData.id), goalData];
      setMyGoals(newGoals);
      mockDb.setMemberGoals(newGoals);
      setIsEditing(false);
      alert("목표가 합의 요청되었습니다. (MOCK MODE)");
      return;
    }

    if (!db) return;
    try {
      await setDoc(doc(db, 'memberGoals', goalData.id), goalData);
      setIsEditing(false);
      alert("목표가 합의 요청되었습니다.");
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'memberGoals'); }
  };

  const handleApproveGoal = async (goalId: string) => {
    if (isMockMode) {
      const newGoals = myGoals.map(g => g.id === goalId ? { ...g, status: 'agreed' as const } : g);
      setMyGoals(newGoals);
      mockDb.setMemberGoals(newGoals);
      alert("목표가 승인(합의)되었습니다. (MOCK MODE)");
      return;
    }

    if (!db) return;
    try {
      await updateDoc(doc(db, 'memberGoals', goalId), { status: 'agreed' });
      alert("목표가 승인(합의)되었습니다.");
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'memberGoals'); }
  };

  const pendingGoals = useMemo(() => {
    if (profile.role === 'member') return [];
    if (!activeDeptId) return [];
    
    const targetDept = departments.find(d => d.id === activeDeptId);
    const isWorkGroup = targetDept?.type === 'WorkGroup';
    
    const teamMemberIds = users.filter(u => 
      (isWorkGroup ? u.workGroupId === activeDeptId : u.teamId === activeDeptId) && 
      u.uid !== profile.uid
    ).map(u => u.uid);
    
    return myGoals.filter(g => g.status === 'pending' && g.year === selectedYear && teamMemberIds.includes(g.userId));
  }, [profile, users, myGoals, activeDeptId, selectedYear, departments]);

  const searchableUsers = useMemo(() => {
    if (profile.role === 'admin') {
      let filtered = users.filter(u => u.uid !== profile.uid);
      if (adminSelectedTeamId) {
        filtered = filtered.filter(u => u.teamId === adminSelectedTeamId || u.workGroupId === adminSelectedTeamId);
      }
      return filtered;
    }
    const leaderDeptId = profile.workGroupId || profile.teamId;
    return users.filter(u => (profile.workGroupId ? u.workGroupId === leaderDeptId : u.teamId === leaderDeptId) && u.uid !== profile.uid);
  }, [users, profile, adminSelectedTeamId]);

  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim() && profile.role !== 'admin') return [];
    if (!searchTerm.trim() && profile.role === 'admin' && !adminSelectedTeamId) return [];
    
    let base = searchableUsers;
    if (searchTerm.trim()) {
      base = base.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return base;
  }, [searchableUsers, searchTerm, profile.role, adminSelectedTeamId]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            {[2024, 2025, 2026].map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`text-lg font-bold transition-all ${selectedYear === year ? 'text-gray-900 underline underline-offset-8' : 'text-gray-300 hover:text-gray-500'}`}
              >
                {year}
              </button>
            ))}
          </div>
          
          {!isViewingSelf && (
            <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
              <img src={viewingUser.photoURL || `https://ui-avatars.com/api/?name=${viewingUser.name}`} className="w-10 h-10 rounded-full border border-gray-100 shadow-sm" alt="" />
              <div>
                <p className="text-sm font-bold text-gray-900">{viewingUser.name}의 목표</p>
                <button onClick={() => setViewingUserId(profile.uid)} className="text-[10px] font-bold text-blue-600 hover:underline">나의 목표로 돌아가기</button>
              </div>
            </div>
          )}
        </div>

        {isLeader && (
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            {profile.role === 'admin' && (
              <select
                value={adminSelectedTeamId}
                onChange={(e) => setAdminSelectedTeamId(e.target.value)}
                className="px-4 py-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm outline-none"
              >
                <option value="">전체 팀</option>
                {departments.filter(d => d.type === 'Team').map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            )}
            <div className="relative w-full md:w-64">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder={profile.role === 'admin' ? "직원 검색..." : "팀원 목표 조회..."}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                />
              </div>

              <AnimatePresence>
                {isSearchOpen && (searchTerm.trim() || (profile.role === 'admin' && adminSelectedTeamId)) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto"
                  >
                    {filteredMembers.length > 0 ? (
                      <div className="divide-y divide-gray-50">
                        {filteredMembers.map(member => (
                          <button
                            key={member.uid}
                            onClick={() => {
                              setViewingUserId(member.uid);
                              setSearchTerm('');
                              setIsSearchOpen(false);
                              setIsEditing(false);
                            }}
                            className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                          >
                            <img src={member.photoURL || `https://ui-avatars.com/api/?name=${member.name}`} className="w-8 h-8 rounded-lg object-cover" alt="" />
                            <div>
                              <p className="font-bold text-gray-900 text-xs">{member.name}</p>
                              <p className="text-[10px] text-gray-400 font-medium">{member.position} · {departments.find(d => d.id === (member.workGroupId || member.teamId))?.name}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <p className="text-xs text-gray-400 font-medium">검색 결과가 없습니다.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </header>

      {profile.role !== 'member' && pendingGoals.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="text-amber-500" size={20} />
            <h3 className="text-xl font-bold text-gray-900">
              {profile.role === 'admin' && adminSelectedTeamId ? `${departments.find(d => d.id === adminSelectedTeamId)?.name} ` : ''}
              합의 요청 목록 <span className="text-amber-600 ml-1">({pendingGoals.length})</span>
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {pendingGoals.map(goal => {
              const user = users.find(u => u.uid === goal.userId);
              return (
                <div key={goal.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-gray-200 transition-all">
                  <div className="flex items-center gap-4">
                    <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.name || 'User'}`} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" alt="" />
                    <div>
                      <p className="font-bold text-gray-900">{user?.name} <span className="text-xs font-normal text-gray-400 ml-1">{user?.position}</span></p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1 max-w-md">{goal.narrative}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleApproveGoal(goal.id)}
                      className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all shadow-sm shadow-emerald-100"
                    >
                      승인(합의)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {isEditing ? (
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-8">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">서술형 목표 ({selectedYear}년)</label>
            <textarea value={narrative} onChange={(e) => setNarrative(e.target.value)} placeholder="올해의 목표를 상세히 기술해주세요..." className="w-full h-40 p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-gray-900" />
          </div>

          <div className="flex gap-4">
            <button onClick={handleSaveGoal} className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold">합의 요청</button>
            <button onClick={() => setIsEditing(false)} className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold">취소</button>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          {currentGoal ? (
            <>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase ${
                    currentGoal.status === 'agreed' ? 'bg-emerald-100 text-emerald-700' : 
                    currentGoal.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {currentGoal.status === 'pending' ? '합의 대기' : currentGoal.status === 'agreed' ? '합의 완료' : '초안'}
                  </span>
                  <span className="text-sm font-bold text-gray-400">{selectedYear}년도</span>
                </div>
              </div>

              {/* Achievement Dashboard */}
              {achievementData && (
                <div className="mb-12 grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-1 p-8 bg-gray-900 rounded-[2rem] text-white flex flex-col justify-center items-center text-center shadow-xl shadow-gray-200">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-2">전체 달성률</p>
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="58"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          className="text-white/10"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="58"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={364.4}
                          strokeDashoffset={364.4 - (364.4 * Math.min(100, achievementData.total)) / 100}
                          className="text-emerald-400 transition-all duration-1000 ease-out"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black">{achievementData.total.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(['achievement', 'job', 'competency'] as GoalCategory[]).map(cat => {
                      const stats = achievementData.categories[cat];
                      const progress = stats.total > 0 ? (stats.current / stats.total) * 100 : 0;
                      const label = cat === 'achievement' ? '업적' : cat === 'job' ? '직무' : '역량';
                      const colorClass = cat === 'achievement' ? 'bg-emerald-500' : cat === 'job' ? 'bg-blue-500' : 'bg-purple-500';
                      const textColorClass = cat === 'achievement' ? 'text-emerald-600' : cat === 'job' ? 'text-blue-600' : 'text-purple-600';
                      const bgColorClass = cat === 'achievement' ? 'bg-emerald-50' : cat === 'job' ? 'bg-blue-50' : 'bg-purple-50';

                      return (
                        <div key={cat} className={`p-6 rounded-3xl border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all`}>
                          <div className="flex justify-between items-start mb-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tight ${bgColorClass} ${textColorClass}`}>
                              {label}
                            </span>
                            <span className="text-xs font-bold text-gray-400">비중 {stats.total.toFixed(0)}%</span>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-end">
                              <p className="text-2xl font-black text-gray-900">{stats.current.toFixed(1)}%</p>
                              <p className="text-[10px] font-bold text-gray-400">달성률 {progress.toFixed(0)}%</p>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, progress)}%` }}
                                className={`h-full ${colorClass}`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-10">
                {/* Narrative Goal - Moved to Top */}
                <div>
                  <p className="text-xl text-gray-900 font-bold leading-tight whitespace-pre-wrap">{currentGoal.narrative}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">핵심 지표</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(() => {
                      const goalIndicators = (() => {
                        if (currentGoal.customIndicators && currentGoal.customIndicators.length > 0) {
                          return currentGoal.customIndicators;
                        }
                        if (currentGoal.indicatorIds && currentGoal.indicatorIds.length > 0) {
                          return currentGoal.indicatorIds.map(id => {
                            const ind = indicators.find(i => i.id === id);
                            return {
                              indicatorId: id,
                              name: ind?.name,
                              customDescription: ind?.description || '',
                              category: (ind?.code.includes('ACH') ? 'achievement' : ind?.code.includes('JOB') ? 'job' : 'competency') as GoalCategory,
                              weight: 100 / currentGoal.indicatorIds!.length
                            };
                          });
                        }
                        return [];
                      })();
                      
                      return goalIndicators.map(ci => {
                        const ind = indicators.find(i => i.id === ci.indicatorId);
                        const indName = ci.name || ind?.name || '커스텀 지표';

                        const weight = ci.weight || 0;
                        const category = ci.category || 'achievement';
                        const indEvents = events.filter(e => e.userId === viewingUserId && e.indicatorId === ci.indicatorId && (viewingUser.role !== 'member' || e.status === 'reviewed'));
                        const indAchievement = Math.min(100, indEvents.reduce((sum, e) => sum + e.achievement, 0));
                        
                        return (
                          <div key={ci.indicatorId} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                              <div className="space-y-1">
                                <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md ${
                                  category === 'achievement' ? 'text-emerald-500 bg-emerald-50' : 
                                  category === 'job' ? 'text-blue-500 bg-blue-50' : 
                                  'text-purple-500 bg-purple-50'
                                }`}>
                                  {category === 'achievement' ? '업적' : category === 'job' ? '직무' : '역량'}
                                </span>
                                <p className="font-bold text-gray-900 text-base leading-tight">{indName}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-black text-gray-900 leading-none">{Math.round(weight)}%</p>
                                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">비중</p>
                              </div>
                            </div>
                            
                            <div className="mb-4">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">달성도</span>
                                <span className="text-xs font-black text-gray-900">{indAchievement}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${indAchievement}%` }}
                                  className={`h-full ${
                                    category === 'achievement' ? 'bg-emerald-500' : 
                                    category === 'job' ? 'bg-blue-500' : 
                                    'bg-purple-500'
                                  }`}
                                />
                              </div>
                            </div>

                            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                              {ci.customDescription || ind?.description}
                            </p>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                <Target size={32} className="text-gray-300" />
              </div>
              <div className="space-y-1">
                <p className="text-gray-900 font-bold text-lg">{selectedYear}년도 설정된 목표가 없습니다</p>
                {effectiveTeamGoal ? (
                  <>
                    <p className="text-gray-400 text-sm">{isViewingSelf ? '새로운 목표를 등록하여 합의를 요청하세요.' : viewingUser.name + ' 팀원이 아직 목표를 등록하지 않았습니다.'}</p>
                    {isViewingSelf && (
                      <button 
                        onClick={() => setIsEditing(true)} 
                        className="mt-6 px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                      >
                        목표 신규 등록
                      </button>
                    )}
                  </>
                ) : (
                  <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 inline-block">
                    <p className="text-amber-700 text-sm font-bold flex items-center gap-2">
                      <AlertCircle size={16} />
                      {selectedYear}년도 팀 목표가 아직 등록되지 않았습니다.
                    </p>
                    <p className="text-amber-600 text-xs mt-1">팀 목표가 등록된 이후에 개인 목표를 설정할 수 있습니다.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

const TeamRecordsView: React.FC<{
  profile: UserProfile;
  events: PerformanceEvent[];
  indicators: GoalIndicator[];
  users: UserProfile[];
  departments: Department[];
  teamGoals: TeamGoal[];
  isMockMode: boolean;
  setEvents: React.Dispatch<React.SetStateAction<PerformanceEvent[]>>;
}> = ({ profile, events, indicators, users, departments, teamGoals, isMockMode, setEvents }) => {
  const [viewMode, setViewMode] = useState<'indicator' | 'member'>('indicator');
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [viewingEventId, setViewingEventId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const userDeptId = profile.workGroupId || profile.teamId;

  const teamIndicators = useMemo(() => {
    if (!userDeptId) return [];
    const currentYear = new Date().getFullYear();
    const teamGoal = teamGoals.find(g => g.departmentId === userDeptId && g.year === currentYear);
    return teamGoal?.customIndicators || [];
  }, [userDeptId, teamGoals]);

  const teamMembers = useMemo(() => {
    if (!userDeptId) return [];
    return users.filter(u => (profile.workGroupId ? u.workGroupId === userDeptId : u.teamId === userDeptId));
  }, [userDeptId, users, profile.workGroupId]);

  const teamMemberIds = useMemo(() => teamMembers.map(u => u.uid), [teamMembers]);

  const filteredEvents = useMemo(() => {
    if (viewMode === 'indicator') {
      if (!selectedIndicatorId) return [];
      return events.filter(e => e.indicatorId === selectedIndicatorId && teamMemberIds.includes(e.userId))
        .sort((a, b) => b.date.localeCompare(a.date));
    } else {
      if (!selectedMemberId) return [];
      return events.filter(e => e.userId === selectedMemberId)
        .sort((a, b) => b.date.localeCompare(a.date));
    }
  }, [viewMode, selectedIndicatorId, selectedMemberId, events, teamMemberIds]);

  const stats = useMemo(() => {
    if (filteredEvents.length === 0) return { avg: 0, count: 0, reviewed: 0 };
    const reviewedEvents = filteredEvents.filter(e => e.status === 'reviewed');
    const sum = reviewedEvents.reduce((acc, curr) => acc + curr.achievement, 0);
    const reviewed = reviewedEvents.length;
    return {
      avg: reviewed > 0 ? Math.round(sum / reviewed) : 0,
      count: filteredEvents.length,
      reviewed
    };
  }, [filteredEvents]);

  const handleApprove = async (eventId: string) => {
    if (isMockMode) {
      const newEvents = events.map(e => e.id === eventId ? { ...e, status: 'reviewed' as EventStatus } : e);
      setEvents(newEvents);
      mockDb.setEvents(newEvents);
      return;
    }

    if (!db) return;
    try {
      await updateDoc(doc(db, 'performanceEvents', eventId), { status: 'reviewed' });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'performanceEvents'); }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !viewingEventId) return;
    
    const event = events.find(e => e.id === viewingEventId);
    if (!event) return;

    const newComment: EventComment = {
      id: `comment-${Date.now()}`,
      userId: profile.uid,
      userName: profile.name,
      userRole: profile.role,
      content: commentText,
      createdAt: new Date().toISOString()
    };

    const updatedEvent: PerformanceEvent = {
      ...event,
      comments: [...(event.comments || []), newComment]
    };

    if (isMockMode) {
      const newEvents = events.map(e => e.id === viewingEventId ? updatedEvent : e);
      setEvents(newEvents);
      mockDb.setEvents(newEvents);
      setCommentText('');
      return;
    }

    if (!db) return;
    try {
      await setDoc(doc(db, 'performanceEvents', updatedEvent.id), updatedEvent);
      setCommentText('');
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'performanceEvents'); }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">팀 기록실</h2>
          <p className="text-gray-500 mt-1 font-medium">팀원들의 성과 기록을 지표별 또는 팀원별로 조회합니다.</p>
        </div>
        <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
          <button
            onClick={() => {
              setViewMode('indicator');
              setSelectedMemberId('');
            }}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              viewMode === 'indicator' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            지표별 조회
          </button>
          <button
            onClick={() => {
              setViewMode('member');
              setSelectedIndicatorId('');
            }}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              viewMode === 'member' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            팀원별 조회
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              {viewMode === 'indicator' ? <Target size={18} className="text-blue-500" /> : <Users size={18} className="text-blue-500" />}
              {viewMode === 'indicator' ? '핵심지표 선택' : '팀원 선택'}
            </h3>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {viewMode === 'indicator' ? (
                teamIndicators.map(ti => {
                  const ind = indicators.find(i => i.id === ti.indicatorId);
                  return (
                    <button
                      key={ti.indicatorId}
                      onClick={() => setSelectedIndicatorId(ti.indicatorId)}
                      className={`w-full text-left p-4 rounded-2xl transition-all border ${
                        selectedIndicatorId === ti.indicatorId
                          ? 'bg-blue-50 border-blue-100 text-blue-700'
                          : 'bg-white border-transparent text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <p className="text-sm font-bold truncate">{ti.name || ind?.name}</p>
                      <p className="text-[10px] font-medium opacity-60 mt-1">{ti.category === 'achievement' ? '업적' : ti.category === 'job' ? '직무' : '역량'} • {ti.weight}%</p>
                    </button>
                  );
                })
              ) : (
                teamMembers.map(member => (
                  <button
                    key={member.uid}
                    onClick={() => setSelectedMemberId(member.uid)}
                    className={`w-full text-left p-3 rounded-2xl transition-all border flex items-center gap-3 ${
                      selectedMemberId === member.uid
                        ? 'bg-blue-50 border-blue-100 text-blue-700'
                        : 'bg-white border-transparent text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <img src={member.photoURL || `https://ui-avatars.com/api/?name=${member.name}`} className="w-10 h-10 rounded-xl object-cover" alt="" />
                    <div>
                      <p className="text-sm font-bold">{member.name}</p>
                      <p className="text-[10px] font-medium opacity-60">{member.position}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {(selectedIndicatorId || selectedMemberId) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">평균 달성률</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-gray-900">{stats.avg}%</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full mb-2 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.avg}%` }}
                      className="h-full bg-blue-600"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">총 기록 건수</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-gray-900">{stats.count}</span>
                  <span className="text-xs font-bold text-gray-400">건의 활동</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">검토 완료</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-emerald-600">{stats.reviewed}</span>
                  <span className="text-xs font-bold text-gray-400">/ {stats.count} 건 완료</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm min-h-[60vh]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-gray-900">
                {viewMode === 'indicator' 
                  ? (teamIndicators.find(ti => ti.indicatorId === selectedIndicatorId)?.name || '지표를 선택해주세요')
                  : (teamMembers.find(m => m.uid === selectedMemberId)?.name || '팀원을 선택해주세요')
                }
                <span className="ml-2 text-sm font-medium text-gray-400">기록 ({filteredEvents.length})</span>
              </h3>
            </div>

            {filteredEvents.length > 0 ? (
              <div className="space-y-4">
                {filteredEvents.map(event => {
                  const member = users.find(u => u.uid === event.userId);
                  const ind = indicators.find(i => i.id === event.indicatorId);
                  return (
                    <div key={event.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 group hover:bg-white hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4">
                          {viewMode === 'indicator' && (
                            <img src={member?.photoURL || `https://ui-avatars.com/api/?name=${member?.name}`} className="w-12 h-12 rounded-2xl object-cover shadow-md" alt="" />
                          )}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(event.date).toLocaleDateString()}</span>
                              {viewMode === 'indicator' && <span className="text-xs font-bold text-gray-900">{member?.name}</span>}
                              {viewMode === 'member' && <span className="text-xs font-bold text-blue-600">{ind?.name}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                event.progressStatus === 'plan' ? 'bg-gray-100 text-gray-600' :
                                event.progressStatus === 'in-progress' ? 'bg-blue-50 text-blue-600' :
                                'bg-emerald-50 text-emerald-600'
                              }`}>
                                {event.progressStatus === 'plan' ? '계획' : event.progressStatus === 'in-progress' ? '진행' : '완료'}
                              </span>
                              <h4 className="text-lg font-bold text-gray-900 leading-tight">{event.title}</h4>
                            </div>
                            {event.description && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-3">{event.description}</p>
                            )}
                            <button 
                              onClick={() => setViewingEventId(event.id)}
                              className="text-[10px] font-bold text-blue-600 hover:underline mt-2 flex items-center gap-1"
                            >
                              <MessageSquare size={12} />
                              상세보기 및 의견 작성
                            </button>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div className="text-2xl font-black text-gray-900">{event.achievement}%</div>
                          <div className="flex items-center gap-2">
                            <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md inline-block ${
                              event.status === 'reviewed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {event.status === 'reviewed' ? '승인됨' : '등록됨'}
                            </div>
                            {event.status === 'registered' && (profile.role === 'leader' || profile.role === 'admin') && (
                              <button 
                                onClick={() => handleApprove(event.id)}
                                className="text-[10px] font-bold text-white bg-gray-900 px-2 py-0.5 rounded-md hover:bg-gray-800 transition-colors"
                              >
                                승인하기
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                <FileText size={64} strokeWidth={1} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">조회된 기록이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {viewingEventId && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full p-8 space-y-8 max-h-[90vh] overflow-y-auto"
            >
              {(() => {
                const event = events.find(e => e.id === viewingEventId);
                if (!event) return null;
                const indicator = indicators.find(i => i.id === event.indicatorId);
                const member = users.find(u => u.uid === event.userId);
                
                return (
                  <>
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            event.progressStatus === 'plan' ? 'bg-gray-100 text-gray-600' :
                            event.progressStatus === 'in-progress' ? 'bg-blue-50 text-blue-600' :
                            'bg-emerald-50 text-emerald-600'
                          }`}>
                            {event.progressStatus === 'plan' ? '계획' : event.progressStatus === 'in-progress' ? '진행' : '완료'}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{format(parseISO(event.date), 'yyyy.MM.dd')}</span>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900">{event.title}</h3>
                        <div className="flex items-center gap-2">
                          <img src={member?.photoURL || `https://ui-avatars.com/api/?name=${member?.name}`} className="w-5 h-5 rounded-full" alt="" />
                          <p className="text-sm text-gray-500 font-medium">{member?.name} • {indicator?.name || '일반 활동'}</p>
                        </div>
                      </div>
                      <button onClick={() => setViewingEventId(null)} className="p-2 text-gray-300 hover:text-gray-500 transition-colors">
                        <X size={24} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 space-y-8">
                        {/* Description */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">상세 내용</h4>
                          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {event.description || '내용이 없습니다.'}
                          </div>
                        </div>

                        {/* Comments Section */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare size={14} />
                            의견 및 피드백
                          </h4>
                          <div className="space-y-4">
                            {event.comments?.map(comment => (
                              <div key={comment.id} className="flex gap-3">
                                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold ${
                                  comment.userRole === 'leader' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-white'
                                }`}>
                                  {comment.userName.charAt(0)}
                                </div>
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-900">{comment.userName}</span>
                                    <span className="text-[9px] font-bold text-gray-400">{format(parseISO(comment.createdAt), 'MM.dd HH:mm')}</span>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded-2xl rounded-tl-none text-xs text-gray-700">
                                    {comment.content}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {(!event.comments || event.comments.length === 0) && (
                              <p className="text-xs text-gray-400 text-center py-4">등록된 의견이 없습니다.</p>
                            )}
                          </div>
                          
                          <div className="flex gap-2 pt-2">
                            <input 
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder="의견을 입력하세요..."
                              className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-gray-900"
                              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                            />
                            <button 
                              onClick={handleAddComment}
                              disabled={!commentText.trim()}
                              className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                            >
                              등록
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-8">
                        {/* Achievement */}
                        <div className="bg-gray-900 p-6 rounded-2xl text-white">
                          <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1">달성률</p>
                          <p className="text-3xl font-black">{event.achievement}%</p>
                          <div className="w-full h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
                            <div className="h-full bg-blue-400" style={{ width: `${event.achievement}%` }} />
                          </div>
                        </div>

                        {/* History Section */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={14} />
                            변경 이력
                          </h4>
                          <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-gray-100">
                            {event.history?.slice().reverse().map(hist => (
                              <div key={hist.id} className="relative pl-7">
                                <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center z-10">
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-900">{hist.action}</span>
                                    <span className="text-[9px] font-bold text-gray-400">{format(parseISO(hist.date), 'MM.dd HH:mm')}</span>
                                  </div>
                                  {hist.changes && hist.changes.map((change, idx) => (
                                    <div key={idx} className="text-[9px] text-gray-500 leading-tight">
                                      <span className="font-bold">{change.field}</span>: {String(change.oldValue)} → {String(change.newValue)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const EventsView: React.FC<{ 
  profile: UserProfile; 
  events: PerformanceEvent[]; 
  indicators: GoalIndicator[]; 
  users: UserProfile[];
  departments: Department[];
  teamGoals: TeamGoal[];
  myGoals: MemberGoal[];
  isMockMode: boolean;
  setEvents: React.Dispatch<React.SetStateAction<PerformanceEvent[]>>;
}> = ({ profile, events, indicators, users, departments, teamGoals, myGoals, isMockMode, setEvents }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState(profile.teamId || '');
  const [selectedWorkGroupId, setSelectedWorkGroupId] = useState(profile.workGroupId || '');
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory | ''>('');
  const [indicatorId, setIndicatorId] = useState('');
  const [achievement, setAchievement] = useState(100);
  const [description, setDescription] = useState('');
  const [progressStatus, setProgressStatus] = useState<ProgressStatus>('completed');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [viewingEventId, setViewingEventId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  
  const myEvents = events.filter(e => e.userId === profile.uid).sort((a, b) => b.date.localeCompare(a.date));

  const userDeptId = profile.workGroupId || profile.teamId;

  const teams = useMemo(() => departments.filter(d => d.type === 'Team'), [departments]);
  const workGroups = useMemo(() => 
    departments.filter(d => d.type === 'WorkGroup' && d.parentId === selectedTeamId),
    [departments, selectedTeamId]
  );

  const availableIndicators = useMemo(() => {
    if (!selectedCategory) return [];
    
    // 1. Get indicators from user's own goal (including custom ones)
    const myGoal = myGoals.find(g => g.userId === profile.uid && g.year === new Date().getFullYear());
    const myInds = myGoal?.customIndicators?.filter(ci => ci.category === selectedCategory).map(ci => {
      const globalInd = indicators.find(i => i.id === ci.indicatorId);
      return {
        id: ci.indicatorId,
        name: ci.name || globalInd?.name || '커스텀 지표',
        weight: ci.weight,
        description: ci.customDescription
      };
    }) || [];

    // 2. Get indicators from team goal
    const targetDeptId = selectedTeamId || profile.workGroupId || profile.teamId;
    if (!targetDeptId) return myInds;

    const teamGoal = teamGoals.find(g => g.departmentId === targetDeptId && g.year === new Date().getFullYear());
    const teamInds = teamGoal?.customIndicators
      ?.filter(ci => ci.category === selectedCategory)
      .map(ci => {
        const ind = indicators.find(i => i.id === ci.indicatorId);
        return ind ? { ...ind, weight: ci.weight } : null;
      })
      .filter((i): i is (GoalIndicator & { weight: number }) => i !== null) || [];

    // Merge and remove duplicates by ID
    const merged = [...myInds];
    teamInds.forEach(ti => {
      if (!merged.some(mi => mi.id === ti.id)) {
        merged.push(ti);
      }
    });

    return merged;
  }, [selectedTeamId, selectedCategory, teamGoals, indicators, myGoals, profile]);

  const handleAddEvent = async () => {
    if (!title) return;
    
    const now = new Date().toISOString();
    
    if (editingEventId) {
      const existingEvent = events.find(e => e.id === editingEventId);
      if (!existingEvent) return;

      const changes: any[] = [];
      if (existingEvent.title !== title) changes.push({ field: '제목', oldValue: existingEvent.title, newValue: title });
      if (existingEvent.description !== description) changes.push({ field: '상세 내용', oldValue: existingEvent.description, newValue: description });
      if (existingEvent.progressStatus !== progressStatus) changes.push({ field: '진행 상태', oldValue: existingEvent.progressStatus, newValue: progressStatus });
      if (existingEvent.achievement !== achievement) changes.push({ field: '달성률', oldValue: existingEvent.achievement, newValue: achievement });
      if (existingEvent.indicatorId !== indicatorId) changes.push({ field: '지표', oldValue: existingEvent.indicatorId, newValue: indicatorId });
      if (existingEvent.category !== selectedCategory) changes.push({ field: '영역', oldValue: existingEvent.category, newValue: selectedCategory });

      const historyEntry: EventHistory = {
        id: `hist-${Date.now()}`,
        date: now,
        userId: profile.uid,
        action: '수정됨',
        changes: changes.length > 0 ? changes : undefined
      };

      const updatedEvent: PerformanceEvent = {
        ...existingEvent,
        title,
        description,
        progressStatus,
        achievement: selectedCategory ? achievement : 100,
        indicatorId: indicatorId || undefined,
        category: selectedCategory || undefined,
        teamId: selectedTeamId || profile.teamId,
        workGroupId: selectedWorkGroupId || profile.workGroupId,
        history: [...(existingEvent.history || []), historyEntry]
      };

      if (isMockMode) {
        const newEvents = events.map(e => e.id === editingEventId ? updatedEvent : e);
        setEvents(newEvents);
        mockDb.setEvents(newEvents);
        resetForm();
        return;
      }

      if (!db) return;
      try {
        await setDoc(doc(db, 'performanceEvents', updatedEvent.id), updatedEvent);
        resetForm();
      } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'performanceEvents'); }
      return;
    }

    const eventData: PerformanceEvent = {
      id: `event-${Date.now()}`,
      userId: profile.uid,
      date: now,
      title,
      description,
      teamId: selectedTeamId || profile.teamId,
      workGroupId: selectedWorkGroupId || profile.workGroupId,
      indicatorId: indicatorId || undefined,
      category: selectedCategory || undefined,
      achievement: selectedCategory ? achievement : 100,
      status: profile.role === 'member' ? 'registered' : 'reviewed',
      progressStatus,
      history: [{
        id: `hist-${Date.now()}`,
        date: now,
        userId: profile.uid,
        action: '생성됨'
      }]
    };

    if (isMockMode) {
      const newEvents = [...events, eventData];
      setEvents(newEvents);
      mockDb.setEvents(newEvents);
      resetForm();
      return;
    }

    if (!db) return;
    try {
      await setDoc(doc(db, 'performanceEvents', eventData.id), eventData);
      resetForm();
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'performanceEvents'); }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingEventId(null);
    setTitle('');
    setDescription('');
    setSelectedTeamId(profile.teamId || '');
    setSelectedWorkGroupId(profile.workGroupId || '');
    setSelectedCategory('');
    setIndicatorId('');
    setAchievement(100);
    setProgressStatus('completed');
  };

  const handleEditClick = (event: PerformanceEvent) => {
    setEditingEventId(event.id);
    setTitle(event.title);
    setDescription(event.description || '');
    setSelectedTeamId(event.teamId || '');
    setSelectedWorkGroupId(event.workGroupId || '');
    
    if (event.category) {
      setSelectedCategory(event.category);
    } else if (event.indicatorId) {
      const ind = indicators.find(i => i.id === event.indicatorId);
      if (ind) setSelectedCategory(ind.category);
    } else {
      setSelectedCategory('');
    }

    setIndicatorId(event.indicatorId || '');
    setAchievement(event.achievement);
    setProgressStatus(event.progressStatus || 'completed');
    setIsAdding(true);
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !viewingEventId) return;
    
    const event = events.find(e => e.id === viewingEventId);
    if (!event) return;

    const newComment: EventComment = {
      id: `comment-${Date.now()}`,
      userId: profile.uid,
      userName: profile.name,
      userRole: profile.role,
      content: commentText,
      createdAt: new Date().toISOString()
    };

    const updatedEvent: PerformanceEvent = {
      ...event,
      comments: [...(event.comments || []), newComment]
    };

    if (isMockMode) {
      const newEvents = events.map(e => e.id === viewingEventId ? updatedEvent : e);
      setEvents(newEvents);
      mockDb.setEvents(newEvents);
      setCommentText('');
      return;
    }

    if (!db) return;
    try {
      await setDoc(doc(db, 'performanceEvents', updatedEvent.id), updatedEvent);
      setCommentText('');
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'performanceEvents'); }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (isMockMode) {
      const newEvents = events.filter(e => e.id !== eventId);
      setEvents(newEvents);
      mockDb.setEvents(newEvents);
      return;
    }

    if (!db) return;
    try {
      await deleteDoc(doc(db, 'performanceEvents', eventId));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'performanceEvents'); }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 relative pb-20">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">나의 기록실</h2>
        </div>
      </header>

      {isAdding && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900">{editingEventId ? '기록 수정' : '나의 기록실'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">이벤트 제목</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="이벤트 제목 (예: 상반기 트레이딩 모듈 출시)" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-gray-900" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">상세 내용 (서술형)</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="활동에 대한 상세 내용을 입력하세요." 
                  rows={3}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-gray-900 resize-none" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">진행 상태</label>
                <div className="flex gap-2">
                  {(['plan', 'in-progress', 'completed'] as ProgressStatus[]).map(status => (
                    <button
                      key={status}
                      onClick={() => setProgressStatus(status)}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all ${
                        progressStatus === status 
                          ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                          : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      {status === 'plan' ? '계획' : status === 'in-progress' ? '진행' : '완료'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">팀 선택</label>
                  <select 
                    value={selectedTeamId} 
                    onChange={(e) => {
                      setSelectedTeamId(e.target.value);
                      setSelectedWorkGroupId('');
                      setSelectedCategory('');
                      setIndicatorId('');
                    }} 
                    disabled={profile.role === 'member'}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none disabled:opacity-50"
                  >
                    <option value="">팀 선택</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">업무그룹 선택 (선택사항)</label>
                  <select 
                    value={selectedWorkGroupId} 
                    onChange={(e) => {
                      setSelectedWorkGroupId(e.target.value);
                      setSelectedCategory('');
                      setIndicatorId('');
                    }} 
                    disabled={!selectedTeamId || profile.role === 'member'}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none disabled:opacity-50"
                  >
                    <option value="">업무그룹 선택</option>
                    {workGroups.map(wg => <option key={wg.id} value={wg.id}>{wg.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">영역 선택</label>
                <div className="flex gap-2">
                  {(['achievement', 'job', 'competency'] as GoalCategory[]).map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setIndicatorId('');
                      }}
                      disabled={!selectedTeamId}
                      className={`flex-1 py-4 rounded-xl text-sm font-bold border-2 transition-all ${
                        selectedCategory === cat 
                          ? cat === 'achievement' ? 'bg-blue-600 text-white border-blue-600 shadow-md' :
                            cat === 'job' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' :
                            'bg-amber-600 text-white border-amber-600 shadow-md'
                          : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                      } disabled:opacity-50`}
                    >
                      {cat === 'achievement' ? '업적' : cat === 'job' ? '직무' : '역량'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">핵심 지표 선택 (선택사항)</label>
                <select 
                  value={indicatorId} 
                  onChange={(e) => setIndicatorId(e.target.value)} 
                  disabled={!selectedCategory}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none disabled:opacity-50"
                >
                  <option value="">지표 선택</option>
                  {availableIndicators.map(ind => (
                    <option key={ind.id} value={ind.id}>{ind.name} ({ind.weight}%)</option>
                  ))}
                </select>
                {!selectedCategory && selectedTeamId && (
                  <p className="text-[10px] text-gray-400 mt-1 ml-1">영역을 먼저 선택해주세요.</p>
                )}
                {selectedCategory && availableIndicators.length === 0 && (
                  <p className="text-[10px] text-amber-500 mt-1 ml-1">해당 영역에 등록된 팀 지표가 없습니다.</p>
                )}
              </div>

              {selectedCategory && (
                <div>
                  <div className="flex justify-between items-center mb-2 ml-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">달성률</label>
                    <span className="text-sm font-black text-gray-900">{achievement}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="5"
                    value={achievement}
                    onChange={(e) => setAchievement(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-gray-900"
                  />
                  <div className="flex justify-between mt-2 px-1">
                    <span className="text-[8px] font-bold text-gray-300">0%</span>
                    <span className="text-[8px] font-bold text-gray-300">50%</span>
                    <span className="text-[8px] font-bold text-gray-300">100%</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-4 pt-4">
              <button 
                onClick={handleAddEvent} 
                disabled={!title}
                className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
              >
                {editingEventId ? '수정하기' : '등록하기'}
              </button>
              <button onClick={resetForm} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold">취소</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">날짜</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">기록 제목</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">관련 지표</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">달성도</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {myEvents.map(event => (
              <tr key={event.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4 text-xs font-medium text-gray-500">{format(parseISO(event.date), 'yyyy.MM.dd')}</td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        event.progressStatus === 'plan' ? 'bg-gray-100 text-gray-600' :
                        event.progressStatus === 'in-progress' ? 'bg-blue-50 text-blue-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {event.progressStatus === 'plan' ? '계획' : event.progressStatus === 'in-progress' ? '진행' : '완료'}
                      </span>
                      <p className="text-sm font-bold text-gray-900">{event.title}</p>
                    </div>
                    {event.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">{event.description}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">
                  {(() => {
                    if (!event.indicatorId) return '미지정';
                    const globalInd = indicators.find(i => i.id === event.indicatorId);
                    if (globalInd) return globalInd.name;
                    
                    // Check user's custom indicators
                    const myGoal = myGoals.find(g => g.userId === profile.uid && g.year === new Date().getFullYear());
                    const customInd = myGoal?.customIndicators?.find(ci => ci.indicatorId === event.indicatorId);
                    return customInd?.name || '삭제된 지표';
                  })()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-sm font-bold text-gray-900">{event.achievement}%</span>
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-900" style={{ width: `${event.achievement}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setViewingEventId(event.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="상세보기 및 의견"
                    >
                      <MessageSquare size={16} />
                    </button>
                    <button 
                      onClick={() => handleEditClick(event)}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      title="수정하기"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="삭제하기"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {myEvents.length === 0 && (
          <div className="py-20 text-center text-gray-400">등록된 기록이 없습니다.</div>
        )}
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {viewingEventId && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full p-8 space-y-8 max-h-[90vh] overflow-y-auto"
            >
              {(() => {
                const event = events.find(e => e.id === viewingEventId);
                if (!event) return null;
                const indicator = indicators.find(i => i.id === event.indicatorId);
                
                return (
                  <>
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            event.progressStatus === 'plan' ? 'bg-gray-100 text-gray-600' :
                            event.progressStatus === 'in-progress' ? 'bg-blue-50 text-blue-600' :
                            'bg-emerald-50 text-emerald-600'
                          }`}>
                            {event.progressStatus === 'plan' ? '계획' : event.progressStatus === 'in-progress' ? '진행' : '완료'}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{format(parseISO(event.date), 'yyyy.MM.dd')}</span>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900">{event.title}</h3>
                        <p className="text-sm text-gray-500 font-medium">{indicator?.name || '일반 활동'}</p>
                      </div>
                      <button onClick={() => setViewingEventId(null)} className="p-2 text-gray-300 hover:text-gray-500 transition-colors">
                        <X size={24} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 space-y-8">
                        {/* Description */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">상세 내용</h4>
                          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {event.description || '내용이 없습니다.'}
                          </div>
                        </div>

                        {/* Comments Section */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare size={14} />
                            의견 및 피드백
                          </h4>
                          <div className="space-y-4">
                            {event.comments?.map(comment => (
                              <div key={comment.id} className="flex gap-3">
                                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold ${
                                  comment.userRole === 'leader' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-white'
                                }`}>
                                  {comment.userName.charAt(0)}
                                </div>
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-900">{comment.userName}</span>
                                    <span className="text-[9px] font-bold text-gray-400">{format(parseISO(comment.createdAt), 'MM.dd HH:mm')}</span>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded-2xl rounded-tl-none text-xs text-gray-700">
                                    {comment.content}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {(!event.comments || event.comments.length === 0) && (
                              <p className="text-xs text-gray-400 text-center py-4">등록된 의견이 없습니다.</p>
                            )}
                          </div>
                          
                          <div className="flex gap-2 pt-2">
                            <input 
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder="의견을 입력하세요..."
                              className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-gray-900"
                              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                            />
                            <button 
                              onClick={handleAddComment}
                              disabled={!commentText.trim()}
                              className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                            >
                              등록
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-8">
                        {/* Achievement */}
                        <div className="bg-gray-900 p-6 rounded-2xl text-white">
                          <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1">달성률</p>
                          <p className="text-3xl font-black">{event.achievement}%</p>
                          <div className="w-full h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
                            <div className="h-full bg-blue-400" style={{ width: `${event.achievement}%` }} />
                          </div>
                        </div>

                        {/* History Section */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={14} />
                            변경 이력
                          </h4>
                          <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-gray-100">
                            {event.history?.slice().reverse().map(hist => (
                              <div key={hist.id} className="relative pl-7">
                                <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center z-10">
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-900">{hist.action}</span>
                                    <span className="text-[9px] font-bold text-gray-400">{format(parseISO(hist.date), 'MM.dd HH:mm')}</span>
                                  </div>
                                  {hist.changes && hist.changes.map((change, idx) => (
                                    <div key={idx} className="text-[9px] text-gray-500 leading-tight">
                                      <span className="font-bold">{change.field}</span>: {String(change.oldValue)} → {String(change.newValue)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <button 
        onClick={() => setIsAdding(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gray-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
        title="기록하기"
      >
        <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>
    </motion.div>
  );
};

const AdminView: React.FC<{ 
  seedData: () => void; 
  isSeeding: boolean;
  users: UserProfile[]; 
  departments: Department[]; 
  indicators: GoalIndicator[];
  teamGoals: TeamGoal[];
  myGoals: MemberGoal[];
  isMockMode: boolean;
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  setIndicators: React.Dispatch<React.SetStateAction<GoalIndicator[]>>;
}> = ({ seedData, isSeeding, users, departments, indicators, teamGoals, myGoals, isMockMode, setUsers, setDepartments, setIndicators }) => {
  const [activeSubTab, setActiveSubTab] = useState<'kpi' | 'org' | 'users' | 'system'>('kpi');
  
  // KPI State
  const [kpiName, setKpiName] = useState('');
  const [kpiCode, setKpiCode] = useState('');
  const [kpiDesc, setKpiDesc] = useState('');
  const [kpiCriteria, setKpiCriteria] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [editingIndicator, setEditingIndicator] = useState<GoalIndicator | null>(null);

  // Org State
  const [deptName, setDeptName] = useState('');
  const [deptType, setDeptType] = useState<DeptType>('Team');
  const [parentId, setParentId] = useState('');
  const [weights, setWeights] = useState({ achievement: 50, job: 30, competency: 20 });

  // User State
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('member');
  const [userDeptId, setUserDeptId] = useState('');
  const [userPosition, setUserPosition] = useState('');

  const handleAddIndicator = async () => {
    if (!kpiName || !kpiCode) return;
    const newInd: GoalIndicator = {
      id: editingIndicator ? editingIndicator.id : `kpi-${Date.now()}`,
      code: kpiCode,
      name: kpiName,
      description: kpiDesc,
      criteria: kpiCriteria
    };

    if (isMockMode) {
      let newInds;
      if (editingIndicator) {
        newInds = indicators.map(i => i.id === editingIndicator.id ? newInd : i);
      } else {
        newInds = [...indicators, newInd];
      }
      setIndicators(newInds);
      mockDb.setIndicators(newInds);
      setKpiName('');
      setKpiCode('');
      setKpiDesc('');
      setKpiCriteria('');
      setEditingIndicator(null);
      alert(editingIndicator ? "지표가 수정되었습니다. (MOCK MODE)" : "새로운 지표가 등록되었습니다. (MOCK MODE)");
      return;
    }

    if (!db) return;
    try {
      await setDoc(doc(db, 'goalIndicators', newInd.id), newInd);
      setKpiName('');
      setKpiCode('');
      setKpiDesc('');
      setKpiCriteria('');
      setEditingIndicator(null);
      alert(editingIndicator ? "지표가 수정되었습니다." : "새로운 지표가 등록되었습니다.");
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'goalIndicators'); }
  };

  const startEditingIndicator = (ind: GoalIndicator) => {
    setEditingIndicator(ind);
    setKpiName(ind.name);
    setKpiCode(ind.code);
    setKpiDesc(ind.description);
    setKpiCriteria(ind.criteria || '');
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditingIndicator = () => {
    setEditingIndicator(null);
    setKpiName('');
    setKpiCode('');
    setKpiDesc('');
    setKpiCriteria('');
  };

  const handleAddDept = async () => {
    if (!deptName) return;
    const newDept: Department = {
      id: `dept-${Date.now()}`,
      name: deptName,
      type: deptType,
      parentId: parentId || undefined,
      categoryWeights: deptType === 'WorkGroup' ? weights : undefined
    };

    if (isMockMode) {
      const newDepts = [...departments, newDept];
      setDepartments(newDepts);
      mockDb.setDepartments(newDepts);
      setDeptName('');
      setParentId('');
      alert("조직 정보가 등록되었습니다. (MOCK MODE)");
      return;
    }

    if (!db) return;
    try {
      await setDoc(doc(db, 'departments', newDept.id), newDept);
      setDeptName('');
      setParentId('');
      alert("조직 정보가 등록되었습니다.");
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'departments'); }
  };

  const handleAddUser = async () => {
    if (!userName || !userEmail || !userDeptId) return;
    
    const selectedDept = departments.find(d => d.id === userDeptId);
    if (!selectedDept) return;

    let teamId = '';
    let workGroupId: string | undefined = undefined;

    if (selectedDept.type === 'WorkGroup') {
      teamId = selectedDept.parentId!;
      workGroupId = selectedDept.id;
    } else {
      teamId = selectedDept.id;
    }

    const newUser: UserProfile = {
      uid: `user-${Date.now()}`,
      name: userName,
      email: userEmail,
      role: userRole,
      teamId,
      workGroupId,
      position: userPosition
    };

    if (isMockMode) {
      const newUsers = [...users, newUser];
      setUsers(newUsers);
      mockDb.setUsers(newUsers);
      setUserName('');
      setUserEmail('');
      setUserPosition('');
      alert("임직원 정보가 등록되었습니다. (MOCK MODE)");
      return;
    }

    if (!db) return;
    try {
      await setDoc(doc(db, 'users', newUser.uid), newUser);
      setUserName('');
      setUserEmail('');
      setUserPosition('');
      alert("임직원 정보가 등록되었습니다.");
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'users'); }
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm("정말 이 조직을 삭제하시겠습니까?")) return;

    if (isMockMode) {
      const newDepts = departments.filter(d => d.id !== id);
      setDepartments(newDepts);
      mockDb.setDepartments(newDepts);
      alert("조직이 삭제되었습니다. (MOCK MODE)");
      return;
    }

    if (!db) return;
    try {
      await deleteDoc(doc(db, 'departments', id));
      alert("조직이 삭제되었습니다.");
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'departments'); }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm("정말 이 임직원을 삭제하시겠습니까?")) return;

    if (isMockMode) {
      const newUsers = users.filter(u => u.uid !== uid);
      setUsers(newUsers);
      mockDb.setUsers(newUsers);
      alert("임직원 정보가 삭제되었습니다. (MOCK MODE)");
      return;
    }

    if (!db) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      alert("임직원 정보가 삭제되었습니다.");
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'users'); }
  };

  const handleDeleteIndicator = async (id: string) => {
    if (!confirm("정말 이 지표를 삭제하시겠습니까?")) return;

    if (isMockMode) {
      const newInds = indicators.filter(i => i.id !== id);
      setIndicators(newInds);
      mockDb.setIndicators(newInds);
      alert("지표가 삭제되었습니다. (MOCK MODE)");
      return;
    }

    if (!db) return;
    try {
      await deleteDoc(doc(db, 'goalIndicators', id));
      alert("지표가 삭제되었습니다.");
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'goalIndicators'); }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
          <button onClick={() => setActiveSubTab('kpi')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'kpi' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>KPI 지표</button>
          <button onClick={() => setActiveSubTab('org')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'org' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>조직 관리</button>
          <button onClick={() => setActiveSubTab('users')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'users' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>임직원 관리</button>
          <button onClick={() => setActiveSubTab('system')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'system' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>시스템</button>
        </div>
      </header>

      {activeSubTab === 'kpi' && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <BarChart3 size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">{editingIndicator ? '핵심 지표(KPI) 수정' : '핵심 지표(KPI) 등록'}</h3>
              </div>
              {editingIndicator && (
                <button onClick={cancelEditingIndicator} className="p-2 text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">지표 코드</label>
                <input value={kpiCode} onChange={(e) => setKpiCode(e.target.value)} placeholder="예: DEV-001" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">지표명</label>
                <input value={kpiName} onChange={(e) => setKpiName(e.target.value)} placeholder="예: 시스템 가동률" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">지표 설명</label>
              <textarea value={kpiDesc} onChange={(e) => setKpiDesc(e.target.value)} placeholder="지표에 대한 상세 설명을 입력하세요..." className="w-full h-24 p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">판단 기준 (데이터 소스/조건)</label>
              <textarea value={kpiCriteria} onChange={(e) => setKpiCriteria(e.target.value)} placeholder="예: 레드마인 일감 완료 기준, ISTM 장애 티켓 발생 건수 등..." className="w-full h-24 p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-4">
              {editingIndicator && (
                <button onClick={cancelEditingIndicator} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">취소</button>
              )}
              <button onClick={handleAddIndicator} className={`${editingIndicator ? 'flex-[2]' : 'w-full'} py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all`}>
                {editingIndicator ? '수정 완료' : '지표 등록하기'}
              </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-gray-900">등록된 지표 목록 ({indicators.length})</h3>
              <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button 
                  onClick={() => setViewMode('card')} 
                  className={`p-2 rounded-lg transition-all ${viewMode === 'card' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  title="카드형 보기"
                >
                  <LayoutDashboard size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('list')} 
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  title="목록형 보기"
                >
                  <FileText size={18} />
                </button>
              </div>
            </div>

            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {indicators.map(ind => (
                  <div key={ind.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 group relative flex flex-col h-full">
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => startEditingIndicator(ind)} className="p-1.5 text-gray-400 hover:text-blue-600 bg-white rounded-lg border border-gray-100 shadow-sm">
                        <Settings size={14} />
                      </button>
                      <button onClick={() => handleDeleteIndicator(ind.id)} className="p-1.5 text-gray-400 hover:text-red-500 bg-white rounded-lg border border-gray-100 shadow-sm">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <span className="text-[10px] font-bold bg-white px-2 py-1 rounded-md border border-gray-100 text-gray-400 w-fit">{ind.code}</span>
                    <h4 className="font-bold text-gray-900 text-sm mt-2">{ind.name}</h4>
                    <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 flex-1">{ind.description}</p>
                    {ind.criteria && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">판단 기준</p>
                        <p className="text-[10px] text-blue-600 line-clamp-1">{ind.criteria}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">코드</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">지표명</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">설명</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">판단 기준</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {indicators.map(ind => (
                      <tr key={ind.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-4 py-4">
                          <span className="text-xs font-mono font-bold text-gray-400">{ind.code}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-gray-900">{ind.name}</span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-xs text-gray-500 max-w-xs truncate">{ind.description}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-xs text-blue-600 max-w-xs truncate">{ind.criteria || '-'}</p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => startEditingIndicator(ind)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                              <Settings size={16} />
                            </button>
                            <button onClick={() => handleDeleteIndicator(ind.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'org' && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Building2 size={20} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">조직 및 업무그룹 등록</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">조직명</label>
                <input value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="예: 개발 1팀, 프론트엔드 파트" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">유형</label>
                <select value={deptType} onChange={(e) => setDeptType(e.target.value as DeptType)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none">
                  <option value="HQ">본부</option>
                  <option value="Area">부문</option>
                  <option value="Team">팀</option>
                  <option value="WorkGroup">업무그룹 (팀 하위)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">상위 조직</label>
                <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none">
                  <option value="">없음</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.type})</option>)}
                </select>
              </div>
            </div>

            {deptType === 'WorkGroup' && (
              <div className="p-6 bg-emerald-50/50 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-emerald-900">업무그룹별 가중치 설정</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">업적 (%)</label>
                    <input type="number" value={weights.achievement} onChange={(e) => setWeights({...weights, achievement: parseInt(e.target.value)})} className="w-full p-3 bg-white border border-emerald-100 rounded-xl outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">직무 (%)</label>
                    <input type="number" value={weights.job} onChange={(e) => setWeights({...weights, job: parseInt(e.target.value)})} className="w-full p-3 bg-white border border-emerald-100 rounded-xl outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">역량 (%)</label>
                    <input type="number" value={weights.competency} onChange={(e) => setWeights({...weights, competency: parseInt(e.target.value)})} className="w-full p-3 bg-white border border-emerald-100 rounded-xl outline-none" />
                  </div>
                </div>
                <p className="text-[10px] text-emerald-600">* 가중치의 합은 100이 되어야 합니다. (현재 합: {weights.achievement + weights.job + weights.competency}%)</p>
              </div>
            )}

            <button onClick={handleAddDept} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all">조직 등록하기</button>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-8">조직 구조 현황</h3>
            <div className="space-y-4">
              {departments.filter(d => !d.parentId).map(parent => (
                <div key={parent.id} className="space-y-2">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-white border border-gray-100 rounded text-[10px] font-bold text-gray-400 uppercase">{parent.type}</span>
                      <span className="font-bold text-gray-900">{parent.name}</span>
                    </div>
                    <button onClick={() => handleDeleteDept(parent.id)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="ml-8 space-y-2">
                    {departments.filter(d => d.parentId === parent.id).map(child => (
                      <div key={child.id} className="space-y-2">
                        <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl group">
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-1 bg-gray-50 border border-gray-100 rounded text-[10px] font-bold text-gray-400 uppercase">{child.type}</span>
                            <span className="font-bold text-gray-900">{child.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            {child.categoryWeights && (
                              <span className="text-[10px] font-mono text-gray-400">
                                W: {child.categoryWeights.achievement}/{child.categoryWeights.job}/{child.categoryWeights.competency}
                              </span>
                            )}
                            <button onClick={() => handleDeleteDept(child.id)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="ml-8 space-y-2">
                          {departments.filter(d => d.parentId === child.id).map(grandChild => (
                            <div key={grandChild.id} className="flex items-center justify-between p-3 bg-gray-50/50 border border-dashed border-gray-200 rounded-xl group">
                              <div className="flex items-center gap-3">
                                <span className="px-2 py-0.5 bg-white border border-gray-100 rounded text-[9px] font-bold text-gray-400 uppercase">{grandChild.type}</span>
                                <span className="text-sm font-medium text-gray-700">{grandChild.name}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                {grandChild.categoryWeights && (
                                  <span className="text-[9px] font-mono text-gray-400">
                                    W: {grandChild.categoryWeights.achievement}/{grandChild.categoryWeights.job}/{grandChild.categoryWeights.competency}
                                  </span>
                                )}
                                <button onClick={() => handleDeleteDept(grandChild.id)} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'users' && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Users size={20} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">임직원 등록</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="이름" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" />
              <input value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="이메일" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" />
              <select value={userRole} onChange={(e) => setUserRole(e.target.value as UserRole)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none">
                <option value="member">팀원</option>
                <option value="leader">팀장</option>
                <option value="head">본부장</option>
                <option value="admin">관리자</option>
              </select>
              <select value={userDeptId} onChange={(e) => setUserDeptId(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none">
                <option value="">소속 조직 선택</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input value={userPosition} onChange={(e) => setUserPosition(e.target.value)} placeholder="직위 (예: 책임연구원, 매니저)" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 md:col-span-2" />
            </div>
            <button onClick={handleAddUser} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all">임직원 등록하기</button>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-8">임직원 목록 ({users.length})</h3>
            <div className="overflow-hidden border border-gray-100 rounded-2xl">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">이름</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">이메일</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">조직</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">역할</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u => (
                    <tr key={u.uid} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4 font-bold text-gray-900 text-sm">
                        <div className="flex items-center gap-2">
                          {u.name}
                          {myGoals.some(g => g.userId === u.uid && g.year === 2026) ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" title="2026 목표 등록됨" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-gray-200" title="2026 목표 미등록" />
                          )}
                        </div>
                        <span className="text-xs font-normal text-gray-400">{u.position}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">{u.email}</td>
                      <td className="px-6 py-4 text-gray-500 text-sm">
                        {departments.find(d => d.id === u.teamId)?.name}
                        {u.workGroupId && ` / ${departments.find(d => d.id === u.workGroupId)?.name}`}
                      </td>
                      <td className="px-6 py-4 flex items-center justify-between">
                        <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-600 uppercase">{u.role}</span>
                        <button onClick={() => handleDeleteUser(u.uid)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'system' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">시스템 초기화 및 목업 데이터 생성</h3>
              </div>
              <p className="text-gray-500 mb-8 leading-relaxed text-sm">부서 정보, 기본 성과 지표, 그리고 100건 이상의 성과 기록(My Records)을 생성합니다. 기존 데이터가 있는 경우 덮어쓰게 됩니다.</p>
              <div className="space-y-4">
                <button 
                  onClick={seedData} 
                  disabled={isSeeding}
                  className={`w-full py-4 border-2 border-gray-900 text-gray-900 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${isSeeding ? 'bg-gray-50 opacity-50 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}`}
                >
                  {isSeeding ? (
                    <>
                      <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                      데이터 생성 중...
                    </>
                  ) : (
                    '초기 데이터 및 100건 기록 생성하기'
                  )}
                </button>
                
                {isMockMode && (
                  <button 
                    onClick={() => {
                      if (confirm("모든 목업 데이터를 초기화하고 페이지를 새로고침하시겠습니까?")) {
                        mockDb.clear();
                        window.location.reload();
                      }
                    }}
                    className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                  >
                    목업 데이터 초기화 (Reset Mock Data)
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-gray-900">팀 목표 현황 ({teamGoals.length})</h3>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button onClick={() => setViewMode('card')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'card' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>카드형</button>
                  <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>리스트형</button>
                </div>
              </div>
              <div className="max-h-96 overflow-auto pr-2 space-y-4">
                {teamGoals.map(goal => {
                  const dept = departments.find(d => d.id === goal.departmentId);
                  return (
                    <div key={goal.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{goal.year}년</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${goal.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{goal.status === 'published' ? '게시됨' : '임시'}</span>
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm">{dept?.name}</h4>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
