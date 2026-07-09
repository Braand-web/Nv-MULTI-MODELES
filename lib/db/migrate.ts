import { config } from "dotenv";

config({
  path: ".env.local",
});

const runMigrate = async () => {
  console.log("Mocking database migrations: skipping migrations.");
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error("Migration failed");
  console.error(err);
  process.exit(1);
});
