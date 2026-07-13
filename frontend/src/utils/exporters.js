export function currency(value) {
  const n = Number(value || 0)
  return n.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 })
}

export function exportCsv(filename, rows) {
  const safeRows = Array.isArray(rows) ? rows : []
  if (!safeRows.length) return false
  const headers = Object.keys(safeRows[0])
  const csv = [
    headers.join(';'),
    ...safeRows.map(row => headers.map(key => {
      const value = row[key] == null ? '' : String(row[key]).replace(/"/g, '""')
      return `"${value}"`
    }).join(';'))
  ].join('\n')
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return true
}

export function exportHtmlPdf(title, html) {
  const win = window.open('', '_blank', 'width=1100,height=800')
  if (!win) return false
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;color:#111827} h1{font-size:20px;margin:0 0 14px}
      table{width:100%;border-collapse:collapse;font-size:12px} th,td{border:1px solid #d1d5db;padding:7px;text-align:left}
      th{background:#eef6ff}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}
      .box{border:1px solid #d1d5db;border-radius:8px;padding:10px}.muted{color:#6b7280;font-size:11px}
    </style></head><body>${html}</body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 250)
  return true
}

export function normaliseReportRows(rows = []) {
  return rows.map(row => ({ ...row }))
}
