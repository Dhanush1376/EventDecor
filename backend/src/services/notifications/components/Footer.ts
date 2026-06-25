export const Footer = (
  brandName: string,
  supportEmail: string,
  address: string,
  socialLinks?: Record<string, string>,
) => {
  const currentYear = new Date().getFullYear();

  let socialHtml = '';
  if (socialLinks && Object.keys(socialLinks).length > 0) {
    const links = Object.entries(socialLinks)
      .map(([platform, url]) => {
        return `<a href="${url}" style="color: #6b7280; text-decoration: none; margin: 0 10px; font-size: 14px;">${platform}</a>`;
      })
      .join('');

    socialHtml = `
      <tr>
        <td align="center" style="padding-bottom: 20px;">
          ${links}
        </td>
      </tr>
    `;
  }

  return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      ${socialHtml}
      <tr>
        <td align="center" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #9ca3af; line-height: 1.5;">
          <p style="margin: 0 0 10px 0;">Need help? Contact us at <a href="mailto:${supportEmail}" style="color: #4f46e5; text-decoration: none;">${supportEmail}</a></p>
          <p style="margin: 0 0 10px 0;">${address}</p>
          <p style="margin: 0;">&copy; ${currentYear} ${brandName}. All rights reserved.</p>
        </td>
      </tr>
    </table>
  `;
};
