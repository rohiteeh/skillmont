const { app } = require('../src/server');
const db = require('../src/config/db');
const { seedData } = require('../src/utils/seed');

let isInitialized = false;

module.exports = async (req, res) => {
  if (!isInitialized) {
    try {
      await db.initDB();
      await seedData();
    } catch (err) {
      console.error('Vercel initialization error:', err);
    }
    isInitialized = true;
  }
  return app(req, res);
};
