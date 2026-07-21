// Part 3 - Lap Detection
const map = L.map("map").setView([20.5937, 78.9629], 5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap",
}).addTo(map);

const status = (t) => (document.getElementById("status").textContent = t);
const lapsEl = document.getElementById("laps");
const progEl = document.getElementById("progress");

let marker, line, watchId;
let recording = false,
  counting = false;
let route = [];
let routeLineString = null;
let routeLength = 0;
let lapCount = 0;
let lastProgress = 0;
let canCount = false;

function hav(a, b) {
  const R = 6371000,
    r = (x) => (x * Math.PI) / 180;
  const d1 = r(b.lat - a.lat),
    d2 = r(b.lng - a.lng);
  const A = r(a.lat),
    B = r(b.lat);
  const h =
    Math.sin(d1 / 2) ** 2 + Math.cos(A) * Math.cos(B) * Math.sin(d2 / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function redraw() {
  if (line) map.removeLayer(line);
  line = L.polyline(route, { color: "blue" }).addTo(map);
}

function onPos(pos) {
  const { latitude, longitude, accuracy } = pos.coords;
  const ll = [latitude, longitude];

  if (!marker) {
    marker = L.marker(ll).addTo(map);
    map.setView(ll, 18);
  } else marker.setLatLng(ll);

  if (recording) {
    if (accuracy > 20) return;
    const p = { lat: latitude, lng: longitude };
    if (route.length === 0 || hav(route.at(-1), p) > 2) {
      route.push(p);
      redraw();
    }
    status("Recording " + route.length + " pts");
  }

  if (counting && routeLineString) {
    const pt = turf.point([longitude, latitude]);
    const snapped = turf.nearestPointOnLine(routeLineString, pt, {
      units: "meters",
    });
    const dist = snapped.properties.location;
    const progress = dist / routeLength;

    progEl.textContent = (progress * 100).toFixed(1) + "%";

    // arm lap counter once user passes 80%
    if (progress > 0.8) canCount = true;

    if (canCount && progress < 0.1 && lastProgress > 0.8) {
      lapCount++;
      lapsEl.textContent = lapCount;
      canCount = false;
      status("Lap " + lapCount + " completed");
    }

    lastProgress = progress;
  }
}

function onErr(e) {
  status(e.message);
}

function startGPS() {
  watchId = navigator.geolocation.watchPosition(onPos, onErr, {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 10000,
  });
}

enableBtn.onclick = () => {
  navigator.geolocation.getCurrentPosition(
    () => {
      startGPS();
      document.getElementById("recordBtn").disabled = false;
      enableBtn.disabled = true;
      status("GPS Ready");
    },
    onErr,
    { enableHighAccuracy: true },
  );
};

recordBtn.onclick = () => {
  recording = true;
  route = [];
  if (line) {
    map.removeLayer(line);
  }
  document.getElementById("stopBtn").disabled = false;
  document.getElementById("recordBtn").disabled = true;
};

stopBtn.onclick = () => {
  recording = false;

  if (route.length < 10) {
    status("Route too short");
    return;
  }

  const coords = route.map((p) => [p.lng, p.lat]);
  routeLineString = turf.lineString(coords);

  // simplify recorded route
  routeLineString = turf.simplify(routeLineString, {
    tolerance: 0.00001,
    highQuality: true,
  });

  routeLength = turf.length(routeLineString, { units: "kilometers" }) * 1000;

  status("Route saved: " + routeLength.toFixed(1) + "m");

  document.getElementById("startBtn").disabled = false;
};

startBtn.onclick = () => {
  counting = true;
  lapCount = 0;
  lastProgress = 0;
  canCount = false;
  status("Lap counting started");
};
