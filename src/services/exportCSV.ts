export function exportCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.join(",")).join("\n");

  const blob = new Blob([csv]);
  const a = document.createElement("a");

  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}