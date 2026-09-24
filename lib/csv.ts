function cell(value: string | number | null | undefined) {
  let text = value === null || value === undefined ? '' : String(value);
  // Spreadsheet apps may execute formulas imported from untrusted text.
  if (/^[=+\-@\t\r]/.test(text.trimStart())) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function csvRows(rows: Array<Array<string | number | null | undefined>>) {
  return `\uFEFF${rows.map((row) => row.map(cell).join(',')).join('\r\n')}\r\n`;
}
