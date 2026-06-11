import { useEffect, useMemo, useState } from 'react';
import { Coffee } from 'lucide-react';
import { AdvancedSettings } from './components/AdvancedSettings';
import { PlanSummary } from './components/PlanSummary';
import { QuickSetup } from './components/QuickSetup';
import { ScheduleTable } from './components/ScheduleTable';
import { Timeline } from './components/Timeline';
import { WarningList } from './components/WarningList';
import { schedulePlainText } from './lib/formatting';
import {
  hasSavedSchedulePreferences,
  normaliseWorkingHours,
  readSchedulePreferences,
  writeSchedulePreferences
} from './lib/preferences';
import { decodeJsonFromUrl, encodeJsonForUrl } from './lib/shareEncoding';
import { buildSchedulePlan, distributeEvenExpansionRatio } from './lib/sourdoughMath';
import { estimateMaturationHours } from './lib/timingModel';
import {
  addMinutes,
  clamp,
  defaultWorkingHours,
  getDefaultTimelineRange,
  HOUR_MINUTES,
  moveToPreviousWorkingTime,
  normaliseScheduleTime,
  scheduleTimeFromDayAndClock,
  snapScheduleTime,
  sortPointsByTime
} from './lib/timelineUtils';
import type { ExpansionPoint, ScheduleSettings, ScheduleTime, WorkingHours } from './types/schedule';

const STORAGE_KEY = 'sourdough-timeline-calculator:v2';
const SHARE_PARAM = 'plan';
const SUPPORT_URL = 'https://buymeacoffee.com/lambic';

interface SavedSchedule {
  settings: ScheduleSettings;
  points: ExpansionPoint[];
}

function newPoint(time: ScheduleTime): ExpansionPoint {
  return {
    id: crypto.randomUUID(),
    time,
    notes: '',
    lockedExpansionRatio: null,
    lockedTemperature: null
  };
}

function normalisePoint(value: unknown, fallbackTime: ScheduleTime): ExpansionPoint | null {
  if (typeof value !== 'object' || value == null) {
    return null;
  }

  const source = value as Partial<ExpansionPoint>;

  return {
    id: typeof source.id === 'string' && source.id ? source.id : crypto.randomUUID(),
    time: normaliseScheduleTime(source.time, fallbackTime),
    notes: typeof source.notes === 'string' ? source.notes : '',
    lockedExpansionRatio: typeof source.lockedExpansionRatio === 'number' ? source.lockedExpansionRatio : null,
    lockedTemperature: typeof source.lockedTemperature === 'number' ? source.lockedTemperature : null
  };
}

