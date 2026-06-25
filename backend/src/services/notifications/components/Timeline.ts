export interface TimelineStep {
  title: string;
  description?: string;
  time?: string;
  status: 'completed' | 'current' | 'upcoming';
}

export const Timeline = (steps: TimelineStep[]) => {
  const stepsHtml = steps
    .map((step, index) => {
      const isLast = index === steps.length - 1;

      let iconColor = '#d1d5db'; // upcoming
      let textColor = '#9ca3af'; // upcoming

      if (step.status === 'completed') {
        iconColor = '#10b981'; // green
        textColor = '#111827'; // dark
      } else if (step.status === 'current') {
        iconColor = '#4f46e5'; // indigo
        textColor = '#111827'; // dark
      }

      const descHtml = step.description
        ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">${step.description}</p>`
        : '';

      const timeHtml = step.time
        ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #9ca3af;">${step.time}</p>`
        : '';

      const lineHtml = !isLast
        ? `<div style="position: absolute; left: 11px; top: 24px; bottom: -8px; width: 2px; background-color: ${step.status === 'completed' ? '#10b981' : '#e5e7eb'};"></div>`
        : '';

      return `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="position: relative; margin-bottom: ${isLast ? '0' : '16px'};">
        <tr>
          <td width="30" valign="top" style="position: relative;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background-color: ${iconColor}; display: inline-block; position: relative; z-index: 2;"></div>
            ${lineHtml}
          </td>
          <td valign="top" style="padding-bottom: 8px;">
            <h4 style="margin: 0; font-size: 16px; color: ${textColor}; font-weight: ${step.status === 'current' ? '600' : '500'};">${step.title}</h4>
            ${descHtml}
            ${timeHtml}
          </td>
        </tr>
      </table>
    `;
    })
    .join('');

  return `
    <div style="margin: 24px 0;">
      ${stepsHtml}
    </div>
  `;
};
