const REPLSET_HOST = "mongodb_host:27017";

try {
  rs.status();
} catch (e) {
  rs.initiate({ _id: "rs0", members: [{ _id: 0, host: REPLSET_HOST }] });
}

while (!db.hello().isWritablePrimary) {
  sleep(200);
}

db.getSiblingDB("admin").createUser({
  user: process.env.MONGO_ROOT_USERNAME,
  pwd: process.env.MONGO_ROOT_PASSWORD,
  roles: [{ role: "root", db: "admin" }],
});

db.createUser({
  user: process.env.MONGO_USER_NAME,
  pwd: process.env.MONGO_USER_PWD,
  roles: [{ role: "readWrite", db: process.env.MONGO_INITDB_DATABASE }],
});
