import { IntlLanding } from "@/components/intl/intl-landing";
import { intlMetadata } from "@/lib/i18n/seo";

export const metadata = intlMetadata("hy", "home");

export default function Page() {
  return <IntlLanding locale="hy" />;
}
