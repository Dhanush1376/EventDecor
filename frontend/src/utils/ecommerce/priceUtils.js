export const parseNumericPrice = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const clean = String(val)
    .replace(/[₹\s,]/g, '')
    .replace(/[Rr][Ss].?/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

export const formatPrice = (val) => {
  if (val === undefined || val === null) return '0';
  if (typeof val === 'number') {
    return val.toLocaleString('en-IN');
  }
  const str = String(val).trim();
  const cleanStr = str.replace(/[₹\s,]/g, '').replace(/[Rr][Ss].?/g, '');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? str : num.toLocaleString('en-IN');
};
