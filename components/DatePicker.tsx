"use client";

import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { CalendarDays, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";

type DatePickerProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  testId?: string;
  required?: boolean;
  disabled?: boolean;
  inputClassName?: string;
  placeholder?: string;
  allowClear?: boolean;
};

function toLocalDate(value: string): Date | undefined {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DatePicker({
  id,
  value,
  onChange,
  testId,
  required,
  disabled,
  inputClassName,
  placeholder = "YYYY-MM-DD",
  allowClear = true,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => toLocalDate(value), [value]);
  const [viewMonth, setViewMonth] = useState<Date>(selectedDate ?? new Date());

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    strategy: "fixed",
    placement: "bottom-start",
    middleware: [
      offset(8),
      flip({
        padding: 10,
        fallbackPlacements: ["top-start", "bottom-end", "top-end"],
      }),
      shift({ padding: 10 }),
      size({
        padding: 10,
        apply({ availableWidth, availableHeight, elements }) {
          const maxWidth = Math.min(380, Math.max(280, availableWidth));
          Object.assign(elements.floating.style, {
            maxWidth: `${maxWidth}px`,
            width: `${maxWidth}px`,
            maxHeight: `${Math.max(240, availableHeight)}px`,
          });
        },
      }),
    ],
  });

  const dismiss = useDismiss(context, { outsidePress: true, escapeKey: true });
  const role = useRole(context, { role: "dialog" });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  useEffect(() => {
    if (selectedDate) {
      setViewMonth(selectedDate);
    }
  }, [selectedDate]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2" ref={refs.setReference}>
        <input
          className={inputClassName ? `flex-1 ${inputClassName}` : "flex-1"}
          data-testid={testId}
          disabled={disabled}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          value={value}
        />
        <button
          aria-expanded={open}
          aria-label="Open calendar"
          className="btn-secondary px-3"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          type="button"
        >
          <CalendarDays aria-hidden="true" size={16} />
        </button>
        {allowClear ? (
          <button
            aria-label="Clear date"
            className="btn-secondary px-3"
            disabled={disabled || !value}
            onClick={() => onChange("")}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        ) : null}
      </div>

      {open ? (
        <FloatingPortal>
          <div
            className="ss-date-picker z-[9999] rounded-2xl border bg-[color:var(--card)] p-2 shadow-xl"
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <DayPicker
              captionLayout="label"
              mode="single"
              navLayout="around"
              month={viewMonth}
              onMonthChange={setViewMonth}
              onSelect={(date) => {
                if (!date) {
                  return;
                }
                onChange(toIsoDate(date));
                setOpen(false);
              }}
              selected={selectedDate}
              showOutsideDays
              weekStartsOn={0}
            />
          </div>
        </FloatingPortal>
      ) : null}
    </div>
  );
}
