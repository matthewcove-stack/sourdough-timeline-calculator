import { defaultWorkingHours } from './timelineUtils';
import type { ScheduleSettings, WorkingHours } from '../types/schedule';

const PREFERENCES_KEY = 'sourdough-timeline-preferences';
const PREFERENCES_BACKUP_KEY = `${PREFERENCES_KEY}:backup`;

type SchedulePreferences = Pick<
  ScheduleSettings,
  | 'initialAmount'
  | 'finalAmount'
  | 'hydrationPercent'
  | 'minExpansionRatio'
  | 'maxExpansionRatio'
  | 'minTemperature'
  | 'maxTemperature'
  | 'speedCorrection'
  | 'snapMinutes'
  | 'workingHours'
>;

interface LegacyWorkingHoursDay extends WorkingHours {
  day: number;
  enabled: boolean;
}

function isWorkingHours(value: unknown): value is WorkingHours {
  return (
    typeof value === 'object' &&
    value != null &&
    typeof (value as WorkingHours).start === 'string' &&
    typeof (value as WorkingHours).end === 'string'
  );
}

function isLegacyWorkingHours(value: unknown): value is LegacyWorkingHoursDay[] {
  return (
    Array.isArray(value) &&
    value.length === 7 &&
    value.every(
      day =>
        typeof day === 'object' &&
        day != null &&
        typeof (day as LegacyWorkingHoursDay).day === 'number' &&
        typeof (day as LegacyWorkingHoursDay).enabled === 'boolean' &&
        typeof (day as LegacyWorkingHoursDay).start === 'string' &&
        typeof (day as LegacyWorkingHoursDay).end === 'string'
    )
  );
}

function sanitisePreferences(value: unknown): Partial<SchedulePreferences> {
  if (typeof value !== 'object' || value == null) {
    return {};
  }

  const source = value as Partial<SchedulePreferences>;
  const preferences: Partial<SchedulePreferences> = {};

  for (const key of [
    'initialAmount',
    'finalAmount',
    'hydrationPercent',
    'minExpansionRatio',
    'maxExpansionRatio',
    'minTemperature',
    'maxTemperature',
    'speedCorrection',
    'snapMinutes'
  ] satisfies Array<keyof SchedulePreferences>) {
    if (typeof source[key] === 'number' && Number.isFinite(source[key])) {
      preferences[key] = source[key];
    }
  }

  if (isWorkingHours(source.workingHours) || isLegacyWorkingHours(source.workingHours)) {
    preferences.workingHours = normaliseWorkingHours(source.workingHours);
  }

  return preferences;
}

function readPreferenceCookie(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookie = document.cookie
    .split('; ')
    .find(part => part.startsWith(`${PREFERENCES_KEY}=`));

  return cookie ? cookie.slice(PREFERENCES_KEY.length + 1) : null;
}

function readJson(value: string | null): unknown {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return null;
  }
}

export function readSchedulePreferences(): Partial<SchedulePreferences> {
  const fromCookie = sanitisePreferences(readJson(readPreferenceCookie()));
  if (Object.keys(fromCookie).length > 0) {
    return fromCookie;
  }

  if (typeof localStorage === 'undefined') {
    return {};
  }

  return sanitisePreferences(readJson(localStorage.getItem(PREFERENCES_BACKUP_KEY)));
}

export function hasSavedSchedulePreferences(): boolean {
  if (readPreferenceCookie()) {
    return true;
  }

  return typeof localStorage !== 'undefined' && localStorage.getItem(PREFERENCES_BACKUP_KEY) != null;
}

export function normaliseWorkingHours(value: unknown): WorkingHours {
  if (isWorkingHours(value)) {
    return {
      start: value.start,
      end: value.end
    };
  }

  if (isLegacyWorkingHours(value)) {
    const firstEnabled = value.find(day => day.enabled) ?? value[0];
    return {
      start: firstEnabled.start,
      end: firstEnabled.end
    };
  }

  return defaultWorkingHours();
}

export function writeSchedulePreferences(settings: ScheduleSettings) {
  if (typeof document === 'undefined') {
    return;
  }

  const preferences: SchedulePreferences = {
    initialAmount: settings.initialAmount,
    finalAmount: settings.finalAmount,
    hydrationPercent: settings.hydrationPercent,
    minExpansionRatio: settings.minExpansionRatio,
    maxExpansionRatio: settings.maxExpansionRatio,
    minTemperature: settings.minTemperature,
    maxTemperature: settings.maxTemperature,
    speedCorrection: settings.speedCorrection,
    snapMinutes: settings.snapMinutes,
    workingHours: normaliseWorkingHours(settings.workingHours)
  };
  const encoded = encodeURIComponent(JSON.stringify(preferences));

  document.cookie = `${PREFERENCES_KEY}=${encoded}; max-age=31536000; path=/; SameSite=Lax`;
  localStorage.setItem(PREFERENCES_BACKUP_KEY, encoded);
}
