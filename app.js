// Part 2 - GPS Recording
const map = L.map("map");
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap",
}).addTo(map);
map.setView([20.5937, 78.9629], 5);
let marker,
  line,
  recording = false,
  firstFix = true,
  route = [];
const status = document.getElementById("status");
const rb = document.getElementById("recordBtn");
const sb = document.getElementById("stopBtn");
const stb = document.getElementById("startBtn");
function dist(a, b) {
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
function draw() {
  if (line) map.removeLayer(line);
  line = L.polyline(route, { color: "#2196F3", weight: 5 }).addTo(map);
}
navigator.geolocation.watchPosition(gpsUpdate, gpsError, {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10000,
});
rb.onclick = () => {
  recording = true;
  route = [];
  if (line) {
    map.removeLayer(line);
    line = null;
  }
  rb.disabled = true;
  sb.disabled = false;
  stb.disabled = true;
  status.textContent = "Recording...";
};
sb.onclick = () => {
  recording = false;
  rb.disabled = false;
  sb.disabled = true;
  if (route.length > 10) {
    stb.disabled = false;
    status.textContent = "Route saved.";
  } else status.textContent = "Route too short.";
};
stb.onclick = () => alert("Lap detection comes in Part 3");
document.getElementById("resetBtn").onclick = () => location.reload();
