'use strict';
const express = require('express');
const crypto = require('node:crypto');
const fs = require('node:fs');

module.exports = function privateTrackingRoutes(pool, opts = {}) {
  const router = express.Router();
  const tokenFile = opts.tokenFile || '/app/.private-tracking-token';
  const allowedFile = opts.allowedFile || '/app/.private-tracking-vehicles';
  function authorized(req, res, next) {
    let secret;
    try { secret = fs.readFileSync(tokenFile, 'utf8').trim(); } catch { return res.status(503).json({error:'Tracking authorization unavailable'}); }
    const bearer = req.get('authorization') || '';
    const supplied = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
    const a = Buffer.from(secret), b = Buffer.from(supplied);
    if (!secret || a.length !== b.length || !crypto.timingSafeEqual(a,b)) return res.status(401).json({error:'Unauthorized'});
    next();
  }
  function allowedIds() {
    const text = fs.readFileSync(allowedFile, 'utf8').trim();
    const ids = text.split(',').map(x=>x.trim()).filter(Boolean).map(Number);
    if (!ids.length || ids.some(x=>!Number.isSafeInteger(x)||x<=0)) throw Error('Invalid vehicle allowlist');
    return [...new Set(ids)];
  }
  router.use((req,res,next)=>{res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');next()});
  router.use(authorized);
  router.get('/vehicles', async (req,res)=>{
    try {
      const r=await pool.query('SELECT id,name,created_at FROM public.vehicles WHERE id = ANY($1::bigint[]) ORDER BY id',[allowedIds()]);
      res.json({vehicles:r.rows.map(v=>({id:Number(v.id),name:v.name,createdAt:v.created_at}))});
    } catch(e) {console.error('Private vehicles query error',e.code||e.message);res.status(503).json({error:'Database unavailable'})}
  });
  router.get('/positions',async(req,res)=>{
    try {
      const r=await pool.query('SELECT DISTINCT ON (vehicle_id) vehicle_id,latitude,longitude,recorded_at FROM public.positions WHERE vehicle_id = ANY($1::bigint[]) ORDER BY vehicle_id,recorded_at DESC',[allowedIds()]);
      res.json({positions:r.rows.map(p=>({vehicleId:Number(p.vehicle_id),latitude:p.latitude,longitude:p.longitude,recordedAt:p.recorded_at}))});
    } catch(e) {console.error('Private positions query error',e.code||e.message);res.status(503).json({error:'Database unavailable'})}
  });
  router.get('/history',async(req,res)=>{
    const vehicleId=Number(req.query.vehicleId);
    if(!Number.isSafeInteger(vehicleId)||vehicleId<=0) return res.status(400).json({error:'Invalid vehicleId'});
    let ids;try {ids=allowedIds()}catch{return res.status(503).json({error:'Authorization configuration unavailable'})}
    if(!ids.includes(vehicleId)) return res.status(403).json({error:'Vehicle not permitted'});
    const from=String(req.query.from||''),to=String(req.query.to||'');
    const start=Date.parse(from),end=Date.parse(to);
    if(!/^\d{4}-\d{2}-\d{2}T/.test(from)||!/^\d{4}-\d{2}-\d{2}T/.test(to)||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>31*86400000) return res.status(400).json({error:'Invalid date range (max 31 days)'});
    try {
      const r=await pool.query('SELECT latitude,longitude,recorded_at FROM public.positions WHERE vehicle_id=$1 AND recorded_at >= $2 AND recorded_at < $3 ORDER BY recorded_at DESC LIMIT 500',[vehicleId,new Date(start),new Date(end)]);
      res.json({vehicleId,positions:r.rows.map(p=>({latitude:p.latitude,longitude:p.longitude,recordedAt:p.recorded_at})),limit:500});
    } catch(e) {console.error('Private history query error',e.code||e.message);res.status(503).json({error:'Database unavailable'})}
  });
  return router;
};
