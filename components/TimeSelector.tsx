
import React from 'react';
import { Time } from '../types';
import { HOUR_OPTIONS, MINUTE_OPTIONS } from '../constants';

interface TimeSelectorProps {
  time: Time;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
  disabled?: boolean;
}

const CustomSelect: React.FC<{ value: number; onChange: (value: number) => void; options: { value: number; label: string }[]; disabled?: boolean }> = ({ value, onChange, options, disabled }) => (
    <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="bg-white border border-gray-300 rounded-md shadow-sm px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 disabled:bg-gray-100 disabled:text-gray-500"
        disabled={disabled}
    >
        {options.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
        ))}
    </select>
);

const TimeSelector: React.FC<TimeSelectorProps> = ({ time, onHourChange, onMinuteChange, disabled }) => {
  return (
    <div className="flex items-center gap-1">
      <CustomSelect value={time.hour} onChange={onHourChange} options={HOUR_OPTIONS} disabled={disabled} />
      <span>:</span>
      <CustomSelect value={time.minute} onChange={onMinuteChange} options={MINUTE_OPTIONS} disabled={disabled} />
    </div>
  );
};

export default TimeSelector;