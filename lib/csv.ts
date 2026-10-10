// A cell that needs quoting (has a comma, quote or newline) gets wrapped in quotes with its quotes doubled — the one
// escaping rule CSV actually has.
function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** rows of plain objects → a CSV string, columns as [key, header] pairs so header text can differ from the field name. */
export function toCsv<T>(rows: T[], columns: Array<[keyof T, string]>): string {
  const header = columns.map(([, label]) => csvCell(label)).join(',')
  const body = rows.map((r) => columns.map(([key]) => csvCell(r[key])).join(','))
  return [header, ...body].join('\r\n')
}

/** Triggers a browser download of the given rows as a CSV file. No dependency: a Blob + a throwaway <a download>. */
export function downloadCsv<T>(filename: string, rows: T[], columns: Array<[keyof T, string]>): void {
  const blob = new Blob([toCsv(rows, columns)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
