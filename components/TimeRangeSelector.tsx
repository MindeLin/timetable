import React, { useId } from 'react';
import { TimeRange } from '../types';
import TimeSelector from './TimeSelector';

interface TimeRangeSelectorProps {
    timeRange: TimeRange;
    onTimeChange: (field: 'start' | 'end', part: 'hour' | 'minute', value: number) => void;
    onSetAllDayRequest?: () => void;
    showAllDay?: boolean;
    willConsolidate?: boolean;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
    timeRange,
    onTimeChange,
    onSetAllDayRequest,
    showAllDay = true,
    willConsolidate = false,
}) => {
    const checkboxId = useId();
    const isAllDay = timeRange.start.hour === 0 &&
                     timeRange.start.minute === 0 &&
                     timeRange.end.hour === 23 &&
                     timeRange.end.minute === 59;

    const handleAllDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            if (onSetAllDayRequest) {
                onSetAllDayRequest();
            } else {
                onTimeChange('start', 'hour', 0);
                onTimeChange('start', 'minute', 0);
                onTimeChange('end', 'hour', 23);
                onTimeChange('end', 'minute', 59);
            }
        } else {
            // Revert to a default business hour when unchecked to allow cancellation
            onTimeChange('start', 'hour', 9);
            onTimeChange('start', 'minute', 30);
            onTimeChange('end', 'hour', 18);
            onTimeChange('end', 'minute', 0);
        }
    };

    const startTimeInMinutes = timeRange.start.hour * 60 + timeRange.start.minute;
    const endTimeInMinutes = timeRange.end.hour * 60 + timeRange.end.minute;
    const isInvalidRange = endTimeInMinutes <= startTimeInMinutes;

    return (
        <div className="flex flex-col items-center space-y-1 py-1">
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                <div className="flex items-center gap-1">
                    <TimeSelector 
                        time={timeRange.start}
                        onHourChange={(v) => onTimeChange('start', 'hour', v)}
                        onMinuteChange={(v) => onTimeChange('start', 'minute', v)}
                        disabled={isAllDay}
                    />
                    <span>~</span>
                    <TimeSelector 
                        time={timeRange.end}
                        onHourChange={(v) => onTimeChange('end', 'hour', v)}
                        onMinuteChange={(v) => onTimeChange('end', 'minute', v)}
                        disabled={isAllDay}
                    />
                </div>
                {showAllDay && (
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id={checkboxId}
                            checked={isAllDay}
                            onChange={handleAllDayChange}
                            className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                        />
                        <label htmlFor={checkboxId} className="ml-2 block text-sm text-gray-900 whitespace-nowrap">
                            全天
                        </label>
                    </div>
                )}
            </div>
            {isInvalidRange && !isAllDay && (
                 <div className="text-red-500 text-xs text-center">結束時間必須晚于開始時間</div>
            )}
            {showAllDay && willConsolidate && (
                <p className="text-orange-600 text-xs text-center">
                    選取後將清除本日其他時段
                </p>
            )}
        </div>
    );
};

export default TimeRangeSelector;