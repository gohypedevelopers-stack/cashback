// Weekly working-hours editor (IST): per day, any number of HH:MM–HH:MM ranges.

import { CopyCheck, Eraser, Plus, X } from "lucide-react";
import { Button, IconButton, cx } from "../ui";
import { WEEK_DAYS, weeklyHoursTotal } from "../lib/consoleFormat";

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

const toHHMM = (minutes) => {
  const clamped = Math.max(0, Math.min(23 * 60 + 45, minutes));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
};

const nextRange = (ranges) => {
  if (!ranges.length) return ["10:00", "18:00"];
  const lastEnd = toMinutes(ranges[ranges.length - 1][1]) ?? 18 * 60;
  const start = Math.min(lastEnd + 30, 22 * 60);
  return [toHHMM(start), toHHMM(Math.min(start + 120, 23 * 60))];
};

const TIME_INPUT =
  "h-7 w-23 rounded-md border-0 bg-white px-1.5 text-xs font-medium text-slate-800 tabular-nums ring-1 ring-slate-200 ring-inset outline-none focus:ring-2 focus:ring-emerald-500";

export default function WorkingHoursEditor({ value, onChange, errors = {} }) {
  const hours = value || {};

  const setDay = (dayKey, ranges) => onChange({ ...hours, [dayKey]: ranges });

  const updateRange = (dayKey, index, position, next) => {
    const ranges = (hours[dayKey] || []).map((range, i) => {
      if (i !== index) return range;
      const copy = [...range];
      copy[position] = next;
      return copy;
    });
    setDay(dayKey, ranges);
  };

  const copyMondayToWeekdays = () => {
    const monday = (hours.mon || []).map((range) => [...range]);
    onChange({
      ...hours,
      tue: monday.map((range) => [...range]),
      wed: monday.map((range) => [...range]),
      thu: monday.map((range) => [...range]),
      fri: monday.map((range) => [...range]),
    });
  };

  const total = weeklyHoursTotal(hours);

  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-slate-200">
      <ul className="divide-y divide-slate-100">
        {WEEK_DAYS.map((day) => {
          const ranges = hours[day.key] || [];
          const error = errors[day.key];
          return (
            <li key={day.key} className={cx("px-3 py-2", error && "bg-rose-50/50")}>
              <div className="flex items-start gap-3">
                <span className="w-9 shrink-0 pt-1.5 text-xs font-semibold text-slate-600">{day.short}</span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                  {!ranges.length && <span className="pr-1 text-xs text-slate-400">Unavailable</span>}
                  {ranges.map(([start, end], index) => (
                    <div key={index} className="flex items-center gap-1 rounded-lg bg-slate-50 p-1 ring-1 ring-slate-200">
                      <input
                        type="time"
                        step={900}
                        value={start}
                        onChange={(event) => updateRange(day.key, index, 0, event.target.value)}
                        aria-label={`${day.label} hours ${index + 1} start`}
                        className={TIME_INPUT}
                      />
                      <span className="text-xs text-slate-400" aria-hidden="true">
                        –
                      </span>
                      <input
                        type="time"
                        step={900}
                        value={end}
                        onChange={(event) => updateRange(day.key, index, 1, event.target.value)}
                        aria-label={`${day.label} hours ${index + 1} end`}
                        className={TIME_INPUT}
                      />
                      <IconButton
                        size="xs"
                        label={`Remove ${day.label} hours ${index + 1}`}
                        icon={X}
                        onClick={() => setDay(day.key, ranges.filter((_, i) => i !== index))}
                      />
                    </div>
                  ))}
                  <Button size="xs" variant="ghost" icon={Plus} onClick={() => setDay(day.key, [...ranges, nextRange(ranges)])}>
                    {ranges.length ? "Add" : "Add hours"}
                  </Button>
                </div>
              </div>
              {error && <p className="mt-1 pl-12 text-[11px] font-medium text-rose-600">{error}</p>}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1">
          <Button size="xs" variant="ghost" icon={CopyCheck} onClick={copyMondayToWeekdays}>
            Copy Monday to weekdays
          </Button>
          <Button
            size="xs"
            variant="ghost"
            icon={Eraser}
            onClick={() => onChange(Object.fromEntries(WEEK_DAYS.map((day) => [day.key, []])))}
          >
            Clear all
          </Button>
        </div>
        <span className="text-[11px] font-medium text-slate-500 tabular-nums">
          {Number.isFinite(total) ? `${total % 1 ? total.toFixed(1) : total} h / week` : ""} · IST
        </span>
      </div>
    </div>
  );
}
