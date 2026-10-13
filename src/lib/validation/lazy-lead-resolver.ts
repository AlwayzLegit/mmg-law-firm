import type { Resolver } from "react-hook-form";

import type { LeadFormValues } from "./lead-form-values";

/**
 * react-hook-form resolver for the public lead forms that loads the
 * validation stack (Zod, the lead schema, libphonenumber-js) on first use
 * instead of at page load. Those modules are ~100 KB gzipped and only matter
 * once a visitor interacts with a form, yet a lead form sits on most public
 * pages. Validation behaviour is identical to `zodResolver(LeadSchema)`.
 *
 * Call `preloadLeadValidation()` when a visitor first focuses a form so the
 * chunk is ready by the first blur.
 */
type FormResolver = Resolver<LeadFormValues, unknown, LeadFormValues>;

let loading: Promise<FormResolver> | null = null;

export function preloadLeadValidation(): Promise<FormResolver> {
  loading ??= Promise.all([import("@hookform/resolvers/zod"), import("./lead")])
    .then(
      // LeadSchema uses .preprocess() / .transform(), so zodResolver's
      // inferred input type collapses to `unknown`; narrow it to the form's
      // value shape (the call sites still type-check field values).
      ([{ zodResolver }, { LeadSchema }]) => zodResolver(LeadSchema) as unknown as FormResolver,
    )
    .catch((err: unknown) => {
      loading = null; // let the next attempt retry (e.g. after a flaky network)
      throw err;
    });
  return loading;
}

export const lazyLeadResolver: FormResolver = async (values, context, options) => {
  const resolve = await preloadLeadValidation();
  return resolve(values, context, options);
};
