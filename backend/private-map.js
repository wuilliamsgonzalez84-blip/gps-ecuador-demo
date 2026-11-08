'use strict';
const map=L.map('map').setView([-1.8312,-78.1834],6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
const pins=new Map();
let first=true;
async function refresh(){
  const status=document.getElementById('status');
  try{
    const r=await fetch('/api/positions/latest',{cache:'no-store',credentials:'same-origin'});
    if(!r.ok)throw Error('HTTP '+r.status);
    const data=await r.json();
    const list=document.getElementById('vehicles');list.replaceChildren();
    const present=new Set();const bounds=[];
    for(const v of data.vehicles){
      const li=document.createElement('li');
      const valid=Number.isFinite(Number(v.latitude))&&Number.isFinite(Number(v.longitude))&&v.latitude!==null&&v.longitude!==null;
      li.textContent=v.name+(valid?' — '+new Date(v.recorded_at).toLocaleString('es-EC'):' — Sin ubicación');
      list.append(li);
      if(!valid)continue;
      const id=String(v.vehicle_id),lat=Number(v.latitude),lon=Number(v.longitude);
      present.add(id);bounds.push([lat,lon]);
      let marker=pins.get(id);
      if(!marker){marker=L.marker([lat,lon]).addTo(map);pins.set(id,marker);}
      else marker.setLatLng([lat,lon]);
      marker.bindTooltip(v.name);
    }
    for(const [id,pin] of pins)if(!present.has(id)){map.removeLayer(pin);pins.delete(id);}
    if(first&&bounds.length){map.fitBounds(bounds,{padding:[30,30],maxZoom:14});first=false;}
    status.textContent=data.vehicles.length+' vehículos registrados · '+bounds.length+' con posición · actualización cada 15 segundos';
  }catch(e){status.textContent='No se pudieron consultar las ubicaciones. Comprueba la conexión y el acceso privado.';}
}
refresh();setInterval(refresh,15000);
