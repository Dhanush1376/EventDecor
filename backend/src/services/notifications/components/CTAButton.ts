type ButtonStyle = 'primary' | 'secondary' | 'danger' | 'outline';

export const CTAButton = (text: string, url: string, style: ButtonStyle = 'primary') => {
  let bgColor = '#18181b';
  let textColor = '#ffffff';
  let border = 'none';

  switch (style) {
    case 'primary':
      bgColor = '#18181b';
      textColor = '#ffffff';
      break;
    case 'secondary':
      bgColor = '#f4f4f5';
      textColor = '#18181b';
      break;
    case 'danger':
      bgColor = '#ef4444';
      textColor = '#ffffff';
      break;
    case 'outline':
      bgColor = 'transparent';
      textColor = '#18181b';
      border = '1px solid #18181b';
      break;
  }

  return `
    <table border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td align="center" bgcolor="${bgColor}" style="border-radius: 6px; border: ${border};">
          <a href="${url}" target="_blank" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 500; color: ${textColor}; text-decoration: none; display: inline-block; padding: 12px 24px; border-radius: 6px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
};