function numberSetting(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function defaultRangePatch(workingHours: WorkingHours): Pick<ScheduleSettings, 'timelineStart' | 'timelineEnd' | 'finalReadyAt'> {
  const range = getDefaultTimelineRange(workingHours);

  return {
    timelineStart: range.timelineStart,
    timelineEnd: range.timelineEnd,
    finalReadyAt: range.timelineEnd
  };
}

function dayTime(dayIndex: number, clockTime: string, fallback: ScheduleTime): ScheduleTime {
  return scheduleTimeFromDayAndClock(dayIndex, clockTime) ?? fallback;
}

function normaliseSchedule(value: unknown, defaults: SavedSchedule): SavedSchedule | null {
  if (typeof value !== 'object' || value == null) {
    return null;
  }

  const source = value as Partial<SavedSchedule>;
  const rawSettings = typeof source.settings === 'object' && source.settings != null ? source.settings : {};
  const settingsSource = rawSettings as Partial<ScheduleSettings>;

  const settings: ScheduleSettings = {
    ...defaults.settings,
    initialAmount: numberSetting(settingsSource.initialAmount, defaults.settings.initialAmount),
    finalAmount: numberSetting(settingsSource.finalAmount, defaults.settings.finalAmount),
    finalReadyAt: normaliseScheduleTime(settingsSource.finalReadyAt, defaults.settings.finalReadyAt),
    timelineStart: normaliseScheduleTime(settingsSource.timelineStart, defaults.settings.timelineStart),
    timelineEnd: normaliseScheduleTime(settingsSource.timelineEnd, defaults.settings.timelineEnd),
    hydrationPercent: numberSetting(settingsSource.hydrationPercent, defaults.settings.hydrationPercent),
    minExpansionRatio: numberSetting(settingsSource.minExpansionRatio, defaults.settings.minExpansionRatio),
    maxExpansionRatio: numberSetting(settingsSource.maxExpansionRatio, defaults.settings.maxExpansionRatio),
    minTemperature: numberSetting(settingsSource.minTemperature, defaults.settings.minTemperature),
    maxTemperature: numberSetting(settingsSource.maxTemperature, defaults.settings.maxTemperature),
    speedCorrection: numberSetting(settingsSource.speedCorrection, defaults.settings.speedCorrection),
    snapMinutes: numberSetting(settingsSource.snapMinutes, defaults.settings.snapMinutes),
    workingHours: normaliseWorkingHours(settingsSource.workingHours ?? defaults.settings.workingHours)
  };

  const points = Array.isArray(source.points)
    ? source.points
        .map((point, index) =>
          normalisePoint(point, defaults.points[index]?.time ?? settings.timelineStart)
        )
        .filter((point): point is ExpansionPoint => point != null)
    : defaults.points;

  return {
    settings,
    points
  };
}

function loadSharedSchedule(defaults: SavedSchedule): SavedSchedule | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const encoded = new URLSearchParams(window.location.search).get(SHARE_PARAM);
  if (!encoded) {
    return null;
  }

  try {
    return normaliseSchedule(decodeJsonFromUrl(encoded), defaults);
  } catch {
    return null;
  }
}

function createDefaultSchedule(preferences = readSchedulePreferences()): SavedSchedule {
  const workingHours = normaliseWorkingHours(preferences.workingHours ?? defaultWorkingHours());
  const visibleRange = getDefaultTimelineRange(workingHours);
  const firstFeed = snapScheduleTime(
    clamp(
      visibleRange.firstWorkingEnd - 2 * HOUR_MINUTES,
      visibleRange.firstWorkingStart,
      visibleRange.firstWorkingEnd
    ),
    preferences.snapMinutes ?? 15
  );
  const secondFeed = visibleRange.secondWorkingStart;

  return {
    settings: {
      initialAmount: preferences.initialAmount ?? 50,
      finalAmount: preferences.finalAmount ?? 400,
      finalReadyAt: visibleRange.timelineEnd,
      timelineStart: visibleRange.timelineStart,
      timelineEnd: visibleRange.timelineEnd,
      hydrationPercent: preferences.hydrationPercent ?? 100,
      minExpansionRatio: preferences.minExpansionRatio ?? 2,
      maxExpansionRatio: preferences.maxExpansionRatio ?? 5,
      minTemperature: preferences.minTemperature ?? 16,
      maxTemperature: preferences.maxTemperature ?? 30,
      speedCorrection: preferences.speedCorrection ?? 1,
      snapMinutes: preferences.snapMinutes ?? 15,
      workingHours
    },
    points: [newPoint(firstFeed), newPoint(secondFeed)]
  };
}

function loadInitialSchedule(): SavedSchedule {
  const defaults = createDefaultSchedule();
  const shared = loadSharedSchedule(defaults);

  if (shared) {
    return shared;
  }

  if (typeof localStorage === 'undefined') {
    return defaults;
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return defaults;
  }

  try {
    return normaliseSchedule(JSON.parse(saved), defaults) ?? defaults;
  } catch {
    return defaults;
  }
}

