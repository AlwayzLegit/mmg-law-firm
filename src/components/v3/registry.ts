// Maps design page keys to their generated components.
import type { ComponentType } from "react";

import { V3AboutPage } from "./pages/about";
import { V3AfterPage } from "./pages/after";
import { V3AttorneyPage } from "./pages/attorney";
import { V3BillsPage } from "./pages/bills";
import { V3BrakePage } from "./pages/brake";
import { V3CarPage } from "./pages/car";
import { V3CargoPage } from "./pages/cargo";
import { V3CarresultsPage } from "./pages/carresults";
import { V3CatastrophicPage } from "./pages/catastrophic";
import { V3CompPage } from "./pages/comp";
import { V3ConsultPage } from "./pages/consult";
import { V3DeadlinesPage } from "./pages/deadlines";
import { V3DeliveryPage } from "./pages/delivery";
import { V3DisclosuresPage } from "./pages/disclosures";
import { V3DistractPage } from "./pages/distract";
import { V3DuiPage } from "./pages/dui";
import { V3FaqsPage } from "./pages/faqs";
import { V3FaultPage } from "./pages/fault";
import { V3FeesPage } from "./pages/fees";
import { V3GlendalePage } from "./pages/glendale";
import { V3HitrunPage } from "./pages/hitrun";
import { V3HomePage } from "./pages/home";
import { V3IntersectionPage } from "./pages/intersection";
import { V3JackknifePage } from "./pages/jackknife";
import { V3LanechangePage } from "./pages/lanechange";
import { V3LanesplitPage } from "./pages/lanesplit";
import { V3LeftturnPage } from "./pages/leftturn";
import { V3MotoPage } from "./pages/moto";
import { V3MotopropPage } from "./pages/motoprop";
import { V3MotoresultsPage } from "./pages/motoresults";
import { V3MultiPage } from "./pages/multi";
import { V3PassengerPage } from "./pages/passenger";
import { V3PrivacyPage } from "./pages/privacy";
import { V3ProcessPage } from "./pages/process";
import { V3RearendPage } from "./pages/rearend";
import { V3ResourcesPage } from "./pages/resources";
import { V3ResultsPage } from "./pages/results";
import { V3ReviewsPage } from "./pages/reviews";
import { V3RidesharePage } from "./pages/rideshare";
import { V3RolloverPage } from "./pages/rollover";
import { V3SciPage } from "./pages/sci";
import { V3SettlePage } from "./pages/settle";
import { V3TbiPage } from "./pages/tbi";
import { V3TruckPage } from "./pages/truck";
import { V3TruckevPage } from "./pages/truckev";
import { V3TruckliabPage } from "./pages/truckliab";
import { V3TruckresultsPage } from "./pages/truckresults";
import { V3UmuimPage } from "./pages/umuim";
import { V3UnderridePage } from "./pages/underride";
import { V3WrongfulPage } from "./pages/wrongful";

export const V3_COMPONENTS: Record<string, ComponentType> = {
  about: V3AboutPage,
  after: V3AfterPage,
  attorney: V3AttorneyPage,
  bills: V3BillsPage,
  brake: V3BrakePage,
  car: V3CarPage,
  cargo: V3CargoPage,
  carresults: V3CarresultsPage,
  catastrophic: V3CatastrophicPage,
  comp: V3CompPage,
  consult: V3ConsultPage,
  deadlines: V3DeadlinesPage,
  delivery: V3DeliveryPage,
  disclosures: V3DisclosuresPage,
  distract: V3DistractPage,
  dui: V3DuiPage,
  faqs: V3FaqsPage,
  fault: V3FaultPage,
  fees: V3FeesPage,
  glendale: V3GlendalePage,
  hitrun: V3HitrunPage,
  home: V3HomePage,
  intersection: V3IntersectionPage,
  jackknife: V3JackknifePage,
  lanechange: V3LanechangePage,
  lanesplit: V3LanesplitPage,
  leftturn: V3LeftturnPage,
  moto: V3MotoPage,
  motoprop: V3MotopropPage,
  motoresults: V3MotoresultsPage,
  multi: V3MultiPage,
  passenger: V3PassengerPage,
  privacy: V3PrivacyPage,
  process: V3ProcessPage,
  rearend: V3RearendPage,
  resources: V3ResourcesPage,
  results: V3ResultsPage,
  reviews: V3ReviewsPage,
  rideshare: V3RidesharePage,
  rollover: V3RolloverPage,
  sci: V3SciPage,
  settle: V3SettlePage,
  tbi: V3TbiPage,
  truck: V3TruckPage,
  truckev: V3TruckevPage,
  truckliab: V3TruckliabPage,
  truckresults: V3TruckresultsPage,
  umuim: V3UmuimPage,
  underride: V3UnderridePage,
  wrongful: V3WrongfulPage,
};
