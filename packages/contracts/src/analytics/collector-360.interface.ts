import { ITeamOverviewCollector } from './team-overview.interface';

export interface ICollector360TimelinePoint {
  date: string;
  value: number;
  metric: string;
}

export interface ICollector360CoachingNote {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
  authorId: string;
}

export interface ICollector360 {
  profile: {
    userId: string;
    fullName: string;
    email: string;
    role: string;
    hireDate: string;
  };
  metrics: {
    current: ITeamOverviewCollector;
    benchmarks: {
      teamAverageCollected: number;
      rankInTeam: number;
      totalTeamMembers: number;
    };
    timeline: ICollector360TimelinePoint[];
  };
  coaching: ICollector360CoachingNote[];
}
