'use strict';
const map=L.map('map').setView([-1.8312,-78.1834],6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
const pins=new Map();
let first=true;
let routeLine=null;
async function showRoute(vehicle){
 const end=new Date();const start=new Date(end.getTime()-24*3600000);
 const url='/api/vehicles/'+encodeURIComponent(vehicle.vehicle_id)+'/history?from='+encodeURIComponent(start.toISOString())+'&to='+encodeURIComponent(end.toISOString());
 const status=document.getElementById('status');
 try{
  const response=await fetch(url,{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)throw Error('History unavailable');
  const data=await response.json();
  if(routeLine){map.removeLayer(routeLine);routeLine=null;}
  const points=data.positions.filter(p=>p.latitude!==null&&p.longitude!==null).map(p=>[Number(p.latitude),Number(p.longitude)]);
  if(points.length){routeLine=L.polyline(points,{color:'#1d77ff',weight:4}).addTo(map);map.fitBounds(routeLine.getBounds(),{padding:[30,30],maxZoom:15});}
  status.textContent=vehicle.name+': '+points.length+' posiciones en las últimas 24 horas';
 }catch{status.textContent='No se pudo cargar el recorrido de '+vehicle.name;}
}

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
      const button=document.createElement('button');
      button.type='button';button.textContent='Ver recorrido de 24 h';
      button.style.marginLeft='12px';
      button.addEventListener('click',()=>showRoute(v));
      li.append(button);list.append(li);
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
