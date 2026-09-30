const dbName = process.env.MONGO_INITDB_DATABASE;

db.getSiblingDB(dbName).createUser({
  user: process.env.MONGO_USER_NAME,
  pwd: process.env.MONGO_USER_PWD,
  roles: [{ role: "readWrite", db: dbName }],
});