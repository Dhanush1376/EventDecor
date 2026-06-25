export interface MetadataGridProps {
  title?: string;
  data: Record<string, string | number | boolean>;
}

export const MetadataGrid = ({ title, data }: MetadataGridProps) => {
  const rowsHtml = Object.entries(data)
    .map(
      ([key, value]) => `
    <tr>
      <td style="padding: 8px 12px; font-weight: 600; color: #52525b; border-bottom: 1px solid #e4e4e7; width: 30%; font-size: 13px;">${key}</td>
      <td style="padding: 8px 12px; color: #18181b; border-bottom: 1px solid #e4e4e7; font-family: ui-monospace, monospace; font-size: 13px;">${value}</td>
    </tr>
  `,
    )
    .join('');

  const titleHtml = title
    ? `<h4 style="margin: 0 0 12px 0; color: #18181b; font-size: 16px;">${title}</h4>`
    : '';

  return `
    <div style="margin-bottom: 24px;">
      ${titleHtml}
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e4e4e7; border-radius: 6px; overflow: hidden; background: #fafafa;">
        ${rowsHtml}
      </table>
    </div>
  `;
};
