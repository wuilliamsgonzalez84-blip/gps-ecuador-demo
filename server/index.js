import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Database from 'better-sqlite3';
import { randomBytes, createHash, timingSafeEqual, scryptSync } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const dbPath = process.env.DATABASE_PATH || './data/gps.sqlite';
mkdirSync(dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS organizations(id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, org_id INTEGER NOT NULL REFERENCES organizations(id), email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('owner','viewer')));
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS vehicles(id INTEGER PRIMARY KEY, org_id INTEGER NOT NULL REFERENCES organizations(id), name TEXT NOT NULL, device_key_hash TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS positions(id INTEGER PRIMARY KEY, vehicle_id INTEGER NOT NULL REFERENCES vehicles(id), lat REAL NOT NULL, lon REAL NOT NULL, speed REAL, recorded_at INTEGER NOT NULL, received_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS positions_vehicle_time ON positions(vehicle_id, recorded_at DESC);
`);
const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({limit:'8kb'}));
app.use(rateLimit({windowMs:60_000,limit:120,standardHeaders:'draft-7',legacyHeaders:false}));
const hash = s => createHash('sha256').update(s).digest('hex');
const token = () => randomBytes(32).toString('hex');
function verifyPassword(password, stored) {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected || password.length > 1024) return false;
  const actual = scryptSync(password, Buffer.from(salt,'hex'), 64);
  const wanted = Buffer.from(expected,'hex');
  return wanted.length === actual.length && timingSafeEqual(actual,wanted);
}
function auth(req,res,next) {
  const bearer = /^Bearer ([a-f0-9]{64})$/.exec(req.get('authorization')||'');
  if (!bearer) return res.sendStatus(401);
  const user = db.prepare('SELECT users.id, users.org_id, users.role FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?').get(hash(bearer[1]),Date.now());
  if (!user) return res.sendStatus(401);
  req.user=user;next();
}
app.get('/health',(_req,res)=>res.json({ok:true}));
app.post('/api/login',(req,res)=>{
  const {email,password}=req.body||{};
  if(typeof email!=='string'||typeof password!=='string'||email.length>254) return res.sendStatus(400);
  const user=db.prepare('SELECT * FROM users WHERE email=?').get(email.trim().toLowerCase());
  if(!user||!verifyPassword(password,user.password_hash)) return res.status(401).json({error:'Credenciales inválidas'});
  const access=token();
  db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(hash(access),user.id,Date.now()+8*60*60*1000);
  res.json({token:access,expiresInSeconds:28800});
});
app.post('/api/logout',auth,(req,res)=>{
  const bearer=req.get('authorization').slice(7);
  db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(bearer));
  res.sendStatus(204);
});
app.get('/api/vehicles',auth,(req,res)=>{
  const rows=db.prepare('SELECT id,name FROM vehicles WHERE org_id=? ORDER BY id').all(req.user.org_id);
  res.json(rows);
});
app.post('/api/vehicles',auth,(req,res)=>{
  if(req.user.role!=='owner')return res.sendStatus(403);
  const name=req.body?.name;
  if(typeof name!=='string'||!name.trim()||name.length>100)return res.sendStatus(400);
  const key=token();
  const result=db.prepare('INSERT INTO vehicles(org_id,name,device_key_hash) VALUES(?,?,?)').run(req.user.org_id,name.trim(),hash(key));
  res.status(201).json({id:result.lastInsertRowid.toString(),deviceKey:key,warning:'Guarda la clave ahora; no volverá a mostrarse.'});
});
app.get('/api/vehicles/:id/positions',auth,(req,res)=>{
  const vehicle=db.prepare('SELECT id FROM vehicles WHERE id=? AND org_id=?').get(req.params.id,req.user.org_id);
  if(!vehicle)return res.sendStatus(404);
  const rows=db.prepare('SELECT lat,lon,speed,recorded_at AS recordedAt FROM positions WHERE vehicle_id=? ORDER BY recorded_at DESC LIMIT 500').all(vehicle.id);
  res.json(rows);
});
// Ingesta HTTPS para pruebas controladas. No es un protocolo de rastreador GPS físico.
app.post('/api/ingest',rateLimit({windowMs:60_000,limit:60}), (req,res)=>{
  const key=/^Device ([a-f0-9]{64})$/.exec(req.get('authorization')||'');
  if(!key)return res.sendStatus(401);
  const vehicle=db.prepare('SELECT id FROM vehicles WHERE device_key_hash=?').get(hash(key[1]));
  if(!vehicle)return res.sendStatus(401);
  const {lat,lon,speed=0,recordedAt=Date.now()}=req.body||{};
  if(![lat,lon,speed,recordedAt].every(v=>typeof v==='number'&&Number.isFinite(v))||Math.abs(lat)>90||Math.abs(lon)>180||speed<0||speed>1000||Math.abs(Date.now()-recordedAt)>86400000)return res.sendStatus(400);
  db.prepare('INSERT INTO positions(vehicle_id,lat,lon,speed,recorded_at,received_at) VALUES(?,?,?,?,?,?)').run(vehicle.id,lat,lon,speed,recordedAt,Date.now());
  res.sendStatus(204);
});
app.listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log('GPS Ecuador API en localhost'));
