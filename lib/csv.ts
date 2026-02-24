function escapeCell(value: string): string {
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(headers: string[], rows: string[][]): string {
  const allRows = [headers, ...rows];
  return `${allRows
    .map((row) => row.map((cell) => escapeCell(cell ?? "")).join(","))
    .join("\n")}\n`;
}
