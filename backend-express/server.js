const app = require('./src/app');
const runTelegramMigration = require('./src/config/migrate_telegram');

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Express Backend Server is running on port ${PORT}`);
  await runTelegramMigration();
});
