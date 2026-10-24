import { V3LeadForm } from "@/components/v3/v3-lead-form";
import { getDictionary } from "@/lib/i18n";
import type { RoutedLocale } from "@/lib/i18n/config";

/**
 * The site lead form with every string in the page language. Same schema,
 * Turnstile, honeypot and attribution as the English form; the locale rides
 * along so the server snapshots the consent text the visitor actually saw.
 * Field-level validation messages still come from the shared Zod schema in
 * English — TODO: localize once the schema takes a locale.
 */
export function IntlLeadForm({ locale, id }: { locale: RoutedLocale; id?: string }) {
  const t = getDictionary(locale);
  const f = t.leadForm;
  return (
    <V3LeadForm
      id={id}
      locale={locale}
      copy={f}
      submitLabel={f.submit}
      formStyle={{ display: "grid", gap: 18 }}
      rowStyle={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))", gap: 18 }}
      inputStyle={{ height: 52, border: "1px solid #d6cdbd", fontSize: 17, outline: "none" }}
      textareaStyle={{ minHeight: 128, border: "1px solid #d6cdbd", fontSize: 17 }}
      buttonStyle={{ height: 62, background: "#86662f", color: "#fff8e8", fontSize: "clamp(18px,1.5vw,22px)", whiteSpace: "normal", textAlign: "center" }}
      fields={[
        { name: "name", placeholder: f.fullName, required: true, tag: "input", row: true },
        { name: "phone", placeholder: f.phone, required: true, tag: "input", row: true },
        { name: "email", placeholder: f.email, required: false, tag: "input", row: true },
        {
          name: "type",
          placeholder: f.accidentType,
          required: false,
          tag: "select",
          row: true,
          options: [
            { value: "", label: f.accidentType },
            { value: "car", label: f.accidentTypes.car, slug: "car-accidents" },
            { value: "truck", label: f.accidentTypes.truck, slug: "truck-accidents" },
            { value: "motorcycle", label: f.accidentTypes.motorcycle, slug: "motorcycle-accidents" },
            { value: "other", label: f.accidentTypes.other },
          ],
        },
        { name: "case", placeholder: f.whatHappened, required: false, tag: "textarea" },
      ]}
    />
  );
}
