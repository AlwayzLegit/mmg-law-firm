// Page bodies for the root-level guides served by app/(marketing)/[guide].
// Kept separate from the other v3 pages so a route only bundles the page
// bodies (and their client islands, e.g. the lead form) it can render.
// Must list every key in V3_GUIDES — enforced by registry.test.ts.
import type { ComponentType } from "react";

import { V3AboutPage } from "./pages/about";
import { V3AfterPage } from "./pages/after";
import { V3BillsPage } from "./pages/bills";
import { V3BrakePage } from "./pages/brake";
import { V3CargoPage } from "./pages/cargo";
import { V3CarresultsPage } from "./pages/carresults";
import { V3CompPage } from "./pages/comp";
import { V3DeadlinesPage } from "./pages/deadlines";
import { V3DeliveryPage } from "./pages/delivery";
import { V3DistractPage } from "./pages/distract";
import { V3DuiPage } from "./pages/dui";
import { V3FaqsPage } from "./pages/faqs";
import { V3FaultPage } from "./pages/fault";
import { V3FeesPage } from "./pages/fees";
import { V3HitrunPage } from "./pages/hitrun";
import { V3IntersectionPage } from "./pages/intersection";
import { V3JackknifePage } from "./pages/jackknife";
import { V3LanechangePage } from "./pages/lanechange";
import { V3LanesplitPage } from "./pages/lanesplit";
import { V3LeftturnPage } from "./pages/leftturn";
import { V3MotopropPage } from "./pages/motoprop";
import { V3MotoresultsPage } from "./pages/motoresults";
import { V3MultiPage } from "./pages/multi";
import { V3PassengerPage } from "./pages/passenger";
import { V3ProcessPage } from "./pages/process";
import { V3RearendPage } from "./pages/rearend";
import { V3ResourcesPage } from "./pages/resources";
import { V3RolloverPage } from "./pages/rollover";
import { V3SciPage } from "./pages/sci";
import { V3SettlePage } from "./pages/settle";
import { V3TbiPage } from "./pages/tbi";
import { V3TruckevPage } from "./pages/truckev";
import { V3TruckliabPage } from "./pages/truckliab";
import { V3TruckresultsPage } from "./pages/truckresults";
import { V3UmuimPage } from "./pages/umuim";
import { V3UnderridePage } from "./pages/underride";

export const V3_GUIDE_PAGES: Record<string, ComponentType> = {
  about: V3AboutPage,
  after: V3AfterPage,
  bills: V3BillsPage,
  brake: V3BrakePage,
  cargo: V3CargoPage,
  carresults: V3CarresultsPage,
  comp: V3CompPage,
  deadlines: V3DeadlinesPage,
  delivery: V3DeliveryPage,
  distract: V3DistractPage,
  dui: V3DuiPage,
  faqs: V3FaqsPage,
  fault: V3FaultPage,
  fees: V3FeesPage,
  hitrun: V3HitrunPage,
  intersection: V3IntersectionPage,
  jackknife: V3JackknifePage,
  lanechange: V3LanechangePage,
  lanesplit: V3LanesplitPage,
  leftturn: V3LeftturnPage,
  motoprop: V3MotopropPage,
  motoresults: V3MotoresultsPage,
  multi: V3MultiPage,
  passenger: V3PassengerPage,
  process: V3ProcessPage,
  rearend: V3RearendPage,
  resources: V3ResourcesPage,
  rollover: V3RolloverPage,
  sci: V3SciPage,
  settle: V3SettlePage,
  tbi: V3TbiPage,
  truckev: V3TruckevPage,
  truckliab: V3TruckliabPage,
  truckresults: V3TruckresultsPage,
  umuim: V3UmuimPage,
  underride: V3UnderridePage,
};
