import React, { useState, useCallback } from 'react';
import { TimeSlotLimit, LimitType, TimeRange, Time } from '../types';
import TimeRangeSelector from './TimeRangeSelector';
import { TrashIcon } from '../constants';

interface LimitEditorProps {
  initialLimits: TimeSlotLimit[];
  onSave: (limits: TimeSlotLimit[]) => void;
  onCancel: () => void;
  constraintTimeRange: TimeRange;
}

interface EditorErrors {
  general: string[];
  limitErrors: Record<number, string[]>;
}

const timeToMinutes = (time: Time) => time.hour * 60 + time.minute;

const INTERVAL_OPTIONS = [
    { value: 0, label: '無' },
    { value: 15, label: '15分鐘' },
    { value: 30, label: '30分鐘' },
    { value: 45, label: '45分鐘' },
    { value: 60, label: '60分鐘' },
];

const LimitEditor: React.FC<LimitEditorProps> = ({ initialLimits, onSave, onCancel, constraintTimeRange }) => {
    const [limits, setLimits] = useState<TimeSlotLimit[]>(() => {
        const initial = JSON.parse(JSON.stringify(initialLimits));
        if (initial.length === 0) {
            return [{
                id: Date.now(),
                interval: { start: { ...constraintTimeRange.start }, end: { ...constraintTimeRange.end } },
                limitType: LimitType.ORDER,
                limitValue: 2,
                repeatingInterval: undefined,
            }];
        }
        return initial;
    });
    const [errors, setErrors] = useState<EditorErrors>({ general: [], limitErrors: {} });

    const addLimit = useCallback(() => {
        const ADD_ERROR_MSG = '時間超過取餐時間，無法新增';
        setErrors(e => ({ ...e, general: e.general.filter(msg => msg !== ADD_ERROR_MSG) }));

        setLimits(current => {
            if (current.length === 0) {
                return [{
                    id: Date.now(),
                    interval: { start: { ...constraintTimeRange.start }, end: { ...constraintTimeRange.end } },
                    limitType: LimitType.ORDER,
                    limitValue: 2,
                    repeatingInterval: undefined,
                }];
            }
            
            const sortedLimits = [...current].sort((a, b) => timeToMinutes(a.interval.start) - timeToMinutes(b.interval.start));
            const latestLimit = sortedLimits[sortedLimits.length - 1];

            if (timeToMinutes(latestLimit.interval.end) >= timeToMinutes(constraintTimeRange.end)) {
                setErrors(e => ({ ...e, general: [...e.general, ADD_ERROR_MSG] }));
                setTimeout(() => {
                    setErrors(e => ({ ...e, general: e.general.filter(msg => msg !== ADD_ERROR_MSG) }));
                }, 3000);
                return current;
            }

            const newLimit: TimeSlotLimit = {
                id: Date.now(),
                interval: { 
                    start: { ...latestLimit.interval.end },
                    end: { ...constraintTimeRange.end }
                },
                limitType: latestLimit.limitType,
                limitValue: latestLimit.limitValue,
                repeatingInterval: latestLimit.repeatingInterval,
            };
            return [...current, newLimit];
        });
    }, [constraintTimeRange]);

    const updateLimit = (id: number, changes: Partial<Omit<TimeSlotLimit, 'id' | 'interval'>>) => {
        setLimits(current => current.map(l => l.id === id ? { ...l, ...changes } : l));
        setErrors(e => {
            const newLimitErrors = { ...e.limitErrors };
            delete newLimitErrors[id];
            return { ...e, limitErrors: newLimitErrors, general: [] };
        });
    };

    const handleUpdateTime = (id: number, field: 'start' | 'end', part: 'hour' | 'minute', value: number) => {
        setLimits(current => current.map(l => {
            if (l.id === id) {
                return {
                    ...l,
                    interval: {
                        ...l.interval,
                        [field]: { ...l.interval[field], [part]: value }
                    }
                };
            }
            return l;
        }));
         setErrors(e => {
            const newLimitErrors = { ...e.limitErrors };
            delete newLimitErrors[id];
            return { ...e, limitErrors: newLimitErrors, general: [] };
        });
    };

    const removeLimit = (id: number) => {
        setLimits(current => current.filter(l => l.id !== id));
    };

    const handleSaveClick = () => {
        const newErrors: EditorErrors = { general: [], limitErrors: {} };
        const constraintStart = timeToMinutes(constraintTimeRange.start);
        const constraintEnd = timeToMinutes(constraintTimeRange.end);
        
        limits.forEach((limit) => {
            const limitErrorsForId: string[] = [];
            const limitStart = timeToMinutes(limit.interval.start);
            const limitEnd = timeToMinutes(limit.interval.end);

            if (limitStart < constraintStart || limitEnd > constraintEnd) {
                limitErrorsForId.push('時段限制區間不可大於取餐時間');
            }
            if (limitStart >= limitEnd) {
                limitErrorsForId.push('結束時間必須晚于開始時間');
            }
            if (limitErrorsForId.length > 0) {
                newErrors.limitErrors[limit.id] = limitErrorsForId;
            }
        });

        if (limits.length > 1) {
            const sortedLimits = limits
                .map((l, index) => ({
                    originalIndex: index,
                    start: timeToMinutes(l.interval.start),
                    end: timeToMinutes(l.interval.end),
                }))
                .sort((a, b) => a.start - b.start);

            for (let i = 1; i < sortedLimits.length; i++) {
                if (sortedLimits[i].start < sortedLimits[i - 1].end) {
                    newErrors.general.push(`第 ${sortedLimits[i-1].originalIndex + 1} 筆與第 ${sortedLimits[i].originalIndex + 1} 筆的時間區間重疊`);
                    break; 
                }
            }
        }

        setErrors(newErrors);

        if (newErrors.general.length > 0 || Object.keys(newErrors.limitErrors).length > 0) {
            return;
        }
        onSave(limits);
    };
    
    return (
        <div className="p-2 space-y-3 bg-gray-200 rounded">
            <div className="space-y-2 pr-2">
                {limits.map((limit) => (
                    <div key={limit.id} className="p-3 border border-gray-300 rounded bg-white space-y-2 relative">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">限制類型</label>
                                <select
                                    value={limit.limitType}
                                    onChange={(e) => updateLimit(limit.id, { limitType: e.target.value as LimitType })}
                                    className="w-full bg-white border border-gray-300 rounded-md shadow-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                                >
                                    <option value={LimitType.ORDER}>訂單數量</option>
                                    <option value={LimitType.ITEM}>商品數量</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">上限</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={limit.limitValue}
                                    onChange={(e) => updateLimit(limit.id, { limitValue: parseInt(e.target.value, 10) || 1 })}
                                    className="w-full bg-white border border-gray-300 rounded-md shadow-sm px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">間隔規則</label>
                                <select
                                    value={limit.repeatingInterval || 0}
                                    onChange={(e) => updateLimit(limit.id, { repeatingInterval: parseInt(e.target.value) === 0 ? undefined : parseInt(e.target.value) })}
                                    className="w-full bg-white border border-gray-300 rounded-md shadow-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                                >
                                    {INTERVAL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">時間區間</label>
                            <TimeRangeSelector
                                timeRange={limit.interval}
                                onTimeChange={(field, part, value) => handleUpdateTime(limit.id, field, part, value)}
                                showAllDay={false}
                            />
                        </div>
                         {errors.limitErrors[limit.id] && (
                            <div className="text-red-500 text-xs mt-1">
                                {errors.limitErrors[limit.id].map(e => <p key={e}>{e}</p>)}
                            </div>
                        )}
                        <div className="absolute top-1 right-1">
                            <button onClick={() => removeLimit(limit.id)} className="bg-red-500 hover:bg-red-600 text-white rounded-md p-1 flex items-center justify-center transition-colors">
                                <TrashIcon />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            {errors.general.length > 0 && (
                <div className="text-red-500 text-xs text-center p-2 bg-red-100 border border-red-400 rounded">
                    {errors.general.map((e, i) => <p key={i}>{e}</p>)}
                </div>
            )}

            <button onClick={addLimit} className="text-sky-600 hover:text-sky-800 font-semibold text-sm">+ 新增時段限制</button>
            
            <div className="flex justify-end items-center pt-2 gap-2">
                <button onClick={onCancel} className="bg-white text-gray-700 px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-50 text-sm">
                    取消
                </button>
                <button onClick={handleSaveClick} className="bg-sky-500 text-white px-3 py-1 rounded-md hover:bg-sky-600 text-sm">
                    儲存
                </button>
            </div>
        </div>
    );
};

export default LimitEditor;