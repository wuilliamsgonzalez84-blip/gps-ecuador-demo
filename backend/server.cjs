const express = require('express');
const pool = require('./db.cjs');
const app = express();
app.disable('x-powered-by');
app.use(express.json({limit:'32kb'}));
app.get('/api/health', (_req,res) => res.json({sistema:'GPS Ecuador',estado:'funcionando'}));
app.get('/api/vehicles/count', async (_req,res) => {
  try {
    const r = await pool.query('SELECT COUNT(*) AS total FROM vehicles');
    res.json({total:Number(r.rows[0].total)});
  } catch(e) {
    console.error('DB query failed:',e.code);
    res.status(500).json({error:'Error interno'});
  }
});
if(require.main === module) app.listen(Number(process.env.API_PORT||3000),'0.0.0.0',()=>console.log('GPS Ecuador API listening'));
module.exports = app;
