"use client";

import dynamic from "next/dynamic";

// Define the split inside a client boundary. Importing these controls directly
// from the shared server route also included them on its v3 pages. Keep default
// SSR enabled so legacy FAQs and forms remain present in the initial HTML.
export const Faq = dynamic(() => import("./faq").then((module) => module.Faq));
export const LeadForm = dynamic(() =>
  import("./lead-form").then((module) => module.LeadForm),
);
