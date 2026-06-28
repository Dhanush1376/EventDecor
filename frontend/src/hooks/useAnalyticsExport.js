import { useState } from 'react';

export function useAnalyticsExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCsv = (data, filename = 'analytics-export.csv') => {
    setIsExporting(true);
    try {
      if (!data || !data.length) {
        throw new Error('No data to export');
      }

      // Convert array of objects to CSV
      const headers = Object.keys(data[0]);
      const csvRows = [];

      // Header row
      csvRows.push(headers.join(','));

      // Data rows
      for (const row of data) {
        const values = headers.map((header) => {
          const val = row[header];
          // Escape quotes and wrap in quotes if it contains comma
          const escaped = ('' + val).replace(/"/g, '""');
          return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
      }

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
      // In a real app, use a toast notification here
      alert('Failed to export data: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToCsv, isExporting };
}
