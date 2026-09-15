/**
 * numberToWords.ts
 * Pure formal number-to-words parser supporting Lakh/Crore and Million systems.
 * Zero hardcoded "RUPEES" or "ONLY" — returns pure grammatical text.
 */

const ONES = [
  '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
  'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
  'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
];

const TENS = [
  '', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY',
];

function convertThreeDigit(num: number): string {
  let str = '';
  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + ' HUNDRED ';
    num %= 100;
  }
  if (num >= 20) {
    str += TENS[Math.floor(num / 10)] + ' ';
    num %= 10;
  }
  if (num > 0) {
    str += ONES[num] + ' ';
  }
  return str.trim();
}

/**
 * Converts a non-negative integer to words in Indian/Pakistani banking notation (Crore, Lakh, Thousand, Hundred).
 */
export function numberToWordsLakh(num: number): string {
  if (num === 0) return 'ZERO';

  const parts: string[] = [];

  const crore = Math.floor(num / 10000000);
  num %= 10000000;

  const lakh = Math.floor(num / 100000);
  num %= 100000;

  const thousand = Math.floor(num / 1000);
  num %= 1000;

  const remainder = num;

  if (crore > 0) {
    parts.push(`${convertThreeDigit(crore)} CRORE`);
  }
  if (lakh > 0) {
    parts.push(`${convertThreeDigit(lakh)} LAKH`);
  }
  if (thousand > 0) {
    parts.push(`${convertThreeDigit(thousand)} THOUSAND`);
  }
  if (remainder > 0) {
    parts.push(convertThreeDigit(remainder));
  }

  return parts.join(' ').trim();
}

/**
 * Converts a non-negative integer to words in International banking notation (Billion, Million, Thousand, Hundred).
 */
export function numberToWordsMillion(num: number): string {
  if (num === 0) return 'ZERO';

  const parts: string[] = [];

  const billion = Math.floor(num / 1000000000);
  num %= 1000000000;

  const million = Math.floor(num / 1000000);
  num %= 1000000;

  const thousand = Math.floor(num / 1000);
  num %= 1000;

  const remainder = num;

  if (billion > 0) {
    parts.push(`${convertThreeDigit(billion)} BILLION`);
  }
  if (million > 0) {
    parts.push(`${convertThreeDigit(million)} MILLION`);
  }
  if (thousand > 0) {
    parts.push(`${convertThreeDigit(thousand)} THOUSAND`);
  }
  if (remainder > 0) {
    parts.push(convertThreeDigit(remainder));
  }

  return parts.join(' ').trim();
}

export interface AmountWordOptions {
  prefix?: string;
  suffix?: string;
  currencyUnit?: string;
  fractionUnit?: string;
}

/**
 * Formats a numeric check amount into pure formal words without hardcoded assumptions.
 * Example: 465464 -> "FOUR LAKH SIXTY FIVE THOUSAND FOUR HUNDRED SIXTY FOUR"
 */
export function formatCheckAmountInWords(
  amountInput: number | string,
  system: 'lakh' | 'million' = 'lakh',
  options: AmountWordOptions = {}
): string {
  const cleanStr = String(amountInput).replace(/,/g, '').trim();
  const numVal = parseFloat(cleanStr);

  if (isNaN(numVal) || numVal <= 0) {
    return '';
  }

  const integerPart = Math.floor(numVal);
  const decimalPart = Math.round((numVal - integerPart) * 100);

  const wordConverter = system === 'million' ? numberToWordsMillion : numberToWordsLakh;
  const mainWords = wordConverter(integerPart);

  let result = mainWords;

  if (options.currencyUnit) {
    result = `${options.currencyUnit} ${result}`;
  }

  if (decimalPart > 0) {
    const fractionWords = convertThreeDigit(decimalPart);
    const fractionLabel = options.fractionUnit || '';
    result = `${result} AND ${fractionWords}${fractionLabel ? ` ${fractionLabel}` : ''}`;
  }

  if (options.prefix) {
    result = `${options.prefix.trim()} ${result}`;
  }

  if (options.suffix) {
    result = `${result} ${options.suffix.trim()}`;
  }

  return result.trim();
}

/**
 * Formats a numeric amount with standard grouping commas and ensures .00 at the end.
 * Example: 500325 -> 500,325.00
 */
export function formatCurrencyWithCommas(raw: string | number): string {
  const clean = String(raw).replace(/[^0-9.]/g, '');
  if (!clean) return '';

  const parts = clean.split('.');
  const integerPart = parts[0] || '0';
  const decimalPart = parts[1];

  const intFormatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (decimalPart === undefined) {
    return `${intFormatted}.00`;
  }
  if (decimalPart.length === 0) {
    return `${intFormatted}.00`;
  }
  if (decimalPart.length === 1) {
    return `${intFormatted}.${decimalPart}0`;
  }
  return `${intFormatted}.${decimalPart.slice(0, 2)}`;
}
