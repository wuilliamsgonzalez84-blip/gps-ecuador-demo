'use strict';
const express=require('express');
// This router must be mounted AFTER authentication, never publicly.
module.exports=function deviceAdmin(pool){
 const router=express.Router();
 router.get('/devices',async(_req,res)=>{
  try{
   const result=await pool.query(
    'SELECT d.id,d.imei,d.enabled,d.vehicle_id,v.name AS vehicle_name FROM devices d LEFT JOIN vehicles v ON v.id=d.vehicle_id ORDER BY d.id LIMIT 100'
   );
   res.json({devices:result.rows});
  }catch(e){console.error('Device list error:',e.code);res.status(500).json({error:'Error interno'});}
 });
 router.patch('/devices/:imei',async(req,res)=>{
  const imei=String(req.params.imei);
  if(!/^\d{15}$/.test(imei))return res.status(400).json({error:'IMEI inválido'});
  const body=req.body;
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length===0||
     Object.keys(body).some(key=>!['enabled','vehicle_id'].includes(key)))
   return res.status(400).json({error:'Solo se permite enabled y vehicle_id'});
  if(Object.hasOwn(body,'enabled')&&typeof body.enabled!=='boolean')
   return res.status(400).json({error:'enabled debe ser booleano'});
  if(Object.hasOwn(body,'vehicle_id')&&body.vehicle_id!==null&&
     (!Number.isSafeInteger(body.vehicle_id)||body.vehicle_id<1))
   return res.status(400).json({error:'vehicle_id inválido'});
  const hasEnabled=Object.hasOwn(body,'enabled');
  const hasVehicle=Object.hasOwn(body,'vehicle_id');
  try{
   const result=await pool.query(
    `UPDATE devices SET
      enabled=CASE WHEN $2::boolean THEN $3::boolean ELSE enabled END,
      vehicle_id=CASE WHEN $4::boolean THEN $5::bigint ELSE vehicle_id END
     WHERE imei=$1
       AND ($5::bigint IS NULL OR EXISTS(SELECT 1 FROM vehicles WHERE id=$5::bigint))
     RETURNING id,imei,enabled,vehicle_id`,
    [imei,hasEnabled,hasEnabled?body.enabled:null,hasVehicle,hasVehicle?body.vehicle_id:null]
   );
   if(!result.rowCount)return res.status(404).json({error:'Dispositivo o vehículo no encontrado'});
   res.json({device:result.rows[0]});
  }catch(e){console.error('Device update error:',e.code);res.status(500).json({error:'Error interno'});}
 });
 return router;
};
