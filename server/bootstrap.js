import Database from 'better-sqlite3';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomBytes,scryptSync} from 'node:crypto';
const [org,email,password]=process.argv.slice(2);
if(!org||!email||!password||password.length<14){console.error('Uso: node bootstrap.js "Empresa" "correo" "contraseña de 14+ caracteres"');process.exit(1)}
const path=process.env.DATABASE_PATH||'./data/gps.sqlite';mkdirSync(dirname(path),{recursive:true});
const db=new Database(path);
const salt=randomBytes(16);
const passHash=salt.toString('hex')+':'+scryptSync(password,salt,64).toString('hex');
const trx=db.transaction(()=>{const o=db.prepare('INSERT INTO organizations(name) VALUES(?)').run(org);db.prepare("INSERT INTO users(org_id,email,password_hash,role) VALUES(?,?,?,'owner')").run(o.lastInsertRowid,email.trim().toLowerCase(),passHash)});
try{trx();console.log('Cuenta inicial creada')}catch(e){console.error('Primero inicia index.js para crear tablas, luego ejecuta este script.');process.exit(1)}
