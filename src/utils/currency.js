const DEFAULT_LOCALE = 'en-IN';
const DEFAULT_CURRENCY = 'INR';

const formatCurrency = (value, { locale = DEFAULT_LOCALE, currency = DEFAULT_CURRENCY } = {}) => {
  const numeric = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(numeric)) {
    return value ?? '0';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
};

const formatDecimal = (value, { locale = DEFAULT_LOCALE } = {}) => {
  const numeric = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(numeric)) {
    return value ?? '0';
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
};

module.exports = {
  formatCurrency,
  formatDecimal,
};
