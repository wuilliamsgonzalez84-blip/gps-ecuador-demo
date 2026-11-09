'use strict';
// One-time, reversible source patch for the EXISTING Express server.js.
// This only writes source files. It does NOT start/restart containers or expose endpoints.
// Run in the backend directory after the integration/ files are present.
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const target = path.join(root, 'server.js');
const marker = '// GPS_ECUADOR_SECURE_ROUTES_V1';
const original = fs.readFileSync(target,'utf8');
if (original.includes(marker)) { console.log('ROUTES_ALREADY_PREPARED'); process.exit(0); }
if (!/const\s+app\s*=\s*express\s*\(\s*\)/.test(original) || !/app\.listen\s*\(/.test(original) || !/require\(['"]\.\/db['"]\)/.test(original)) {
  throw Error('Unexpected server.js structure. No changes made.');
}
if (!fs.existsSync(path.join(root,'integration/gps-routes.cjs'))) throw Error('Missing route module');
const backup = target+'.before-gps-routes';
if (!fs.existsSync(backup)) fs.copyFileSync(target,backup,fs.constants.COPYFILE_EXCL);
const injection = `
// GPS_ECUADOR_SECURE_ROUTES_V1
// These routes remain disabled until configured with authorized vehicle IDs,
// a private API key, and an exact trusted web origin.
if (process.env.GPS_ROUTES_ENABLED === '1') {
  const { createGpsRouteHandler } = require('./integration/gps-routes.cjs');
  const ids = (process.env.GPS_AUTHORIZED_VEHICLE_IDS || '')
    .split(',').filter(Boolean).map(Number);
  const handler = createGpsRouteHandler({
    db: pool,
    apiKey: process.env.GPS_API_KEY,
    allowedOrigin: process.env.GPS_ALLOWED_ORIGIN,
    authorizedVehicleIds: ids
  });
  app.use(async (req, res, next) => {
    try {
      if (!(await handler(req,res))) next();
    } catch (err) { next(err); }
  });
}
`;
const updated=original.replace(/app\.listen\s*\(/,injection+'\napp.listen(');
fs.writeFileSync(target,updated,{flag:'w'});
console.log('ROUTES_PREPARED_DISABLED');
console.log('Backup:',backup);
