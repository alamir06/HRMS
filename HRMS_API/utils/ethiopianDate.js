const ETHIOPIAN_EPOCH_JDN = 1724221;

const gregorianToJdn = (year, month, day) => {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;

  return (
    day
    + Math.floor((153 * m + 2) / 5)
    + 365 * y
    + Math.floor(y / 4)
    - Math.floor(y / 100)
    + Math.floor(y / 400)
    - 32045
  );
};

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

const parseGregorianDate = (value) => {
  if (!value) return null;

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

const pad2 = (value) => String(value).padStart(2, "0");

export const toEthiopianDateString = (gregorianValue) => {
  const parsed = parseGregorianDate(gregorianValue);
  if (!parsed) return null;

  const jdn = gregorianToJdn(parsed.year, parsed.month, parsed.day);
  const eth = jdnToEthiopian(jdn);

  return `${eth.year}-${pad2(eth.month)}-${pad2(eth.day)}`;
};
