'use strict';
const express=require('express');
const crypto=require('node:crypto');
const {promisify}=require('node:util');
const scrypt=promisify(crypto.scrypt);
const router=express.Router();
router.use((req,res,next)=>{res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');next()});
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
async function verify(password,stored){const [salt,expected]=String(stored).split(':');if(!salt||!expected||!/^[a-f0-9]{128}$/.test(expected))return false;const actual=await scrypt(password,Buffer.from(salt,'hex'),64);return crypto.timingSafeEqual(actual,Buffer.from(expected,'hex'))}
function createCustomerRoutes(db){
  router.post('/login',express.json({limit:'4kb'}),async(req,res)=>{
    const {email,password}=req.body||{};
    if(typeof email!=='string'||email.length>254||typeof password!=='string'||password.length>1024)return res.status(400).json({error:'Invalid credentials'});
    try{
      const r=await db.query('SELECT id,password_hash FROM customer_accounts WHERE email=$1 AND active=true',[email.trim().toLowerCase()]);
      if(!r.rows.length||!await verify(password,r.rows[0].password_hash))return res.status(401).json({error:'Invalid credentials'});
      const token=crypto.randomBytes(32).toString('hex');
      await db.query("INSERT INTO customer_sessions(customer_id,token_hash,expires_at) VALUES($1,$2,now()+interval '7 days')",[r.rows[0].id,hash(token)]);
      return res.json({token,expiresInSeconds:604800});
    }catch(e){console.error('Customer login error',e.code||e.message);return res.status(503).json({error:'Service unavailable'})}
  });
  async function auth(req,res,next){
    const h=req.get('authorization')||'';
    if(!/^Bearer [a-f0-9]{64}$/.test(h))return res.status(401).json({error:'Unauthorized'});
    try{
      const r=await db.query('SELECT s.id,s.customer_id FROM customer_sessions s JOIN customer_accounts a ON a.id=s.customer_id WHERE s.token_hash=$1 AND s.expires_at>now() AND s.revoked_at IS NULL AND a.active=true',[hash(h.slice(7))]);
      if(!r.rows.length)return res.status(401).json({error:'Unauthorized'});
      req.customerId=r.rows[0].customer_id;req.sessionId=r.rows[0].id;next();
    }catch(e){console.error('Session lookup error',e.code||e.message);res.status(503).json({error:'Service unavailable'})}
  }
  router.use(auth);
  router.post('/logout',async(req,res)=>{try{await db.query('UPDATE customer_sessions SET revoked_at=now() WHERE id=$1 AND customer_id=$2',[req.sessionId,req.customerId]);res.status(204).end()}catch{res.status(503).json({error:'Service unavailable'})}});
  router.get('/vehicles',async(req,res)=>{
    try{const r=await db.query('SELECT v.id,v.name FROM vehicles v JOIN customer_vehicle_access a ON a.vehicle_id=v.id WHERE a.customer_id=$1 ORDER BY v.id',[req.customerId]);res.json({vehicles:r.rows.map(x=>({id:Number(x.id),name:x.name}))})}catch(e){console.error('Customer vehicles error',e.code||e.message);res.status(503).json({error:'Service unavailable'})}
  });
  router.get('/positions',async(req,res)=>{
    try{const r=await db.query('SELECT DISTINCT ON (p.vehicle_id) p.vehicle_id,p.latitude,p.longitude,p.recorded_at FROM positions p JOIN customer_vehicle_access a ON a.vehicle_id=p.vehicle_id WHERE a.customer_id=$1 ORDER BY p.vehicle_id,p.recorded_at DESC',[req.customerId]);res.json({positions:r.rows.map(x=>({vehicleId:Number(x.vehicle_id),latitude:x.latitude,longitude:x.longitude,recordedAt:x.recorded_at}))})}catch(e){console.error('Customer positions error',e.code||e.message);res.status(503).json({error:'Service unavailable'})}
  });
  // Explicit, customer-authorized phone location upload; never accepts another customer's vehicle.
  router.post('/phone-position',express.json({limit:'2kb'}),async(req,res)=>{
    const {vehicleId,latitude,longitude,recordedAt}=req.body||{};
    const id=Number(vehicleId),lat=Number(latitude),lon=Number(longitude);
    const timestamp=typeof recordedAt==='string'?Date.parse(recordedAt):NaN;
    if(!Number.isSafeInteger(id)||id<=0||typeof latitude!=='number'||typeof longitude!=='number'||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180||!Number.isFinite(timestamp)||timestamp>Date.now()+300000||timestamp<Date.now()-31*86400000)return res.status(400).json({error:'Invalid position'});
    try{
      const r=await db.query('INSERT INTO positions(vehicle_id,latitude,longitude,recorded_at) SELECT $1,$2,$3,$4 WHERE EXISTS (SELECT 1 FROM customer_vehicle_access WHERE customer_id=$5 AND vehicle_id=$1) RETURNING vehicle_id',[id,lat,lon,new Date(timestamp),req.customerId]);
      if(!r.rowCount)return res.status(403).json({error:'Vehicle not permitted'});
      return res.status(201).json({stored:true});
    }catch(e){console.error('Phone position error',e.code||e.message);return res.status(503).json({error:'Service unavailable'})}
  });
  router.get('/history',async(req,res)=>{
    const vehicleId=Number(req.query.vehicleId),from=String(req.query.from||''),to=String(req.query.to||'');
    const start=Date.parse(from),end=Date.parse(to);
    if(!Number.isSafeInteger(vehicleId)||vehicleId<=0||!/^\d{4}-\d{2}-\d{2}T/.test(from)||!/^\d{4}-\d{2}-\d{2}T/.test(to)||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>31*86400000)return res.status(400).json({error:'Invalid vehicle or date range'});
    try{
      const r=await db.query('SELECT p.latitude,p.longitude,p.recorded_at FROM positions p JOIN customer_vehicle_access a ON a.vehicle_id=p.vehicle_id WHERE a.customer_id=$1 AND a.vehicle_id=$2 AND p.recorded_at >= $3 AND p.recorded_at < $4 ORDER BY p.recorded_at DESC LIMIT 500',[req.customerId,vehicleId,new Date(start),new Date(end)]);
      res.json({vehicleId,positions:r.rows.map(x=>({latitude:x.latitude,longitude:x.longitude,recordedAt:x.recorded_at}))});
    }catch(e){console.error('Customer history error',e.code||e.message);res.status(503).json({error:'Service unavailable'})}
  });
  return router;
}
module.exports=createCustomerRoutes;
