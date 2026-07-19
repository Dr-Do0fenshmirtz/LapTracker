// Rewritten Part 2
const map=L.map("map").setView([20.5937,78.9629],5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
 attribution:"© OpenStreetMap",maxZoom:19
}).addTo(map);

let watchId=null;
let marker=null;
let recording=false;
let route=[];
let line=null;

const statusEl=document.getElementById("status");
const enableBtn=document.getElementById("enableBtn");
const recordBtn=document.getElementById("recordBtn");
const stopBtn=document.getElementById("stopBtn");
const startBtn=document.getElementById("startBtn");
const resetBtn=document.getElementById("resetBtn");

function status(msg){statusEl.textContent=msg;}

function distance(a,b){
 const R=6371000;
 const r=d=>d*Math.PI/180;
 const dLat=r(b.lat-a.lat);
 const dLng=r(b.lng-a.lng);
 const A=r(a.lat),B=r(b.lat);
 const h=Math.sin(dLat/2)**2+Math.cos(A)*Math.cos(B)*Math.sin(dLng/2)**2;
 return 2*R*Math.asin(Math.sqrt(h));
}

function redraw(){
 if(line) map.removeLayer(line);
 line=L.polyline(route,{color:"blue",weight:5}).addTo(map);
}

function onPosition(pos){
 const {latitude,longitude,accuracy}=pos.coords;
 const ll=[latitude,longitude];

 if(!marker){
   marker=L.marker(ll).addTo(map);
   map.setView(ll,18);
 }else{
   marker.setLatLng(ll);
 }

 if(!recording){
   status("GPS Ready ("+accuracy.toFixed(1)+"m)");
   return;
 }

 if(accuracy>20){
   status("Poor GPS accuracy...");
   return;
 }

 const p={lat:latitude,lng:longitude};

 if(route.length===0 || distance(route.at(-1),p)>2){
    route.push(p);
    redraw();
 }

 status("Recording: "+route.length+" points");
}

function onError(err){
 status("GPS Error: "+err.message);
}

function startGPS(){
 if(watchId!==null) return;

 watchId=navigator.geolocation.watchPosition(
   onPosition,
   onError,
   {
     enableHighAccuracy:true,
     maximumAge:0,
     timeout:10000
   }
 );

 recordBtn.disabled=false;
 enableBtn.disabled=true;
 status("Location enabled.");
}

enableBtn.onclick=()=>{
 if(!navigator.geolocation){
   alert("Geolocation not supported");
   return;
 }

 navigator.geolocation.getCurrentPosition(
   ()=>{
      startGPS();
   },
   onError,
   {enableHighAccuracy:true}
 );
};

recordBtn.onclick=()=>{
 recording=true;
 route=[];
 if(line){map.removeLayer(line);line=null;}
 recordBtn.disabled=true;
 stopBtn.disabled=false;
 status("Recording route...");
};

stopBtn.onclick=()=>{
 recording=false;
 stopBtn.disabled=true;
 recordBtn.disabled=false;

 if(route.length>10){
   startBtn.disabled=false;
   status("Route saved.");
 }else{
   status("Route too short.");
 }
};

startBtn.onclick=()=>{
 alert("Lap counting will be implemented in Part 3.");
};

resetBtn.onclick=()=>{
 location.reload();
};
