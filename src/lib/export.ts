/** Extra export formats for prediction data (JSON, printable PDF report). */

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, payload: unknown) {
  triggerDownload(
    filename,
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" }),
  );
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export type ReportRow = Record<string, unknown>;

/**
 * Opens a clean, print-ready report in a new window. The browser print dialog
 * lets the student save it as a PDF - no server round-trip, no extra library.
 */
export function printPredictionReport(opts: {
  title: string;
  subtitle?: string;
  columns: { key: string; label: string }[];
  rows: ReportRow[];
  summary?: { label: string; value: string }[];
}) {
  const win = window.open("", "_blank", "width=980,height=760");
  if (!win) return false;
  const head = opts.columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const body = opts.rows
    .map(
      (r) =>
        `<tr>${opts.columns.map((c) => `<td>${escapeHtml(r[c.key])}</td>`).join("")}</tr>`,
    )
    .join("");
  const summary = (opts.summary ?? [])
    .map((s) => `<div class="kpi"><span>${escapeHtml(s.label)}</span><strong>${escapeHtml(s.value)}</strong></div>`)
    .join("");

  win.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>${escapeHtml(opts.title)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Georgia,'Times New Roman',serif;color:#12203a;margin:36px;}
  h1{font-size:22px;margin:0 0 4px}
  p.sub{margin:0 0 20px;color:#5a6780;font-size:13px}
  .kpis{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:22px}
  .kpi{border:1px solid #d8ddea;border-radius:8px;padding:10px 14px;min-width:130px}
  .kpi span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6b768c}
  .kpi strong{font-size:18px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #d8ddea;padding:6px 8px;text-align:left}
  th{background:#f2f4f9}
  footer{margin-top:24px;font-size:11px;color:#6b768c}
  @media print{body{margin:14mm}}
</style></head><body>
<h1>${escapeHtml(opts.title)}</h1>
<p class="sub">${escapeHtml(opts.subtitle ?? "")}</p>
<div class="kpis">${summary}</div>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
<footer>University of Cape Coast &middot; College of Distance Education &middot; SSPS &middot; generated ${new Date().toLocaleString()}</footer>
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}
