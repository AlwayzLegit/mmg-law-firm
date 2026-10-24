import { IntlContact } from "@/components/intl/intl-contact";
import { intlMetadata } from "@/lib/i18n/seo";

export const metadata = intlMetadata("ru", "contact");

export default function Page() {
  return <IntlContact locale="ru" />;
}
