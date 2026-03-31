import { atom } from "jotai";
import type { Map as MapboxMap } from "mapbox-gl";

const map = atom<MapboxMap | null>(null);

export { map };
