import leaflet from "leaflet";
// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";
// Fix missing marker images
import "./leafletWorkaround.ts";
// Deterministic random number generator
import luck from "./luck.ts";
const APP_NAME = "GeoCoin";
//const app = document.querySelector<HTMLDivElement>("#app")!;
document.title = APP_NAME;

//map info
const zoomAmount = 19;
const playerLocation = [36.989498, -122.062777];
const tileSize = 1e-4;
const neighborhoodSize = 8;
const cacheChance = 0.1;

const map = leaflet.map("map", {
  center: playerLocation,
  zoom: zoomAmount,
  scrollWheelZoom: false,
});
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: zoomAmount,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

//player
const playerMarker = leaflet.marker(playerLocation).addTo(map);
playerMarker.bindTooltip("You are Here");

//functions
function spawnCache(y: number, x: number) {
  const bounds = leaflet.latLngBounds(
    [y, x],
    [y + tileSize, x + tileSize],
  );
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);
}
for (
  let y = playerLocation[0] - tileSize * neighborhoodSize;
  y < playerLocation[0] + tileSize * neighborhoodSize;
  y += tileSize
) {
  for (
    let x = playerLocation[1] - tileSize * neighborhoodSize;
    x < playerLocation[1] + tileSize * neighborhoodSize;
    x += tileSize
  ) {
    if (luck([y, x].toString()) <= cacheChance) {
      spawnCache(y, x);
    }
  }
}
