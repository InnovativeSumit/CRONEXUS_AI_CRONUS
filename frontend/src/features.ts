import type { ReactNode } from "react";
import { createElement } from "react";
import type { Messages } from "./i18n/en";
import { CalendarArt, CropArt, IrrigationArt, LeafArt, ProductsArt, ResourcesArt, SoilArt, WeatherArt } from "./components/Illustrations";

export interface Feature {
  id: string;
  path: string;
  /** true → the backend requires a signed-in user for this feature */
  auth: boolean;
  /** key into components/icons FEATURE_ICON */
  icon: string;
  title: keyof Messages;
  desc: keyof Messages;
  /** longer description + three bullet points used by the split-layout feature sections */
  long: keyof Messages;
  points: [keyof Messages, keyof Messages, keyof Messages];
  art: () => ReactNode;
}
const art = (C: () => ReactNode) => () => createElement(C);

/** Single source of truth for the header menu, landing feature sections, footer and the logged-in home. */
export const FEATURES: Feature[] = [
  { id: "leaf", path: "/leaf-disease", auth: true, icon: "leaf", title: "nf_leaf_t", desc: "nf_leaf_d", long: "nf_leaf_l", points: ["nf_leaf_p1", "nf_leaf_p2", "nf_leaf_p3"], art: art(LeafArt) },
  { id: "crop", path: "/advisory", auth: true, icon: "crop", title: "nf_crop_t", desc: "nf_crop_d", long: "nf_crop_l", points: ["nf_crop_p1", "nf_crop_p2", "nf_crop_p3"], art: art(CropArt) },
  { id: "weather", path: "/weather", auth: false, icon: "weather", title: "nf_weather_t", desc: "nf_weather_d", long: "nf_weather_l", points: ["nf_weather_p1", "nf_weather_p2", "nf_weather_p3"], art: art(WeatherArt) },
  { id: "calendar", path: "/calendar", auth: true, icon: "calendar", title: "nf_calendar_t", desc: "nf_calendar_d", long: "nf_calendar_l", points: ["nf_calendar_p1", "nf_calendar_p2", "nf_calendar_p3"], art: art(CalendarArt) },
  { id: "products", path: "/products", auth: false, icon: "products", title: "nf_products_t", desc: "nf_products_d", long: "nf_products_l", points: ["nf_products_p1", "nf_products_p2", "nf_products_p3"], art: art(ProductsArt) },
  { id: "soil", path: "/soil", auth: true, icon: "soil", title: "nf_soil_t", desc: "nf_soil_d", long: "nf_soil_l", points: ["nf_soil_p1", "nf_soil_p2", "nf_soil_p3"], art: art(SoilArt) },
  { id: "water", path: "/water", auth: false, icon: "water", title: "nf_water_t", desc: "nf_water_d", long: "nf_water_l", points: ["nf_water_p1", "nf_water_p2", "nf_water_p3"], art: art(IrrigationArt) },
  { id: "resources", path: "/resources", auth: false, icon: "resources", title: "nf_resources_t", desc: "nf_resources_d", long: "nf_resources_l", points: ["nf_resources_p1", "nf_resources_p2", "nf_resources_p3"], art: art(ResourcesArt) },
];
