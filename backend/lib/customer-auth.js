import {randomBytes, scrypt as scryptCb, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCb);
const LIMIT=1024;
export async function hashPassword(password) {
 if(typeof password!=='string'||password.length<12||password.length>LIMIT) throw Error('Invalid password length');
 const salt=randomBytes(16);
 const hash=await scrypt(password,salt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024});
 return 'scrypt$'+salt.toString('hex')+'$'+hash.toString('hex');
}
export async function verifyPassword(password,stored) {
 if(typeof password!=='string'||password.length>LIMIT||typeof stored!=='string') return false;
 const match=/^scrypt\$([0-9a-f]{32})\$([0-9a-f]{128})$/.exec(stored);
 if(!match)return false;
 const expected=Buffer.from(match[2],'hex');
 const actual=await scrypt(password,Buffer.from(match[1],'hex'),64,{N:16384,r:8,p:1,maxmem:32*1024*1024});
 return timingSafeEqual(expected,actual);
}
export function normalizeEmail(email) {
 if(typeof email!=='string')throw Error('Invalid email');
 const value=email.trim().toLowerCase();
 if(value.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw Error('Invalid email');
 return value;
}
export async function allowedVehicleIds(pool,accountId) {
 if(!Number.isSafeInteger(accountId)||accountId<=0)throw Error('Invalid account');
 const result=await pool.query(
  'SELECT vehicle_id FROM public.gps_account_vehicles WHERE account_id=$1 ORDER BY vehicle_id',
  [accountId]
 );
 return new Set(result.rows.map(row=>Number(row.vehicle_id)));
}
// Login is implemented separately in server.js with
// server-side sessions, secure cookies and HTTPS before enabling customer access.
