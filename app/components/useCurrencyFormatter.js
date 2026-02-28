import { useCallback } from "react";

/**
 * Map currency codes to likely locales for proper formatting.
 * Falls back to en-US for unknown currencies.
 */
const CURRENCY_LOCALES = {
  USD: "en-US",
  CAD: "en-CA",
  GBP: "en-GB",
  EUR: "de-DE",
  AUD: "en-AU",
  NZD: "en-NZ",
  JPY: "ja-JP",
  INR: "en-IN",
  BRL: "pt-BR",
  MXN: "es-MX",
  SEK: "sv-SE",
  NOK: "nb-NO",
  DKK: "da-DK",
  CHF: "de-CH",
  SGD: "en-SG",
  HKD: "en-HK",
  KRW: "ko-KR",
  PLN: "pl-PL",
  CZK: "cs-CZ",
  TRY: "tr-TR",
  ZAR: "en-ZA",
  ILS: "he-IL",
  MYR: "ms-MY",
  PHP: "en-PH",
  THB: "th-TH",
  TWD: "zh-TW",
  AED: "ar-AE",
  SAR: "ar-SA",
};

export function useCurrencyFormatter(currency = "USD") {
  return useCallback(
    (amount) =>
      new Intl.NumberFormat(CURRENCY_LOCALES[currency] || "en-US", {
        style: "currency",
        currency,
      }).format(amount),
    [currency],
  );
}
