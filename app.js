const TK = "lap.track.v2",
  SK = "lap.stats.v2";
let map,
  marker,
  line,
  watch = null,
  mode = null,
  pending = null,
  points = [],
  track = load(TK, null),
  feature = null,
  len = 0,
  armed = false,
  middle = false,
  prev = null,
  first = true;
let stats = load(SK, { count: 0, pct: 0 });
const $ = (id) => document.getElementById(id),
  home = $("home"),
  mapScreen = $("mapScreen"),
  countScreen = $("countScreen"),
  permission = $("permission");
function load(k, d) {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
}
function save(k, v) {
  localStorage.setItem(k, JSON.stringify(v));
}
function screen(s) {
  home.hidden = s != "home";
  mapScreen.hidden = s != "map";
  countScreen.hidden = s != "count";
  permission.hidden = s != "permission";
  if (s == "map")
    requestAnimationFrame(() => {
      ensureMap();
      map.invalidateSize();
    });
}
function updateHome() {
  track = load(TK, null);
  $("progressCard").hidden = !track;
  $("subtitle").textContent = track
    ? "Your track is ready."
    : "Record a track to get started.";
  $("recordHint").textContent = track
    ? "Replace your saved track"
    : "Create your track";
  $("homeCount").textContent = stats.count;
  $("homePct").textContent = stats.pct.toFixed(1) + "%";
}
function ensureMap() {
  if (map) return;
  map = L.map("map", { zoomControl: false }).setView([20.5937, 78.9629], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(map);
}
function err(e) {
  if (watch !== null) (navigator.geolocation.clearWatch(watch), (watch = null));
  $("permissionText").textContent = e?.message
    ? "Location error: " + e.message
    : "Location permission is required. Allow it in browser settings and try again.";
  screen("permission");
}
function request(m) {
  pending = m;
  $("message").textContent = "";
  if (!navigator.geolocation) return err();
  navigator.geolocation.getCurrentPosition(() => begin(m), err, {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 15000,
  });
}
function begin(m) {
  if (watch !== null) navigator.geolocation.clearWatch(watch);
  mode = m;
  pending = null;
  first = true;
  ensureMap();
  clearLayers();
  if (m == "record") {
    points = [];
    $("status").textContent = "Recording track…";
    $("liveStats").hidden = true;
  } else {
    track = load(TK, null);
    if (!track) {
      screen("home");
      $("message").textContent = "Record a track first.";
      return;
    }
    build();
    drawTrack();
    $("status").textContent = "Following saved track…";
    $("liveStats").hidden = false;
    live();
  }
  screen(m == "record" ? "map" : "count");
  watch = navigator.geolocation.watchPosition(pos, err, {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 15000,
  });
}
function clearLayers() {
  [marker, line].forEach((x) => {
    if (x && map.hasLayer(x)) map.removeLayer(x);
  });
  marker = line = null;
}
function pos(p) {
  let { latitude: lat, longitude: lng, accuracy: a } = p.coords;
  if (!marker) {
    marker = L.circleMarker([lat, lng], {
      radius: 8,
      color: "#fff",
      weight: 3,
      fillColor: "#171717",
      fillOpacity: 1,
    }).addTo(map);
  } else marker.setLatLng([lat, lng]);
  if (first) {
    map.setView([lat, lng], 18);
    first = false;
  }
  if (a > 30) {
    $("status").textContent = "Waiting for better GPS…";
    return;
  }
  if (mode == "record") record(lat, lng);
  else countPos(lat, lng);
  if (mode == "record")
    $("status").textContent = "Recording • ±" + Math.round(a) + " m";
}
function meters(a, b) {
  let R = 6371000,
    r = (x) => (x * Math.PI) / 180,
    d1 = r(b.lat - a.lat),
    d2 = r(b.lng - a.lng),
    A = r(a.lat),
    B = r(b.lat),
    h =
      Math.sin(d1 / 2) ** 2 + Math.cos(A) * Math.cos(B) * Math.sin(d2 / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function record(lat, lng) {
  let p = { lat, lng, t: Date.now() };
  if (points.length && meters(points.at(-1), p) < 2) return;
  points.push(p);
  let ll = points.map((x) => [x.lat, x.lng]);
  if (!line) line = L.polyline(ll, { color: "#171717", weight: 6 }).addTo(map);
  else line.setLatLngs(ll);
}
function persist() {
  if (points.length < 2) return false;
  let d = 0;
  for (let i = 1; i < points.length; i++) d += meters(points[i - 1], points[i]);
  if (d < 10) return false;
  save(TK, points);
  stats = { count: 0, pct: 0 };
  save(SK, stats);
  track = points.slice();
  return true;
}
function build() {
  feature = turf.lineString(track.map((p) => [p.lng, p.lat]));
  feature = turf.simplify(feature, { tolerance: 0.00001, highQuality: true });
  len = turf.length(feature, { units: "kilometers" });
  armed = middle = false;
  prev = null;
}
function drawTrack() {
  line = L.polyline(
    track.map((p) => [p.lat, p.lng]),
    { color: "#171717", weight: 6, opacity: 0.8 },
  ).addTo(map);
  map.fitBounds(line.getBounds(), { padding: [35, 35] });
}
function countPos(lat, lng) {
  if (!feature || !len) return;
  let p = turf.point([lng, lat]),
    snap = turf.nearestPointOnLine(feature, p, { units: "kilometers" }),
    off = turf.distance(p, snap, { units: "kilometers" }) * 1000;
  if (off > 30) return;
  let pr = Math.max(0, Math.min(1, (snap.properties.location || 0) / len));
  stats.pct = pr * 100;
  if (pr >= 0.45 && pr <= 0.75) middle = true;
  if (middle && pr >= 0.85) armed = true;
  if (armed && prev !== null && prev >= 0.85 && pr <= 0.12) {
    stats.count++;
    armed = middle = false;
  }
  $("liveCount").textContent = stats.count;
  $("livePct").textContent = stats.pct.toFixed(1) + "%";
  prev = pr;
  save(SK, stats);
  live();
}
function live() {
  $("homeCount").textContent = stats.count;
  $("homePct").textContent = stats.pct.toFixed(1) + "%";
  $("liveCount").textContent = stats.count;
  $("livePct").textContent = stats.pct.toFixed(1) + "%";
}
$("record").onclick = () => request("record");
$("count").onclick = () =>
  track
    ? request("count")
    : ($("message").textContent =
        "Record a track before starting the counter.");
$("stop").onclick = () => {
  if (watch !== null) (navigator.geolocation.clearWatch(watch), (watch = null));
  if (mode == "record") {
    let ok = persist();
    $("message").textContent = ok
      ? "Track saved on this device."
      : "Track too short. Record a longer track.";
  } else {
    $("message").textContent = "Counting stopped.";
  }
  mode = null;
  clearLayers();
  updateHome();
  screen("home");
};

$("resetProgress").onclick = () => {
  stats = { count: 0, pct: 0 };
  save(SK, stats);
  armed = false;
  middle = false;
  prev = null;
  live();
  updateHome();
  $("message").textContent =
    "Progress reset. Your recorded track is unchanged.";
};
$("stopCounting").onclick = () => {
  if (watch !== null) (navigator.geolocation.clearWatch(watch), (watch = null));
  mode = null;
  save(SK, stats);
  updateHome();
  screen("home");
  $("message").textContent = "Counting stopped.";
};

$("retry").onclick = () => request(pending || "record");
$("back").onclick = () => screen("home");
updateHome();
live();
screen("home");
