import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";
const APP_NAME = "GeoCoin";
document.title = APP_NAME;

let playerCoins = 0;
const status = document.querySelector<HTMLDivElement>("#statusPanel")!;
status.innerHTML = `You have ${playerCoins} coin(s)`;

//map info
const zoomAmount = 19;
const playerLocation = [36.989498, -122.062777];
const tileSize = 1e-4;
const neighborhoodSize = 8;
const cacheChance = 0.1;
const coinCache = new Map<string, number>();

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

// updates cache according to player action
function cacheUpdate(change: number, position: string, popup: HTMLDivElement) {
  let currentAmount = coinCache.get(position) || 0;
  if ((change > 0 && currentAmount > 0) || (change < 0 && playerCoins > 0)) {
    currentAmount -= change;
    playerCoins += change;
    coinCache.set(position, currentAmount);
    popup.querySelector<HTMLSpanElement>("#coin")!.innerHTML =
      `${currentAmount}`;
    status.innerHTML = `You have ${playerCoins} coin(s)`;
  }
}

function spawnCache(y: number, x: number) {
  // create cache area
  const bounds = leaflet.latLngBounds(
    [y, x],
    [y + tileSize, x + tileSize],
  );
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);
  const positionKey = `${y},${x}`;

  // cache popup
  rect.bindPopup(() => {
    if (!coinCache.has(positionKey)) {
      coinCache.set(positionKey, Math.floor(luck([y, x].toString()) * 100));
    }
    const coinAmount = coinCache.get(positionKey)!;
    const popup = document.createElement("div");
    popup.innerHTML = `
          <div>There are <span id="coin">${coinAmount}</span> coin(s) here!</div>
          <button id="collect">Collect</button>
          <button id="deposit">Deposit</button>
    `;
    popup.querySelector<HTMLButtonElement>("#collect")!
      .addEventListener(
        "click",
        () => cacheUpdate(1, positionKey, popup),
      );
    popup.querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener(
        "click",
        () => cacheUpdate(-1, positionKey, popup),
      );

    return popup;
  });
}

function populateNeighborhood() {
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
}

// call functions
populateNeighborhood();
