export const TESTIMONIAL_SOURCES = [
  "Google",
  "Yelp",
  "Avvo",
  "Direct",
  "Other",
] as const;

export type TestimonialSource = (typeof TESTIMONIAL_SOURCES)[number];
