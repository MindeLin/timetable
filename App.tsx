
import React, { useState, useCallback } from 'react';
import { DaySetting, OperatingHours, Time, TimeRange, TimeSlotLimit } from './types';
import {
  DEFAULT_SETTINGS,
  ClockIcon,
  TrashIcon,
  PREP_TIME_OPTIONS,
  PREP_TIME_OPTIONS_WITH_NA,
  DATE_RANGE_OPTIONS
} from './constants';
import ToggleSwitch from './components/ToggleSwitch';
import TimeSelector from './components/TimeSelector';
import TimeRangeSelector from './components/TimeRangeSelector';
import LimitEditor from './components/LimitEditor';

// Helper component for date range selects
const DateRangeSelector: React.FC<{
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}> = ({ start, end, onStartChange, onEndChange }) => (
    <div className="flex items-center gap-1">
        <select value={start} onChange={e => onStartChange(e.target.value)} className="bg-white border border-gray-300 rounded-md shadow-sm px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500">
            {DATE_RANGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <span>~</span>
        <select value={end} onChange={e => onEndChange(e.target.value)} className="bg-white border border-gray-300 rounded-md shadow-sm px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500">
            {DATE_RANGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);

const formatTime = (time: Time) => {
    const displayHour = time.hour % 24;
    const dayOffset = Math.floor(time.hour / 24);
    const dayString = dayOffset > 0 ? ` (+${dayOffset}天)` : '';
    return `${String(displayHour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}${dayString}`;
};

const isTimeRangeAllDay = (timeRange: TimeRange): boolean => {
    return timeRange.start.hour === 0 &&
           timeRange.start.minute === 0 &&
           timeRange.end.hour === 23 &&
           timeRange.end.minute === 59;
};

const LimitInfo: React.FC<{ limits: TimeSlotLimit[]; onClick: () => void; }> = ({ limits, onClick }) => {
    if (limits.length === 0) {
        return (
            <div className="p-1 flex items-center justify-start text-left w-full">
                <button 
                    onClick={onClick} 
                    className="w-full text-sky-600 hover:text-sky-800 font-semibold border-2 border-dashed border-sky-400 rounded-md px-3 py-1.5 text-center transition-colors"
                >
                    + 時段限單(量)
                </button>
            </div>
        );
    }

    return (
        <div className="p-1 w-full">
            <button 
                onClick={onClick} 
                className="w-full text-left bg-white border border-gray-300 rounded-md shadow-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 hover:bg-gray-50 transition-colors"
            >
                <div className="flex flex-col space-y-1">
                    {limits.map((limit, index) => {
                        const intervalText = limit.repeatingInterval ? `每${limit.repeatingInterval}分鐘 ` : '';
                        return (
                            <div key={index}>
                                {`${formatTime(limit.interval.start)} - ${formatTime(limit.interval.end)}: ${intervalText}${limit.limitType === 'order' ? '訂單數量' : '商品數量'}上限 ${limit.limitValue}`}
                            </div>
                        )
                    })}
                </div>
            </button>
        </div>
    );
};


const App: React.FC = () => {
    const [settings, setSettings] = useState<DaySetting[]>(DEFAULT_SETTINGS);
    const [editingLimit, setEditingLimit] = useState<{ dayIndex: number; opHourIndex: number; type: 'pickup' | 'delivery' } | null>(null);

    const handleUpdate = useCallback(<T,>(dayIndex: number, opHourIndex: number, updater: (opHour: OperatingHours) => Partial<OperatingHours>) => {
        setSettings(currentSettings => {
            const newSettings = JSON.parse(JSON.stringify(currentSettings));
            const opHourToUpdate = newSettings[dayIndex].operatingHours[opHourIndex];
            Object.assign(opHourToUpdate, updater(opHourToUpdate));
            return newSettings;
        });
    }, []);

    const addOperatingHours = (dayIndex: number) => {
        setSettings(currentSettings => {
            const daySetting = currentSettings[dayIndex];
            const isAnySlotAllDay = daySetting.operatingHours.some(op => isTimeRangeAllDay(op.timeRange));
            
            if (isAnySlotAllDay) {
                return currentSettings;
            }

            const newSettings = JSON.parse(JSON.stringify(currentSettings));
            const dayToUpdate = newSettings[dayIndex];

            if (dayToUpdate.operatingHours.length === 0) {
                // This case should not be reached with current UI, but as a fallback, add a default.
                dayToUpdate.operatingHours.push({
                    ...DEFAULT_SETTINGS[0].operatingHours[0],
                    id: Date.now()
                });
                return newSettings;
            }
            
            const lastOpHour = dayToUpdate.operatingHours[dayToUpdate.operatingHours.length - 1];
            
            const timeToMinutes = (t: Time) => t.hour * 60 + t.minute;
            const MAX_MINUTES = 47 * 60 + 59;
            
            if (timeToMinutes(lastOpHour.timeRange.end) >= MAX_MINUTES) {
                // Already at the end of possible time, do not add another slot.
                return currentSettings;
            }

            const createNewTimeRange = (lastEnd: Time): TimeRange => {
                const start = { ...lastEnd };
                
                let endHour = start.hour + 1;
                const endMinute = start.minute;

                if (endHour > 47) {
                    endHour = 47;
                }

                const end = { hour: endHour, minute: endMinute };
                
                // If capping made the range invalid (e.g. start is 47:30, end becomes 47:30), 
                // set end to max time to ensure it's valid.
                if (timeToMinutes(end) <= timeToMinutes(start)) {
                    end.hour = 47;
                    end.minute = 59;
                }

                return { start, end };
            };

            const newOpHour = JSON.parse(JSON.stringify(lastOpHour));
            newOpHour.id = Date.now();
            newOpHour.timeRange = createNewTimeRange(lastOpHour.timeRange.end);
            newOpHour.pickup.pickupTime = createNewTimeRange(lastOpHour.pickup.pickupTime.end);
            newOpHour.delivery.pickupTime = createNewTimeRange(lastOpHour.delivery.pickupTime.end);
            newOpHour.pickup.limits = [];
            newOpHour.delivery.limits = [];

            dayToUpdate.operatingHours.push(newOpHour);

            return newSettings;
        });
    };

    const removeOperatingHours = (dayIndex: number, opHourId: number) => {
        setSettings(currentSettings => {
            const newSettings = [...currentSettings];
            const newDaySetting = { ...newSettings[dayIndex] };
            newDaySetting.operatingHours = newDaySetting.operatingHours.filter(op => op.id !== opHourId);
            newSettings[dayIndex] = newDaySetting;
            return newSettings;
        });
    };

    const toggleDayOpen = (dayIndex: number, isOpen: boolean) => {
        setSettings(currentSettings => {
            const newSettings = [...currentSettings];
            newSettings[dayIndex] = { ...newSettings[dayIndex], isOpen };
            return newSettings;
        });
    };

    const copyMondaySettings = () => {
        setSettings(currentSettings => {
            const mondaySettings = JSON.parse(JSON.stringify(currentSettings[0]));
            return currentSettings.map((daySetting, index) => {
                if (index === 0) return daySetting;
                return {
                    ...daySetting,
                    isOpen: mondaySettings.isOpen,
                    operatingHours: mondaySettings.operatingHours.map((op: OperatingHours) => ({ ...op, id: Date.now() + index * 100 + op.id }))
                };
            });
        });
    };

    const handleSetAllDay = (dayIndex: number, opHourId: number) => {
        setSettings(currentSettings => {
            const daySetting = currentSettings[dayIndex];
            
            const currentOpHour = daySetting.operatingHours.find(op => op.id === opHourId);
            if (currentOpHour && isTimeRangeAllDay(currentOpHour.timeRange)) {
                return currentSettings;
            }

            if (daySetting.operatingHours.length > 1) {
                const confirmed = window.confirm("設為全天將會清除本日其他時段，確定要繼續嗎？");
                if (!confirmed) {
                    return currentSettings; 
                }

                const newSettings = JSON.parse(JSON.stringify(currentSettings));
                const targetOpHourToKeep = newSettings[dayIndex].operatingHours.find(op => op.id === opHourId);
                
                if (targetOpHourToKeep) {
                    targetOpHourToKeep.timeRange = {
                        start: { hour: 0, minute: 0 },
                        end: { hour: 23, minute: 59 }
                    };
                    newSettings[dayIndex].operatingHours = [targetOpHourToKeep];
                }
                return newSettings;

            } else {
                const newSettings = JSON.parse(JSON.stringify(currentSettings));
                const targetOpHour = newSettings[dayIndex].operatingHours.find(op => op.id === opHourId);
                 if (targetOpHour) {
                    targetOpHour.timeRange = {
                        start: { hour: 0, minute: 0 },
                        end: { hour: 23, minute: 59 }
                    };
                }
                return newSettings;
            }
        });
    };
    
    const handleSaveLimits = (dayIndex: number, opHourIndex: number, type: 'pickup' | 'delivery', limits: TimeSlotLimit[]) => {
        handleUpdate(dayIndex, opHourIndex, (op) => ({
            [type]: { ...op[type], limits }
        }));
        setEditingLimit(null);
    };

  return (
    <div className="bg-gray-100 min-h-screen font-sans text-sm">
      <header className="bg-sky-500 p-4 flex items-center">
        <ClockIcon />
        <h1 className="text-2xl font-bold text-white">營業時間</h1>
      </header>

      <main className="m-4">
        <div className="mb-4">
             <button onClick={copyMondaySettings} className="bg-sky-500 text-white px-4 py-2 rounded-md hover:bg-sky-600 transition-colors">複製星期一資料</button>
        </div>

        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="w-full border-collapse text-center whitespace-nowrap">
          <thead className="bg-gray-800 text-white">
              <tr>
                <th className="p-2 border-r-2 border-gray-500 align-middle" rowSpan={2}>星期</th>
                <th className="p-2 border-r-2 border-gray-500 align-middle text-center">
                  <div className="flex flex-col items-center justify-center h-full gap-2 py-2">
                    <div className="flex items-center gap-2">
                      <span>內用 準備時間(分)</span>
                      <select className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm">
                        {PREP_TIME_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>外帶 準備時間(分)</span>
                      <select className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm">
                        {PREP_TIME_OPTIONS_WITH_NA.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                  </div>
                </th>
                <th colSpan={3} className="p-2 border-r-2 border-gray-500 bg-teal-700 align-middle">
                  <div className="flex items-center justify-center gap-2">
                    <span>預約自取 準備時間(分)</span>
                    <select className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm">
                      {PREP_TIME_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                </th>
                <th colSpan={3} className="p-2 border-r-2 border-gray-500 bg-green-700 align-middle">
                  <div className="flex items-center justify-center gap-2">
                    <span>店家自送 準備時間(分)</span>
                    <select className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm">
                      {PREP_TIME_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                </th>
                <th className="p-2 align-middle" rowSpan={2}>刪</th>
              </tr>
              <tr>
                <th className="p-2 border-t border-r-2 border-gray-500 border-gray-600">營業時間</th>
                <th className="p-2 border-t border-r border-gray-600 font-normal bg-teal-700">預定日期</th>
                <th className="p-2 border-t border-r border-gray-600 font-normal bg-teal-700">消費者取餐時間</th>
                <th className="p-2 border-t border-r-2 border-gray-500 font-normal bg-teal-700">點餐截止時間</th>
                <th className="p-2 border-t border-r border-gray-600 font-normal bg-green-700">預定日期</th>
                <th className="p-2 border-t border-r border-gray-600 font-normal bg-green-700">消費者取餐時間</th>
                <th className="p-2 border-t border-r-2 border-gray-500 font-normal bg-green-700">點餐截止時間</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((day, dayIndex) => {
                const isDayEven = dayIndex % 2 === 0;
                const dayBaseBg = isDayEven ? 'bg-white' : 'bg-slate-50';
                const dayHeaderBg = isDayEven ? 'bg-slate-100' : 'bg-slate-200';
                const pickupBg = isDayEven ? 'bg-teal-50' : 'bg-teal-100';
                const deliveryBg = isDayEven ? 'bg-green-50' : 'bg-green-100';

                const isAnySlotAllDay = day.operatingHours.some(op => isTimeRangeAllDay(op.timeRange));
                
                if (day.operatingHours.length === 0) {
                    return (
                        <tr key={day.day}>
                           <td className={`p-2 border-r-2 border-gray-300 align-top ${dayHeaderBg} border-t-4 border-slate-300`}>
                                <div className="flex flex-col items-center gap-2 pt-2">
                                    <div className="flex items-center gap-2">
                                        <span>{day.day}</span>
                                        <button onClick={() => addOperatingHours(dayIndex)} className="bg-sky-500 text-white rounded-full w-6 h-6 flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed" disabled={isAnySlotAllDay}>+</button>
                                    </div>
                                    <span className="text-gray-500">營業中</span>
                                    <ToggleSwitch checked={day.isOpen} onChange={(c) => toggleDayOpen(dayIndex, c)} />
                                </div>
                            </td>
                            <td colSpan={8} className={`p-4 text-center text-gray-500 ${dayBaseBg} border-t-4 border-slate-300`}>本日無營業時間</td>
                        </tr>
                    );
                }

                return day.operatingHours.map((opHour, opHourIndex) => {
                  const isFirstRowOfDay = opHourIndex === 0;
                  const topBorderClass = isFirstRowOfDay ? 'border-t-4 border-slate-300' : '';
                  const willConsolidateOnAllDay = day.operatingHours.length > 1 && !isTimeRangeAllDay(opHour.timeRange);

                  return (
                    <React.Fragment key={opHour.id}>
                        <tr className={topBorderClass}>
                            {isFirstRowOfDay && (
                                <td rowSpan={day.operatingHours.length * 2} className={`p-2 border-r-2 border-gray-300 align-top ${dayHeaderBg}`}>
                                <div className="flex flex-col items-center gap-2 pt-2">
                                    <div className="flex items-center gap-2">
                                        <span>{day.day}</span>
                                        <button onClick={() => addOperatingHours(dayIndex)} className="bg-sky-500 text-white rounded-full w-6 h-6 flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed" disabled={isAnySlotAllDay}>+</button>
                                    </div>
                                    <span className="text-gray-500">營業中</span>
                                    <ToggleSwitch checked={day.isOpen} onChange={(c) => toggleDayOpen(dayIndex, c)} />
                                </div>
                                </td>
                            )}
                            <td rowSpan={2} className={`p-1 border-r-2 border-gray-300 ${dayBaseBg} align-top`}>
                                <TimeRangeSelector 
                                    timeRange={opHour.timeRange}
                                    onTimeChange={(field, part, value) => handleUpdate(dayIndex, opHourIndex, (op) => ({ timeRange: { ...op.timeRange, [field]: { ...op.timeRange[field], [part]: value } } }))}
                                    onSetAllDayRequest={() => handleSetAllDay(dayIndex, opHour.id)}
                                    willConsolidate={willConsolidateOnAllDay}
                                />
                            </td>
                            {/* Pickup */}
                            <td className={`p-1 ${pickupBg}`}>
                                <DateRangeSelector
                                    start={opHour.pickup.dateRange.start}
                                    end={opHour.pickup.dateRange.end}
                                    onStartChange={(v) => handleUpdate(dayIndex, opHourIndex, op => ({ pickup: { ...op.pickup, dateRange: { ...op.pickup.dateRange, start: v } } }))}
                                    onEndChange={(v) => handleUpdate(dayIndex, opHourIndex, op => ({ pickup: { ...op.pickup, dateRange: { ...op.pickup.dateRange, end: v } } }))}
                                />
                            </td>
                            <td className={`p-1 ${pickupBg}`}>
                                <div className="flex items-center justify-center gap-1">
                                    <TimeRangeSelector 
                                        timeRange={opHour.pickup.pickupTime}
                                        onTimeChange={(field, part, value) => handleUpdate(dayIndex, opHourIndex, (op) => ({ pickup: { ...op.pickup, pickupTime: { ...op.pickup.pickupTime, [field]: { ...op.pickup.pickupTime[field], [part]: value } } } }))}
                                    />
                                </div>
                            </td>
                            <td className={`p-1 border-r-2 border-gray-300 ${pickupBg}`}>
                                <div className="flex justify-center">
                                    <TimeSelector 
                                        time={opHour.pickup.cutoffTime}
                                        onHourChange={(v) => handleUpdate(dayIndex, opHourIndex, op => ({ pickup: { ...op.pickup, cutoffTime: { ...op.pickup.cutoffTime, hour: v } } }))}
                                        onMinuteChange={(v) => handleUpdate(dayIndex, opHourIndex, op => ({ pickup: { ...op.pickup, cutoffTime: { ...op.pickup.cutoffTime, minute: v } } }))}
                                    />
                                </div>
                            </td>
                            {/* Delivery */}
                            <td className={`p-1 ${deliveryBg}`}>
                                <DateRangeSelector
                                    start={opHour.delivery.dateRange.start}
                                    end={opHour.delivery.dateRange.end}
                                    onStartChange={(v) => handleUpdate(dayIndex, opHourIndex, op => ({ delivery: { ...op.delivery, dateRange: { ...op.delivery.dateRange, start: v } } }))}
                                    onEndChange={(v) => handleUpdate(dayIndex, opHourIndex, op => ({ delivery: { ...op.delivery, dateRange: { ...op.delivery.dateRange, end: v } } }))}
                                />
                            </td>
                            <td className={`p-1 ${deliveryBg}`}>
                                <div className="flex items-center justify-center gap-1">
                                    <TimeRangeSelector 
                                        timeRange={opHour.delivery.pickupTime}
                                        onTimeChange={(field, part, value) => handleUpdate(dayIndex, opHourIndex, (op) => ({ delivery: { ...op.delivery, pickupTime: { ...op.delivery.pickupTime, [field]: { ...op.delivery.pickupTime[field], [part]: value } } } }))}
                                    />
                                </div>
                            </td>
                            <td className={`p-1 border-r-2 border-gray-300 ${deliveryBg}`}>
                                <div className="flex justify-center">
                                    <TimeSelector 
                                        time={opHour.delivery.cutoffTime}
                                        onHourChange={(v) => handleUpdate(dayIndex, opHourIndex, op => ({ delivery: { ...op.delivery, cutoffTime: { ...op.delivery.cutoffTime, hour: v } } }))}
                                        onMinuteChange={(v) => handleUpdate(dayIndex, opHourIndex, op => ({ delivery: { ...op.delivery, cutoffTime: { ...op.delivery.cutoffTime, minute: v } } }))}
                                    />
                                </div>
                            </td>
                            <td rowSpan={2} className={`p-2 ${dayBaseBg} align-top`}>
                            {opHourIndex > 0 && (
                                <button onClick={() => removeOperatingHours(dayIndex, opHour.id)} className="bg-red-500 hover:bg-red-600 text-white rounded-md w-8 h-8 flex items-center justify-center transition-colors">
                                <TrashIcon />
                                </button>
                            )}
                            </td>
                        </tr>
                        <tr key={`${opHour.id}-limits`}>
                             <td colSpan={3} className={`align-top border-r-2 border-gray-300 ${pickupBg}`}>
                                {editingLimit && editingLimit.dayIndex === dayIndex && editingLimit.opHourIndex === opHourIndex && editingLimit.type === 'pickup' ? (
                                    <LimitEditor
                                        initialLimits={opHour.pickup.limits}
                                        onSave={(limits) => handleSaveLimits(dayIndex, opHourIndex, 'pickup', limits)}
                                        onCancel={() => setEditingLimit(null)}
                                        constraintTimeRange={opHour.pickup.pickupTime}
                                    />
                                ) : (
                                    <LimitInfo 
                                        limits={opHour.pickup.limits}
                                        onClick={() => setEditingLimit({ dayIndex, opHourIndex, type: 'pickup' })}
                                    />
                                )}
                            </td>
                            <td colSpan={3} className={`align-top border-r-2 border-gray-300 ${deliveryBg}`}>
                                {editingLimit && editingLimit.dayIndex === dayIndex && editingLimit.opHourIndex === opHourIndex && editingLimit.type === 'delivery' ? (
                                    <LimitEditor
                                        initialLimits={opHour.delivery.limits}
                                        onSave={(limits) => handleSaveLimits(dayIndex, opHourIndex, 'delivery', limits)}
                                        onCancel={() => setEditingLimit(null)}
                                        constraintTimeRange={opHour.delivery.pickupTime}
                                    />
                                ) : (
                                    <LimitInfo 
                                        limits={opHour.delivery.limits} 
                                        onClick={() => setEditingLimit({ dayIndex, opHourIndex, type: 'delivery' })}
                                    />
                                )}
                            </td>
                        </tr>
                    </React.Fragment>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default App;
