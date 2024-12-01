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

const localPlayerData = localStorage.getItem("playerCoin");
let playerCoins: Array<Coin> = localPlayerData
  ? JSON.parse(localPlayerData)
  : [];
const status = document.querySelector<HTMLDivElement>("#statusPanel")!;
status.innerHTML = `You have ${playerCoins.length} coin(s)`;

//map info
interface Coin {
  serial: string;
}

interface Memento<T> {
  toMemento(): T;
  fromMemento(memento: T): void;
}
class Cache implements Memento<string> {
  coins: Array<Coin>;
  constructor(coins: Array<Coin>) {
    this.coins = coins;
  }
  toMemento() {
    return JSON.stringify({ coins: this.coins });
  }
  fromMemento(memento: string) {
    const state = JSON.parse(memento);
    this.coins = state.coins;
  }
}

const zoomAmount = 19;
const origin = [36.989498, -122.062777];
let playerLocation = origin;
const savedLocation = localStorage.getItem("playerLocation");
if (savedLocation) {
  playerLocation = JSON.parse(savedLocation);
}
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

let cacheLayer = leaflet.layerGroup().addTo(map);

//player
const playerMarker = leaflet.marker(playerLocation).addTo(map);
playerMarker.bindTooltip("You are Here");

function playerController(dir: string, lat: number, lon: number) {
  const button = document.querySelector<HTMLDivElement>(dir)!;
  button.addEventListener("click", () => {
    for (const [key, cache] of coinCache.entries()) {
      saveCache(key, cache);
    }
    playerLocation[0] += lat;
    playerLocation[1] += lon;
    localStorage.setItem("playerLocation", JSON.stringify(playerLocation));
    resetMap();
  });
}
playerController("#north", tileSize, 0);
playerController("#east", 0, tileSize);
playerController("#south", -tileSize, 0);
playerController("#west", 0, -tileSize);

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
    cache = new Cache(coins);
    coinCache.set(key, cache);
  }

  return cache;
}

function saveCache(key: string, cache: Cache) {
  localStorage.setItem(key, cache.toMemento());
}

function restoreCache(key: string) {
  const memento = localStorage.getItem(key);
  if (memento) {
    const cache = new Cache([]);
    cache.fromMemento(memento);
    coinCache.set(key, cache);
  }
}

// updates cache according to player action
function cacheUpdate(add: Array<Coin>, remove: Array<Coin>) {
  if (remove.length > 0) {
    const coin = remove.pop()!;
    console.log(coin.serial);
    add.push(coin);
    status.innerHTML = `You have ${playerCoins.length} coin(s)`;
    localStorage.setItem("playerCoin", JSON.stringify(playerCoins));
  }
}

function resetMap() {
  playerMarker.setLatLng(playerLocation);
  map.removeLayer(cacheLayer);
  coinCache.clear();
  populateNeighborhood();
}

function spawnCache(y: number, x: number) {
  // create cache area
  const bounds = leaflet.latLngBounds(
    [y, x],
    [y + tileSize, x + tileSize],
  );
  const rect = leaflet.rectangle(bounds);
  rect.addTo(cacheLayer);

  // cache popup
  rect.bindPopup(() => {
    restoreCache(getKey(y, x));
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
          saveCache(getKey(y, x), getCell(y, x));
          popup.querySelector<HTMLSpanElement>("#coin")!.innerHTML =
            `${coinAmount.length}`;
        },
      );
    popup.querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener(
        "click",
        () => {
          cacheUpdate(coinAmount, playerCoins);
          saveCache(getKey(y, x), getCell(y, x));
          popup.querySelector<HTMLSpanElement>("#coin")!.innerHTML =
            `${coinAmount.length}`;
        },
      );

    return popup;
  });
}

function populateNeighborhood() {
  cacheLayer = leaflet.layerGroup().addTo(map);
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

const reset = document.querySelector<HTMLDivElement>("#reset")!;
reset.addEventListener("click", () => {
  localStorage.clear();
  playerCoins = [];
  status.innerHTML = `You have 0 coin(s)`;
  playerLocation = origin;
  resetMap();
});

// call functions
populateNeighborhood();
