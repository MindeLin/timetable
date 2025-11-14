export interface Time {
  hour: number;
  minute: number;
}

export interface TimeRange {
  start: Time;
  end: Time;
}

export enum LimitType {
  ORDER = 'order',
  ITEM = 'item'
}

export interface TimeSlotLimit {
  id: number;
  interval: TimeRange;
  limitType: LimitType;
  limitValue: number;
  repeatingInterval?: number;
}

export interface Schedule {
  dateRange: {
    start: string;
    end: string;
  };
  pickupTime: TimeRange;
  cutoffTime: Time;
  limits: TimeSlotLimit[];
}

export interface OperatingHours {
  id: number;
  timeRange: TimeRange;
  pickup: Schedule;
  delivery: Schedule;
}

export interface DaySetting {
  day: string;
  isOpen: boolean;
  operatingHours: OperatingHours[];
}