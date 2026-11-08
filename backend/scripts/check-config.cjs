'use strict';
// Offline production readiness check. Never prints secrets or connects to VPS.
const fs=require('node:fs');
const path=require('node:path');
function parseEnv(source){
 const result={};
 for(const raw of source.split(/\r?\n/)){
  const line=raw.trim();
  if(!line||line.startsWith('#'))continue;
  const match=line.match(/^([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)$/);
  if(!match)continue;
  let value=match[2].trim();
  if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
  result[match[1]]=value;
 }
 return result;
}
function validate(env){
 const findings=[];
 for(const key of ['POSTGRES_USER','POSTGRES_PASSWORD','POSTGRES_DB','MAP_USERNAME','MAP_PASSWORD']){
  if(!env[key])findings.push('FALTA: '+key);
 }
 if(env.MAP_PASSWORD&&env.MAP_PASSWORD.length<16)findings.push('REVISAR: MAP_PASSWORD debe tener al menos 16 caracteres');
 if(env.MAP_USERNAME&&env.MAP_PASSWORD&&env.MAP_USERNAME===env.MAP_PASSWORD)findings.push('REVISAR: usuario y contraseña del mapa no deben coincidir');
 for(const key of ['DB_PORT','API_PORT','GPS_PORT']){
  if(env[key]&&(!/^\d+$/.test(env[key])||Number(env[key])<1||Number(env[key])>65535))findings.push('REVISAR: puerto inválido en '+key);
 }
 if(env.DB_HOST==='localhost'||env.DB_HOST==='127.0.0.1')findings.push('REVISAR: DB_HOST localhost puede fallar dentro de Docker');
 return findings;
}
if(require.main===module){
 const filename=process.argv[2]||path.resolve(__dirname,'../../.env');
 if(!fs.existsSync(filename)){console.error('FALTA: archivo .env (no se muestra contenido)');process.exitCode=1;}
 else{
  const findings=validate(parseEnv(fs.readFileSync(filename,'utf8')));
  for(const item of findings)console.log(item);
  if(findings.length){console.log('Configuración: REVISAR');process.exitCode=1;}
  else console.log('Configuración básica: OK (no verifica servidor, TLS ni conexión GPS)');
 }
}
module.exports={parseEnv,validate};
