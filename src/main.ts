import leaflet from "leaflet";
// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";
// Fix missing marker images
import "./leafletWorkaround.ts";
// Deterministic random number generator
//import luck from "./luck.ts";
const APP_NAME = "GeoCoin";
const app = document.querySelector<HTMLDivElement>("#app")!;
document.title = APP_NAME;

const header = document.createElement("h2");
header.innerHTML = APP_NAME;
app.append(header);
const zoomAmount = 19;

const map = leaflet.map("map", {
  center: [36.989498, -122.062777],
  zoom: zoomAmount,
  scrollWheelZoom: false,
});
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: zoomAmount,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);
