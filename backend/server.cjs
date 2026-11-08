'use strict';
const express=require('express');
const crypto=require('node:crypto');
const path=require('node:path');
const pool=require('./db.cjs');
const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'32kb'}));
app.use((_req,res,next)=>{res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');res.set('Referrer-Policy','no-referrer');res.set('X-Frame-Options','DENY');next();});
app.get('/api/health',(_req,res)=>res.json({sistema:'GPS Ecuador',estado:'funcionando'}));
const user=process.env.MAP_USERNAME;
const password=process.env.MAP_PASSWORD;
function equal(a,b){const x=crypto.createHash('sha256').update(a).digest();const y=crypto.createHash('sha256').update(b).digest();return crypto.timingSafeEqual(x,y);}
function auth(req,res,next){
  if(!user||!password){return res.status(503).json({error:'Panel no configurado'});}
  const header=req.get('authorization')||'';
  if(!header.startsWith('Basic '))return challenge(res);
  let decoded;
  try{decoded=Buffer.from(header.slice(6),'base64').toString('utf8');}catch{return challenge(res);}
  const i=decoded.indexOf(':');
  if(i<0||!equal(decoded.slice(0,i),user)||!equal(decoded.slice(i+1),password))return challenge(res);
  next();
}
function challenge(res){res.set('WWW-Authenticate','Basic realm="GPS Ecuador privado", charset="UTF-8"');return res.status(401).send('Acceso restringido');}
app.get('/panel',auth,(_req,res)=>res.sendFile(path.join(__dirname,'private-map.html')));
app.get('/private-map.js',auth,(_req,res)=>res.type('application/javascript').sendFile(path.join(__dirname,'private-map.js')));
app.get('/api/vehicles/count',auth,async(_req,res)=>{
  try{const r=await pool.query('SELECT COUNT(*) AS total FROM vehicles');res.json({total:Number(r.rows[0].total)});}
  catch(e){console.error('DB error:',e.code);res.status(500).json({error:'Error interno'});}
});
app.get('/api/positions/latest',auth,async(_req,res)=>{
  try{
    const result=await pool.query(`
      SELECT v.id AS vehicle_id,v.name,
             p.latitude,p.longitude,p.recorded_at
      FROM vehicles v
      LEFT JOIN LATERAL (
        SELECT latitude,longitude,recorded_at
        FROM positions
        WHERE vehicle_id=v.id
        ORDER BY recorded_at DESC,id DESC LIMIT 1
      ) p ON TRUE
      ORDER BY v.id
      LIMIT 100
    `);
    res.json({vehicles:result.rows});
  }catch(e){console.error('DB error:',e.code);res.status(500).json({error:'Error interno'});}
});
app.get('/api/vehicles/:id/history',auth,async(req,res)=>{
  const id=Number(req.params.id);
  if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'ID de vehículo inválido'});
  const from=Date.parse(String(req.query.from||''));
  const to=Date.parse(String(req.query.to||''));
  if(!Number.isFinite(from)||!Number.isFinite(to)||from>to||to-from>7*86400000)
    return res.status(400).json({error:'Indica from y to válidos (máximo 7 días)'});
  try{
    const result=await pool.query(
      'SELECT latitude,longitude,recorded_at FROM positions WHERE vehicle_id=$1 AND recorded_at >= $2 AND recorded_at <= $3 ORDER BY recorded_at ASC,id ASC LIMIT 5000',
      [id,new Date(from),new Date(to)]
    );
    res.json({vehicle_id:id,positions:result.rows,limit:5000});
  }catch(e){console.error('DB error:',e.code);res.status(500).json({error:'Error interno'});}
});
if(require.main===module)app.listen(Number(process.env.API_PORT||3000),'0.0.0.0',()=>console.log('GPS Ecuador private API listening'));
module.exports=app;
