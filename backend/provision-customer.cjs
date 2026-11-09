'use strict';
const crypto=require('node:crypto');
const {promisify}=require('node:util');
const scrypt=promisify(crypto.scrypt);
const db=require('./db');
async function main(){
  const email=(process.env.CUSTOMER_EMAIL||'').trim().toLowerCase();
  const fs=require('node:fs');
  const passwordFile=process.env.CUSTOMER_PASSWORD_FILE;
  const password=passwordFile ? fs.readFileSync(passwordFile,'utf8').replace(/\r?\n$/,'') : (process.env.CUSTOMER_PASSWORD||'');
  const vehicleId=Number(process.env.CUSTOMER_VEHICLE_ID);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<16||password.length>1024||!Number.isSafeInteger(vehicleId)||vehicleId<=0)throw Error('Require CUSTOMER_EMAIL, CUSTOMER_PASSWORD (16+ characters), and CUSTOMER_VEHICLE_ID');
  const salt=crypto.randomBytes(32).toString('hex');
  const key=await scrypt(password,Buffer.from(salt,'hex'),64);
  const client=await db.connect();
  try{
    await client.query('BEGIN');
    const vehicle=await client.query('SELECT id FROM vehicles WHERE id=$1',[vehicleId]);
    if(!vehicle.rowCount)throw Error('Vehicle does not exist');
    const customer=await client.query('INSERT INTO customer_accounts(email,password_hash) VALUES($1,$2) ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id',[email,salt+':'+key.toString('hex')]);
    await client.query('INSERT INTO customer_vehicle_access(customer_id,vehicle_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[customer.rows[0].id,vehicleId]);
    await client.query('UPDATE customer_sessions SET revoked_at=now() WHERE customer_id=$1 AND revoked_at IS NULL',[customer.rows[0].id]);
    await client.query('COMMIT');
    console.log('Customer account provisioned and vehicle access assigned; no credentials printed');
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}
main().catch(e=>{console.error('Provisioning failed:',e.message);process.exitCode=1}).finally(()=>db.end());
