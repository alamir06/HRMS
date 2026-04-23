import React, { useEffect, useMemo, useState } from 'react';
import {
  ethiopianToGregorianDateString,
  getCurrentEthiopianDate,
  getEthiopianMonthDays,
  gregorianToEthiopian,
} from '../../utils/dateTime';

const ETH_MONTHS_EN = [
  'Meskerem',
  'Tikimt',
  'Hidar',
  'Tahsas',
  'Tir',
  'Yekatit',
  'Megabit',
  'Miazia',
  'Ginbot',
  'Sene',
  'Hamle',
  'Nehase',
  'Pagume',
];

const ETH_MONTHS_AM = [
  'መስከረም',
  'ጥቅምት',
  'ህዳር',
  'ታህሳስ',
  'ጥር',
  'የካቲት',
  'መጋቢት',
  'ሚያዝያ',
  'ግንቦት',
  'ሰኔ',
  'ሀምሌ',
  'ነሃሴ',
  'ጳጉሜ',
];

const EthiopianDateInput = ({
  value,
  onChange,
  required = false,
  disabled = false,
  language = 'en',
  minYear,
  maxYear,
}) => {
  const currentEthDate = getCurrentEthiopianDate();
  const effectiveMinYear = minYear || (currentEthDate?.year ? currentEthDate.year - 90 : 1900);
  const effectiveMaxYear = maxYear || (currentEthDate?.year ? currentEthDate.year + 10 : 2200);

  const selectedFromValue = useMemo(() => {
    if (!value) return { year: '', month: '', day: '' };
    const eth = gregorianToEthiopian(value);
    if (!eth) return { year: '', month: '', day: '' };
    return {
      year: String(eth.year),
      month: String(eth.month),
      day: String(eth.day),
    };
  }, [value]);

  const [selected, setSelected] = useState(selectedFromValue);

  useEffect(() => {
    setSelected((prev) => {
      // Preserve in-progress dropdown edits when parent temporarily holds empty value.
      if (!value) {
        const hasPartial =
          (prev.year || prev.month || prev.day) &&
          !(prev.year && prev.month && prev.day);
        if (hasPartial) {
          return prev;
        }
      }

      if (
        prev.year === selectedFromValue.year &&
        prev.month === selectedFromValue.month &&
        prev.day === selectedFromValue.day
      ) {
        return prev;
      }

      return selectedFromValue;
    });
  }, [value, selectedFromValue]);

  const months = language === 'am' ? ETH_MONTHS_AM : ETH_MONTHS_EN;

  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = effectiveMaxYear; y >= effectiveMinYear; y -= 1) {
      years.push(y);
    }
    return years;
  }, [effectiveMinYear, effectiveMaxYear]);

  const monthOptions = useMemo(() => {
    return months.map((name, index) => ({
      value: String(index + 1),
      label: name,
    }));
  }, [months]);

  const dayOptions = useMemo(() => {
    if (!selected.year || !selected.month) return [];
    const maxDays = getEthiopianMonthDays(Number(selected.year), Number(selected.month));
    const days = [];
    for (let d = 1; d <= maxDays; d += 1) {
      days.push(String(d));
    }
    return days;
  }, [selected.year, selected.month]);

  const emitGregorian = (parts) => {
    if (!parts.year || !parts.month || !parts.day) {
      onChange('');
      return;
    }

    onChange(
      ethiopianToGregorianDateString(
        Number(parts.year),
        Number(parts.month),
        Number(parts.day)
      )
    );
  };

  const updatePart = (field, nextValue) => {
    const next = {
      ...selected,
      [field]: nextValue,
    };

    if (field === 'year' || field === 'month') {
      if (next.year && next.month && next.day) {
        const maxDays = getEthiopianMonthDays(Number(next.year), Number(next.month));
        if (Number(next.day) > maxDays) {
          next.day = String(maxDays);
        }
      }
    }

    setSelected(next);

    emitGregorian(next);
  };

  return (
    <div className="ethiopian-date-input">
      <select
        className="ethiopian-date-select"
        value={selected.year}
        onChange={(e) => updatePart('year', e.target.value)}
        disabled={disabled}
        required={required}
      >
        <option value="">{language === 'am' ? 'ዓመት' : 'Year'}</option>
        {yearOptions.map((year) => (
          <option key={year} value={String(year)}>
            {year}
          </option>
        ))}
      </select>

      <select
        className="ethiopian-date-select"
        value={selected.month}
        onChange={(e) => updatePart('month', e.target.value)}
        disabled={disabled}
        required={required}
      >
        <option value="">{language === 'am' ? 'ወር' : 'Month'}</option>
        {monthOptions.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>

      <select
        className="ethiopian-date-select"
        value={selected.day}
        onChange={(e) => updatePart('day', e.target.value)}
        disabled={disabled || !selected.year || !selected.month}
        required={required}
      >
        <option value="">{language === 'am' ? 'ቀን' : 'Day'}</option>
        {dayOptions.map((day) => (
          <option key={day} value={day}>
            {day}
          </option>
        ))}
      </select>
    </div>
  );
};

export default EthiopianDateInput;
