import React from 'react';

interface Column<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyText?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyText = 'No data available',
}: TableProps<T>) {
  return (
    <div className="w-full overflow-x-auto border border-kms-slate-200 rounded-lg bg-white shadow-2xs">
      <table className="w-full min-w-[640px] text-left text-xs border-collapse">
        <thead>
          <tr className="bg-kms-slate-100 border-b border-kms-slate-300 text-kms-slate-700 font-bold uppercase tracking-wider text-[11px]">
            {columns.map((col, idx) => (
              <th key={idx} className={`p-3 font-semibold ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-kms-slate-200">
          {data.length > 0 ? (
            data.map((item) => (
              <tr key={keyExtractor(item)} className="hover:bg-kms-slate-50 transition-colors">
                {columns.map((col, idx) => (
                  <td key={idx} className={`p-3 text-kms-slate-800 ${col.className || ''}`}>
                    {col.accessor(item)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="p-8 text-center text-kms-slate-500 font-medium">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
