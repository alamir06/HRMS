const ADDIS_ABABA_TIMEZONE = 'Africa/Addis_Ababa';
const ETHIOPIAN_EPOCH_JDN = 1724221;

const pad2 = (value) => String(value).padStart(2, '0');

const parseGregorianParts = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return {
      year: value.getUTCFullYear(),
      month: value.getUTCMonth() + 1,
      day: value.getUTCDate(),
    };
  }

  const str = String(value);
  const direct = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (direct) {
    return {
      year: Number(direct[1]),
      month: Number(direct[2]),
      day: Number(direct[3]),
    };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
};

const formatGregorianYmd = ({ year, month, day }) => `${year}-${pad2(month)}-${pad2(day)}`;

const gregorianToJdn = (year, month, day) => {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day
    + Math.floor((153 * m + 2) / 5)
    + 365 * y
    + Math.floor(y / 4)
    - Math.floor(y / 100)
    + Math.floor(y / 400)
    - 32045;
};

const jdnToGregorian = (jdn) => {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);

  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);

  return { year, month, day };
};

const ethiopianToJdn = (year, month, day) =>
  ETHIOPIAN_EPOCH_JDN + 365 * (year - 1) + Math.floor(year / 4) + 30 * month + day - 31;

const jdnToEthiopian = (jdn) => {
  const r = (jdn - ETHIOPIAN_EPOCH_JDN) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);

  const year =
    4 * Math.floor((jdn - ETHIOPIAN_EPOCH_JDN) / 1461)
    + Math.floor(r / 365)
    - Math.floor(r / 1460)
    + 1;
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;

  return { year, month, day };
};

export const toGregorianInputDate = (value) => {
  const parts = parseGregorianParts(value);
  if (!parts) return '';
  return formatGregorianYmd(parts);
};

export const formatAddisDate = (value, locale = 'en-US', options = {}) => {
  if (!value) return '';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString(locale, {
    timeZone: ADDIS_ABABA_TIMEZONE,
    ...options,
  });
};

export const formatAddisDateTime = (value, locale = 'en-US', options = {}) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString(locale, {
    timeZone: ADDIS_ABABA_TIMEZONE,
    ...options,
  });
};

export const getAddisNowDate = (locale = 'en-US', options = {}) => {
  return new Date().toLocaleDateString(locale, {
    timeZone: ADDIS_ABABA_TIMEZONE,
    ...options,
  });
};

export const getAddisTodayGregorian = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ADDIS_ABABA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
};

export const gregorianToEthiopian = (value) => {
  const g = parseGregorianParts(value);
  if (!g) return null;

  const jdn = gregorianToJdn(g.year, g.month, g.day);
  return jdnToEthiopian(jdn);
};

export const formatEthiopianDate = (value) => {
  const eth = gregorianToEthiopian(value);
  if (!eth) return '';
  return `${eth.year}-${pad2(eth.month)}-${pad2(eth.day)}`;
};

export const formatEthiopianDateTime = (value, locale = 'en-US', options = {}) => {
  const ethDate = formatEthiopianDate(value);
  if (!ethDate) return '';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return ethDate;

  const time = date.toLocaleTimeString(locale, {
    timeZone: ADDIS_ABABA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    ...options,
  });

  return `${ethDate} ${time}`;
};

export const ethiopianToGregorianDateString = (year, month, day) => {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  if (!y || !m || !d) return '';
  const g = jdnToGregorian(ethiopianToJdn(y, m, d));
  return formatGregorianYmd(g);
};

export const isEthiopianLeapYear = (year) => ((Number(year) + 1) % 4) === 0;

export const getEthiopianMonthDays = (year, month) => {
  const m = Number(month);
  if (!m || m < 1 || m > 13) return 30;
  if (m === 13) return isEthiopianLeapYear(year) ? 6 : 5;
  return 30;
};

export const getCurrentEthiopianDate = () => gregorianToEthiopian(new Date());
