import { UserProfile, Department, GoalIndicator, TeamGoal, MemberGoal, PerformanceEvent } from '../types';
import { MOCK_DEPARTMENTS, MOCK_INDICATORS, MOCK_USERS, MOCK_TEAM_GOALS, MOCK_MEMBER_GOALS, MOCK_EVENTS } from '../mockData';

const STORAGE_KEYS = {
  USERS: 'pulse_mock_users',
  DEPARTMENTS: 'pulse_mock_departments',
  INDICATORS: 'pulse_mock_indicators',
  TEAM_GOALS: 'pulse_mock_team_goals',
  MEMBER_GOALS: 'pulse_mock_member_goals',
  EVENTS: 'pulse_mock_events',
  CURRENT_USER: 'pulse_mock_current_user',
  CURRENT_PROFILE: 'pulse_mock_current_profile'
};

const get = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const set = <T>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const mockDb = {
  getUsers: () => get<UserProfile[]>(STORAGE_KEYS.USERS, MOCK_USERS),
  setUsers: (users: UserProfile[]) => set(STORAGE_KEYS.USERS, users),
  
  getDepartments: () => get<Department[]>(STORAGE_KEYS.DEPARTMENTS, MOCK_DEPARTMENTS),
  setDepartments: (depts: Department[]) => set(STORAGE_KEYS.DEPARTMENTS, depts),
  
  getIndicators: () => get<GoalIndicator[]>(STORAGE_KEYS.INDICATORS, MOCK_INDICATORS),
  setIndicators: (inds: GoalIndicator[]) => set(STORAGE_KEYS.INDICATORS, inds),
  
  getTeamGoals: () => get<TeamGoal[]>(STORAGE_KEYS.TEAM_GOALS, MOCK_TEAM_GOALS),
  setTeamGoals: (goals: TeamGoal[]) => set(STORAGE_KEYS.TEAM_GOALS, goals),
  
  getMemberGoals: () => get<MemberGoal[]>(STORAGE_KEYS.MEMBER_GOALS, MOCK_MEMBER_GOALS),
  setMemberGoals: (goals: MemberGoal[]) => set(STORAGE_KEYS.MEMBER_GOALS, goals),
  
  getEvents: () => get<PerformanceEvent[]>(STORAGE_KEYS.EVENTS, MOCK_EVENTS),
  setEvents: (events: PerformanceEvent[]) => set(STORAGE_KEYS.EVENTS, events),
  
  getCurrentUser: () => get<any>(STORAGE_KEYS.CURRENT_USER, null),
  setCurrentUser: (user: any) => set(STORAGE_KEYS.CURRENT_USER, user),
  
  getCurrentProfile: () => get<UserProfile | null>(STORAGE_KEYS.CURRENT_PROFILE, null),
  setCurrentProfile: (profile: UserProfile | null) => set(STORAGE_KEYS.CURRENT_PROFILE, profile),
  
  clear: () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }
};
