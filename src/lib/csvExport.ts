interface ColumnDef {
  key: string;
  label: string;
  format?: (value: any) => string;
}

export function downloadCSV(rows: Record<string, any>[], columns: ColumnDef[], filename: string) {
  const header = columns.map(c => `"${c.label}"`).join(',');
  const lines = rows.map(row =>
    columns.map(col => {
      const val = row[col.key];
      const formatted = col.format ? col.format(val) : (val ?? '');
      return `"${String(formatted).replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
