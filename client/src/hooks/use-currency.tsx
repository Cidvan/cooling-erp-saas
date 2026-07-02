import { useQuery } from "@tanstack/react-query";

interface CompanySettings {
  currencyCode?: string | null;
  currencySymbol?: string | null;
  timezone?: string | null;
}

const DEFAULT_CURRENCY_SYMBOL = "₱";
const DEFAULT_LOCALE = "en-PH";

const LOCALE_BY_CURRENCY: Record<string, string> = {
  PHP: "en-PH",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  AUD: "en-AU",
  CAD: "en-CA",
  SGD: "en-SG",
  JPY: "ja-JP",
};

const DEFAULT_TIMEZONE = "Asia/Manila";

/**
 * Reads the current company's currency settings (symbol/code) and exposes a
 * `formatCurrency` helper so pages don't hardcode the ₱ symbol / en-PH locale.
 * Falls back to the existing PHP/en-PH behavior when settings are unset,
 * so this is a safe drop-in replacement for hardcoded formatting.
 *
 * Also exposes the company's configured timezone plus `formatDate`/`formatDateTime`
 * helpers that render dates in that timezone (via the native Intl API, so no
 * extra date-fns-tz dependency is needed) instead of hardcoding the browser's
 * local timezone or a fixed "Asia/Manila" assumption.
 */
export function useCurrency() {
  const { data: settings } = useQuery<CompanySettings>({
    queryKey: ["/api/company/settings"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  const symbol = settings?.currencySymbol || DEFAULT_CURRENCY_SYMBOL;
  const code = settings?.currencyCode || "PHP";
  const locale = LOCALE_BY_CURRENCY[code] || DEFAULT_LOCALE;
  const timezone = settings?.timezone || DEFAULT_TIMEZONE;

  const formatCurrency = (amount: number | string | null | undefined) => {
    const numeric = typeof amount === "string" ? parseFloat(amount) : amount ?? 0;
    const safeAmount = Number.isFinite(numeric) ? (numeric as number) : 0;
    return `${symbol}${safeAmount.toLocaleString(locale, { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (value: string | number | Date | null | undefined) => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    try {
      return new Intl.DateTimeFormat(locale, {
        timeZone: timezone,
        year: "numeric",
        month: "short",
        day: "2-digit",
      }).format(date);
    } catch {
      return date.toLocaleDateString(locale);
    }
  };

  const formatDateTime = (value: string | number | Date | null | undefined) => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    try {
      return new Intl.DateTimeFormat(locale, {
        timeZone: timezone,
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
    } catch {
      return date.toLocaleString(locale);
    }
  };

  return { symbol, code, locale, timezone, formatCurrency, formatDate, formatDateTime };
}