export default function App() {
  const [savedSchedule] = useState<SavedSchedule>(() => loadInitialSchedule());
  const [settings, setSettings] = useState<ScheduleSettings>(() => savedSchedule.settings);
  const [points, setPoints] = useState<ExpansionPoint[]>(() => sortPointsByTime(savedSchedule.points));
  const [copyStatus, setCopyStatus] = useState('');
  const [setupError, setSetupError] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  const [savedDefaultsApplied] = useState(() => hasSavedSchedulePreferences());

  const orderedPoints = useMemo(() => sortPointsByTime(points), [points]);
  const plan = useMemo(() => buildSchedulePlan(settings, orderedPoints), [settings, orderedPoints]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, points: orderedPoints }));
    writeSchedulePreferences(settings);
  }, [settings, orderedPoints]);

  function updateSettings(patch: Partial<ScheduleSettings>) {
    setSetupError('');
    setSettings(current => ({ ...current, ...patch }));
  }

  function updatePoint(pointId: string, patch: Partial<ExpansionPoint>) {
    setPoints(current =>
      sortPointsByTime(current.map(point => (point.id === pointId ? { ...point, ...patch } : point)))
    );
  }

  function removePoint(pointId: string) {
    setPoints(current => current.filter(point => point.id !== pointId));
  }

  function addPointAt(time: ScheduleTime) {
    setPoints(current => sortPointsByTime([...current, newPoint(time)]));
  }

  function addFeed() {
    const start = settings.timelineStart;
    const end = settings.timelineEnd;
    const final = settings.finalReadyAt;
    const latestPoint = Math.max(start, ...orderedPoints.map(point => point.time));
    const preferred = Math.min(final - HOUR_MINUTES, latestPoint + Math.max(HOUR_MINUTES, (final - latestPoint) / 2));
    const bounded = clamp(preferred, start, Math.max(start, end));
    addPointAt(snapScheduleTime(bounded, settings.snapMinutes));
  }

  function resetRatios() {
    setPoints(current =>
      current.map(point => ({
        ...point,
        lockedExpansionRatio: null
      }))
    );
  }

  function updateFinalReadyAt(time: ScheduleTime) {
    updateSettings({ finalReadyAt: time });
  }

  function updateTimelineRange(start: ScheduleTime, end: ScheduleTime) {
    updateSettings({ timelineStart: start, timelineEnd: end });
  }

  function applyPreset(presetId: string) {
    const weekdayHours = { start: '06:00', end: '20:00' };
    const overnightHours = { start: '20:00', end: '06:00' };

    const presets: Record<string, Partial<ScheduleSettings>> = {
      weekday: {
        workingHours: weekdayHours,
        speedCorrection: 1,
        ...defaultRangePatch(weekdayHours)
      },
      overnight: {
        workingHours: overnightHours,
        speedCorrection: 1,
        ...defaultRangePatch(overnightHours)
      },
      warm: {
        workingHours: weekdayHours,
        minTemperature: 18,
        maxTemperature: 28,
        speedCorrection: 1.15,
        finalReadyAt: dayTime(1, '13:00', settings.finalReadyAt)
      },
      slow: {
        workingHours: weekdayHours,
        speedCorrection: 0.75,
        minExpansionRatio: 2,
        maxExpansionRatio: 4,
        finalReadyAt: dayTime(1, '13:00', settings.finalReadyAt)
      }
    };

    updateSettings(presets[presetId] ?? {});
    setActionStatus('Preset applied.');
  }

  function fitTimelineToPlan() {
    const firstFeed = orderedPoints[0]?.time ?? settings.timelineStart;
    updateTimelineRange(Math.max(0, addMinutes(firstFeed, -120)), addMinutes(settings.finalReadyAt, 120));
  }

  async function copySchedule() {
    const text = schedulePlainText(plan);

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('Schedule copied.');
    } catch {
      setCopyStatus(text);
    }
  }

  async function copyShareLink() {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const url = new URL(window.location.href);
      url.searchParams.set(SHARE_PARAM, encodeJsonForUrl({ settings, points: orderedPoints }));
      await navigator.clipboard.writeText(url.toString());
      setActionStatus('Share link copied.');
    } catch {
      setActionStatus('Share link could not be created.');
    }
  }

  function printSchedule() {
    window.print();
  }

  function resetSchedule() {
    if (!window.confirm('Reset this plan and replace it with your defaults?')) {
      return;
    }

    const defaults = createDefaultSchedule();
    setSettings(defaults.settings);
    setPoints(defaults.points);
    setCopyStatus('');
    setSetupError('');
    setActionStatus('');
  }

  function fitTwoFeedPlan() {
    if (settings.initialAmount <= 0 || settings.finalAmount <= 0) {
      setSetupError('Starter amounts must be greater than zero.');
      return;
    }

    if (settings.finalAmount <= settings.initialAmount) {
      setSetupError('Final starter must be greater than initial starter.');
      return;
    }

    if (!Number.isFinite(settings.finalReadyAt)) {
      setSetupError('Ready by must be a valid schedule time.');
      return;
    }

    const ratio = distributeEvenExpansionRatio(settings.initialAmount, settings.finalAmount, 2);

    if (!Number.isFinite(ratio)) {
      setSetupError('The feeding plan could not be generated with these amounts.');
      return;
    }

    const targetTemperature = clamp(21, settings.minTemperature, settings.maxTemperature);
    const maturationHours = estimateMaturationHours(ratio, targetTemperature, settings.speedCorrection);

    if (!Number.isFinite(maturationHours)) {
      setSetupError('The feeding plan could not estimate a usable maturation time.');
      return;
    }

    const maturationMinutes = maturationHours * HOUR_MINUTES;
    const secondFeed = moveToPreviousWorkingTime(
      settings.finalReadyAt - maturationMinutes,
      settings.workingHours,
      settings.snapMinutes
    );
    const firstFeed = moveToPreviousWorkingTime(
      secondFeed - maturationMinutes,
      settings.workingHours,
      settings.snapMinutes
    );

    setPoints([newPoint(firstFeed), newPoint(secondFeed)]);
    updateSettings({
      timelineStart: Math.max(0, addMinutes(firstFeed, -120)),
      timelineEnd: addMinutes(settings.finalReadyAt, 120)
    });
    setSetupError('');
    setActionStatus('Feeding plan generated.');
  }

  return (
    <main className="min-h-screen bg-[#f6f8f5] px-3 pb-24 pt-4 text-slate-950 sm:px-6 sm:pb-4 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft print:hidden">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-normal text-emerald-800">Lambic Labs</p>
              <h1 className="text-2xl font-bold text-slate-950">Sourdough Timeline Calculator</h1>
            </div>
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-950 transition hover:bg-amber-100 sm:w-auto"
              aria-label="Support Lambic Labs on Buy Me a Coffee"
            >
              <Coffee className="h-4 w-4" aria-hidden="true" />
              Support this work
            </a>
          </div>
        </header>

        <QuickSetup
          settings={settings}
          onSettingsChange={updateSettings}
          onFitPlan={fitTwoFeedPlan}
          onReset={resetSchedule}
          onApplyPreset={applyPreset}
          savedDefaultsApplied={savedDefaultsApplied}
          setupError={setupError}
        />

        <PlanSummary settings={settings} plan={plan} setupError={setupError} />

        {actionStatus && <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">{actionStatus}</p>}

        <Timeline
          settings={settings}
          points={orderedPoints}
          plan={plan}
          onPointTimeChange={(pointId, time) => updatePoint(pointId, { time })}
          onFinalTimeChange={updateFinalReadyAt}
          onTimelineRangeChange={updateTimelineRange}
          onAddPointAt={addPointAt}
          onFitView={fitTimelineToPlan}
        />

        <WarningList warnings={plan.warnings} />

        <ScheduleTable
          settings={settings}
          plan={plan}
          onCopy={copySchedule}
          copyStatus={copyStatus}
          actionStatus={actionStatus}
          onAddFeed={addFeed}
          onPointChange={updatePoint}
          onPointRemove={removePoint}
          onResetRatios={resetRatios}
          onShare={copyShareLink}
          onPrint={printSchedule}
        />

        <AdvancedSettings settings={settings} onSettingsChange={updateSettings} />
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur sm:hidden print:hidden">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
          <button
            type="button"
            onClick={fitTwoFeedPlan}
            className="h-12 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white"
          >
            Generate plan
          </button>
          <button
            type="button"
            onClick={addFeed}
            className="h-12 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-900"
          >
            Add feed
          </button>
        </div>
      </div>
    </main>
  );
}
