// Independent GPS event processing. All distances are approximate great-circle meters.
const rad = Math.PI / 180;
export function distanceMeters(a,b){
  if(!a||!b||![a.latitude,a.longitude,b.latitude,b.longitude].every(Number.isFinite))return null;
  const dLat=(b.latitude-a.latitude)*rad,dLon=(b.longitude-a.longitude)*rad;
  const x=Math.sin(dLat/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dLon/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));
}
export function insideGeofence(position,fence){
  if(!position||!fence)return false;
  if(fence.type==='circle'){
    const d=distanceMeters(position,{latitude:fence.latitude,longitude:fence.longitude});
    return d!==null && Number.isFinite(fence.radiusMeters) && fence.radiusMeters>=0 && d<=fence.radiusMeters;
  }
  if(fence.type==='polygon'&&Array.isArray(fence.points)&&fence.points.length>=3){
    const {latitude:y,longitude:x}=position;
    if(!Number.isFinite(x)||!Number.isFinite(y))return false;
    let inside=false;
    for(let i=0,j=fence.points.length-1;i<fence.points.length;j=i++){
      const a=fence.points[i],b=fence.points[j];
      if(![a.latitude,a.longitude,b.latitude,b.longitude].every(Number.isFinite))return false;
      if((a.latitude>y)!==(b.latitude>y) && x<(b.longitude-a.longitude)*(y-a.latitude)/(b.latitude-a.latitude)+a.longitude)inside=!inside;
    }
    return inside;
  }
  return false;
}
export function geofenceTransitions(previous,current,fences=[]){
  if(!previous||!current||!Array.isArray(fences))return [];
  return fences.filter(f=>f&&f.id!==undefined).flatMap(f=>{
    const was=insideGeofence(previous,f),now=insideGeofence(current,f);
    return was===now?[]:[{type:now?'geofenceEnter':'geofenceExit',geofenceId:f.id}];
  });
}
export function tripSummary(positions,settings={}){
  const minMovementMeters=settings.minMovementMeters??200;
  const stopSeconds=settings.stopSeconds??180;
  const maxGapSeconds=settings.maxGapSeconds??3600;
  if(!Array.isArray(positions))return {distanceMeters:0,segments:0,stops:0};
  const points=positions.filter(p=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Number.isFinite(Date.parse(p.timestamp||p.fixTime))).sort((a,b)=>Date.parse(a.timestamp||a.fixTime)-Date.parse(b.timestamp||b.fixTime));
  let distance=0,segments=0,stops=0,stationarySince=null;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];
    const dt=(Date.parse(b.timestamp||b.fixTime)-Date.parse(a.timestamp||a.fixTime))/1000;
    if(dt<=0||dt>maxGapSeconds){stationarySince=null;continue;}
    const d=distanceMeters(a,b);
    if(d>=minMovementMeters){distance+=d;segments++;stationarySince=null;}
    else{
      if(stationarySince===null)stationarySince=Date.parse(a.timestamp||a.fixTime);
      if(Date.parse(b.timestamp||b.fixTime)-stationarySince>=stopSeconds*1000){stops++;stationarySince=Date.parse(b.timestamp||b.fixTime);}
    }
  }
  return {distanceMeters:Math.round(distance),segments,stops};
}
export function csvPositions(positions){
  const rows=['timestamp,latitude,longitude,speedKmh'];
  for(const p of positions||[]){
    if(!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude))continue;
    const timestamp=typeof p.timestamp==='string'?p.timestamp:p.fixTime;
    if(!Number.isFinite(Date.parse(timestamp)))continue;
    rows.push([new Date(timestamp).toISOString(),p.latitude,p.longitude,Number.isFinite(p.speedKmh)?p.speedKmh:''].join(','));
  }
  return rows.join('\n')+'\n';
}
