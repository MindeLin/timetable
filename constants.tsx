import { DaySetting, OperatingHours } from './types';

export const DAYS_OF_WEEK = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];

export const HOUR_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const displayHour = i % 24;
  const label = `${String(displayHour).padStart(2, '0')}`;
  if (i >= 24) {
    return { value: i, label: `${label} (+1天)` };
  }
  return { value: i, label };
});
export const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => ({ value: i, label: `${i}`.padStart(2, '0') }));
export const PREP_TIME_OPTIONS = [10, 20, 30, 45, 60, 90, 120].map(t => ({ value: t, label: `${t}` }));
export const PREP_TIME_OPTIONS_WITH_NA = [{ value: -1, label: "不顯示" }, ...PREP_TIME_OPTIONS];
export const DATE_RANGE_OPTIONS = ["今天", "明天", ...Array.from({ length: 29 }, (_, i) => `${i + 2}天後`)].map(d => ({ value: d, label: d }));

const initialOperatingHours: OperatingHours = {
  id: 1,
  timeRange: { start: { hour: 9, minute: 30 }, end: { hour: 18, minute: 0 } },
  pickup: {
    dateRange: { start: '7天後', end: '9天後' },
    pickupTime: { start: { hour: 10, minute: 0 }, end: { hour: 20, minute: 0 } },
    cutoffTime: { hour: 19, minute: 30 },
    limits: [],
  },
  delivery: {
    dateRange: { start: '3天後', end: '10天後' },
    pickupTime: { start: { hour: 10, minute: 0 }, end: { hour: 20, minute: 0 } },
    cutoffTime: { hour: 19, minute: 30 },
    limits: [],
  }
};

export const DEFAULT_SETTINGS: DaySetting[] = DAYS_OF_WEEK.map((day, index) => ({
  day,
  isOpen: true,
  operatingHours: [
    { ...initialOperatingHours, id: Date.now() + index * 10 + 1, 
        pickup: {...initialOperatingHours.pickup, limits: []}, 
        delivery: {...initialOperatingHours.delivery, limits: []} 
    }
  ]
}));


export const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);