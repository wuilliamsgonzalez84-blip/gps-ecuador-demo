'use strict';
const $=id=>document.getElementById(id);
let devices=[],vehicles=[];
function status(message){$('status').textContent=message;}
async function json(url,options){
 const response=await fetch(url,{cache:'no-store',...options});
 let data;try{data=await response.json();}catch{throw Error('Respuesta inesperada del servidor');}
 if(!response.ok)throw Error(data.error||'Error de servidor ('+response.status+')');
 return data;
}
function el(tag,className,text){
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text!==undefined)node.textContent=String(text);
 return node;
}
function render(){
 const term=$('search').value.trim().toLowerCase();
 const filtered=devices.filter(d=>d.imei.includes(term)||(d.vehicle_name||'').toLowerCase().includes(term));
 $('total').textContent=String(devices.length);
 $('active').textContent=String(devices.filter(d=>d.enabled).length);
 $('inactive').textContent=String(devices.filter(d=>!d.enabled).length);
 const root=$('devices');root.replaceChildren();
 if(!filtered.length){root.append(el('p','',devices.length?'No hay resultados para esta búsqueda.':'No hay dispositivos registrados.'));return;}
 for(const d of filtered){
  const card=el('article','device');
  const info=el('div');
  info.append(el('h2','',d.vehicle_name||'Sin vehículo asignado'));
  info.append(el('small','', 'IMEI: '+d.imei));
  info.append(el('p','state '+(d.enabled?'on':'off'),d.enabled?'Activo':'Desactivado'));
  const assignment=el('div');
  const label=el('label','','Vehículo asignado');const select=el('select');
  const selectId='device-'+d.id;select.id=selectId;label.htmlFor=selectId;
  const empty=el('option','','Sin asignar');empty.value='';select.append(empty);
  for(const v of vehicles){const option=el('option','',v.name+' (#'+v.vehicle_id+')');option.value=String(v.vehicle_id);select.append(option);}
  select.value=d.vehicle_id===null?'':String(d.vehicle_id);
  if(select.value!==(d.vehicle_id===null?'':String(d.vehicle_id))){
   const missing=el('option','','Vehículo #'+d.vehicle_id+' (no disponible)');missing.value=String(d.vehicle_id);select.append(missing);select.value=missing.value;
  }
  assignment.append(label,select);
  const actions=el('div','actions');
  const save=el('button','primary','Guardar asignación');
  save.type='button';
  save.addEventListener('click',async()=>{
   const value=select.value===''?null:Number(select.value);
   if(value===d.vehicle_id){status('No hay cambios pendientes.');return;}
   if(!window.confirm('¿Guardar la asignación del GPS '+d.imei+'?'))return;
   await update(d,{vehicle_id:value},save);
  });
  const toggle=el('button',d.enabled?'danger':'',d.enabled?'Desactivar':'Activar');
  toggle.type='button';
  toggle.addEventListener('click',async()=>{
   const action=d.enabled?'desactivar':'activar';
   if(!window.confirm('¿Seguro que deseas '+action+' el GPS '+d.imei+'?'))return;
   await update(d,{enabled:!d.enabled},toggle);
  });
  actions.append(save,toggle);card.append(info,assignment,actions);root.append(card);
 }
}
async function update(device,change,button){
 button.disabled=true;status('Guardando cambio...');
 try{
  await json('/api/admin/devices/'+encodeURIComponent(device.imei),{
   method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(change)
  });
  await load();status('Cambio guardado correctamente.');
 }catch(e){status('No se pudo guardar: '+e.message);button.disabled=false;}
}
async function load(){
 $('refresh').disabled=true;status('Consultando dispositivos...');
 try{
  const [d,v]=await Promise.all([json('/api/admin/devices'),json('/api/positions/latest')]);
  devices=d.devices;vehicles=v.vehicles.map(x=>({vehicle_id:x.vehicle_id,name:x.name}));
  render();status('Se muestran '+devices.length+' dispositivos.');
 }catch(e){status('No se pudo cargar la información: '+e.message);}
 finally{$('refresh').disabled=false;}
}
$('refresh').addEventListener('click',load);
$('search').addEventListener('input',render);
load();
