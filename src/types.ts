export type UserRole = 'member' | 'leader' | 'head' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  teamId: string;
  workGroupId?: string;
  photoURL?: string;
  position?: string;
}

export type DeptType = 'HQ' | 'Team' | 'Area' | 'WorkGroup';

export interface Department {
  id: string;
  name: string;
  type: DeptType;
  parentId?: string;
  categoryWeights?: {
    achievement: number;
    job: number;
    competency: number;
  };
}

export interface GoalIndicator {
  id: string;
  code: string;
  name: string;
  description: string;
  criteria?: string;
}

export type GoalStatus = 'draft' | 'pending' | 'agreed';

export interface MemberGoal {
  id: string;
  userId: string;
  year: number;
  status: GoalStatus;
  narrative?: string;
  indicatorIds?: string[];
  customIndicators?: TeamIndicator[];
}

export type TeamGoalStatus = 'draft' | 'published';

export type GoalCategory = 'achievement' | 'job' | 'competency';

export interface TeamIndicator {
  indicatorId: string;
  name?: string; // For directly registered custom indicators
  customDescription: string;
  category: GoalCategory;
  weight: number;
}

export interface TeamGoal {
  id: string;
  departmentId: string;
  year: number;
  narrative: string;
  indicatorIds?: string[];
  customIndicators?: TeamIndicator[];
  status: TeamGoalStatus;
  categoryWeights: {
    achievement: number;
    job: number;
    competency: number;
  };
}

export type EventStatus = 'registered' | 'reviewed';

export interface PerformanceEvent {
  id: string;
  userId: string;
  date: string;
  title: string;
  teamId?: string;
  workGroupId?: string;
  description?: string;
  indicatorId?: string;
  achievement: number; // 0 to 100
  status: EventStatus;
}

export interface Comment {
  id: string;
  targetId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface MeetingComment {
  id: string;
  userId: string;
  leaderId: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: number;
  content: string;
  createdAt: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
