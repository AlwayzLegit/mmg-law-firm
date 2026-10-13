// Page bodies for the practice-area hubs that render the v3 design
// (app/(marketing)/practice-areas/[slug]). Every /practice-areas/* path in
// src/lib/v3/pages.ts must be listed — enforced by registry.test.ts.
import type { ComponentType } from "react";

import { V3CarPage } from "./pages/car";
import { V3CatastrophicPage } from "./pages/catastrophic";
import { V3MotoPage } from "./pages/moto";
import { V3RidesharePage } from "./pages/rideshare";
import { V3TruckPage } from "./pages/truck";
import { V3WrongfulPage } from "./pages/wrongful";

export const V3_PRACTICE_PAGES: Record<string, ComponentType> = {
  car: V3CarPage,
  catastrophic: V3CatastrophicPage,
  moto: V3MotoPage,
  rideshare: V3RidesharePage,
  truck: V3TruckPage,
  wrongful: V3WrongfulPage,
};
