// PLACEHOLDER testimonials — every entry is dummy data, marked placeholder: true.
// Hard rule from the spec (§2): never invent quotes and present them as real.
// The Voices band renders a visible disclaimer while any placeholder entries remain;
// Stage 2 adds a build-time warning. Replace with real beta quotes before launch.

export type Testimonial = {
  id: string
  quote: string
  name: string
  meta: string
  placeholder: true
}

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    quote:
      "{{TESTIMONIAL_1}} — placeholder. Example shape: The first platform that didn't waste my visa hours.",
    name: "Beta student",
    meta: "TU Berlin · placeholder",
    placeholder: true,
  },
  {
    id: "t2",
    quote:
      "{{TESTIMONIAL_2}} — placeholder. Example shape: Eight applications, three interviews — and I always knew the job was legal for my permit.",
    name: "Beta student",
    meta: "HU Berlin · placeholder",
    placeholder: true,
  },
  {
    id: "t3",
    quote:
      "{{TESTIMONIAL_3}} — placeholder. Example shape: My Anschreiben sounded German for the first time.",
    name: "Beta student",
    meta: "FU Berlin · placeholder",
    placeholder: true,
  },
  {
    id: "t4",
    quote:
      "{{TESTIMONIAL_4}} — placeholder. Example shape: Landed a Werkstudent role in under three weeks.",
    name: "Beta student",
    meta: "HTW Berlin · placeholder",
    placeholder: true,
  },
]
