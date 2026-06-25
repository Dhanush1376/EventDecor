export const Header = (logoUrl?: string, brandName: string = 'Siri Arts & Crafts') => {
  if (logoUrl) {
    return `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
        <tr>
          <td align="center">
            <img src="${logoUrl}" alt="${brandName}" width="150" style="display: block; max-width: 150px; height: auto;" />
          </td>
        </tr>
      </table>
    `;
  }

  return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px; border-bottom: 2px solid #735c00; padding-bottom: 20px;">
      <tr>
        <td align="center" style="font-family: 'Georgia', serif; font-size: 24px; font-weight: bold; color: #735c00; letter-spacing: 2px;">
          ✦ ${brandName.toUpperCase()} ✦
        </td>
      </tr>
    </table>
  `;
};
