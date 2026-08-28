import type { Locale } from "date-fns"
import { de, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

export function useDateLocale(): Locale {
  const {i18n} = useTranslation();
  return i18n.language.startsWith("de") ? de : enUS;
}