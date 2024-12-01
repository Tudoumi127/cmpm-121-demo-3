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

const playerCoins = Array<Coin>();
const status = document.querySelector<HTMLDivElement>("#statusPanel")!;
status.innerHTML = `You have ${playerCoins.length} coin(s)`;

//map info

interface Coin {
  serial: string;
}
interface Cache {
  coordinates: Array<number>;
  coins: Array<Coin>;
}

const zoomAmount = 19;
const playerLocation = [36.989498, -122.062777];
const tileSize = 1e-4;
const neighborhoodSize = 8;
const cacheChance = 0.1;
const coinCache = new Map<string, Cache>();

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

function getKey(lat: number, lon: number) {
  const i = Math.floor(lat * 100000);
  const j = Math.floor(lon * 100000);
  return `${i}:${j}`;
}

function getCell(lat: number, lon: number): Cache {
  const key = getKey(lat, lon);
  let cache = coinCache.get(key);
  if (cache == undefined) {
    const coins = Array<Coin>();
    for (let i = 0; i < Math.floor(luck([lat, lon].toString()) * 100); i++) {
      coins.push({ serial: `${key}#${i}` });
    }
    cache = { coordinates: [lat, lon], coins: coins };
    coinCache.set(key, cache);
  }

  return cache;
}

// updates cache according to player action
function cacheUpdate(add: Array<Coin>, remove: Array<Coin>) {
  if (remove.length > 0) {
    const coin = remove.pop()!;
    console.log(coin.serial);
    add.push(coin);
    status.innerHTML = `You have ${playerCoins.length} coin(s)`;
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

  // cache popup
  rect.bindPopup(() => {
    const coinAmount = getCell(y, x).coins;

    const popup = document.createElement("div");
    popup.innerHTML = `
          <div>There are <span id="coin">${coinAmount.length}</span> coin(s) here!</div>
          <button id="collect">Collect</button>
          <button id="deposit">Deposit</button>
    `;
    popup.querySelector<HTMLButtonElement>("#collect")!
      .addEventListener(
        "click",
        () => {
          cacheUpdate(playerCoins, coinAmount);
          popup.querySelector<HTMLSpanElement>("#coin")!.innerHTML =
            `${coinAmount.length}`;
        },
      );
    popup.querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener(
        "click",
        () => {
          cacheUpdate(coinAmount, playerCoins);
          popup.querySelector<HTMLSpanElement>("#coin")!.innerHTML =
            `${coinAmount.length}`;
        },
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
