export type TimelineBandKind = 'working' | 'nonWorking';
export type WarningLevel = 'info' | 'warning' | 'error';
export type ScheduleTime = number;

export interface WorkingHours {
  start: string;
  end: string;
}

export interface ScheduleSettings {
  initialAmount: number;
  finalAmount: number;
  finalReadyAt: ScheduleTime;
  timelineStart: ScheduleTime;
  timelineEnd: ScheduleTime;
  hydrationPercent: number;
  minExpansionRatio: number;
  maxExpansionRatio: number;
  minTemperature: number;
  maxTemperature: number;
  speedCorrection: number;
  snapMinutes: number;
  workingHours: WorkingHours;
}

export interface ExpansionPoint {
  id: string;
  time: ScheduleTime;
  lockedExpansionRatio?: number | null;
  lockedTemperature?: number | null;
  notes?: string;
}

export interface FeedAdditions {
  addedFeed: number;
  flourAdded: number;
  waterAdded: number;
}

export interface ScheduleSegment {
  id: string;
  startTime: ScheduleTime;
  endTime: ScheduleTime;
  durationHours: number;
  expansionRatio: number;
  suggestedTemperature: number;
  temperatureLocked: boolean;
  ratioInSafeRange: boolean;
  temperatureInPracticalRange: boolean;
}

export interface FeedStage {
  id: string;
  feedNumber: number;
  point: ExpansionPoint;
  starterBefore: number;
  targetAfter: number;
  expansionRatio: number;
  additions: FeedAdditions;
  hydrationPercent: number;
  segment: ScheduleSegment;
  status: WarningLevel;
}

export interface ScheduleWarning {
  id: string;
  level: WarningLevel;
  message: string;
}

export interface SchedulePlan {
  idealRatio: number | null;
  stages: FeedStage[];
  segments: ScheduleSegment[];
  warnings: ScheduleWarning[];
}

export interface TimelineBand {
  id: string;
  kind: TimelineBandKind;
  startTime: ScheduleTime;
  endTime: ScheduleTime;
}
