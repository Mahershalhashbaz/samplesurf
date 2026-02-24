export function parseDateOnly(input: string | null | undefined): Date | null {
  if (!input) {
    return null;
  }

  const yyyyMmDd = /^(\d{4})-(\d{2})-(\d{2})$/;
  const mmDdYyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

  const isoMatch = input.match(yyyyMmDd);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const usMatch = input.match(mmDdYyyy);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const fallback = new Date(input);
  if (Number.isNaN(fallback.getTime())) {
    return null;
  }
  return new Date(Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), fallback.getUTCDate()));
}

export function toDateInputValue(date: Date | null | undefined): string {
  if (!date) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

export function yearRangeUtc(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

export function yearOf(date: Date | null | undefined): number | null {
  if (!date) {
    return null;
  }
  return date.getUTCFullYear();
}

export function todayDateInput(): string {
  const local = new Date();
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}
