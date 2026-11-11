'use strict';
/* Isolated customer API entrypoint. Does not replace the existing GPS receiver or API. */
const express = require('express');
const {Pool} = require('pg');
const customerRoutes = require('./customer-routes.cjs');
const required=['PGHOST','PGDATABASE','PGUSER','PGPASSWORD'];
if(required.some(k=>!process.env[k])) throw Error('Missing PostgreSQL configuration');
const port=Number(process.env.CUSTOMER_API_PORT||8091);
if(!Number.isInteger(port)||port<1||port>65535) throw Error('Invalid CUSTOMER_API_PORT');
const db=new Pool({
 host:process.env.PGHOST,port:Number(process.env.PGPORT||5432),
 database:process.env.PGDATABASE,user:process.env.PGUSER,
 password:process.env.PGPASSWORD,max:5,connectionTimeoutMillis:3000
});
const app=express();
app.disable('x-powered-by');
app.get('/health',(_req,res)=>res.json({status:'ok'}));
app.use('/api/customer',customerRoutes(db));
app.use((_req,res)=>res.status(404).json({error:'Not found'}));
const server=app.listen(port,'127.0.0.1',()=>console.log('Customer API on localhost:'+port));
server.requestTimeout=10000;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>db.end().then(()=>process.exit(0))));
