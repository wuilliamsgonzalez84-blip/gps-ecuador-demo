const {Pool}=require('pg');
module.exports = new Pool({
 host:process.env.DB_HOST||'gps-postgres',
 port:Number(process.env.DB_PORT||5432),
 user:process.env.POSTGRES_USER,
 password:process.env.POSTGRES_PASSWORD,
 database:process.env.POSTGRES_DB,
 max:10
});
