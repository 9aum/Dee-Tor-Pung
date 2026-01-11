export async function migrateDbIfNeeded(db) {
  try {
    await db.execAsync(`PRAGMA journal_mode = WAL;`);

    // 1. Check if 'logs' table format is correct (V2.1 fields: distance, duration_min)
    const tableInfo = await db.getAllAsync("PRAGMA table_info(logs)");

    // If table exists
    if (tableInfo.length > 0) {
      const hasDistance = tableInfo.some(col => col.name === 'distance');
      const hasWalkDist = tableInfo.some(col => col.name === 'walk_dist');

      if (!hasDistance && hasWalkDist) {
        console.log("Upgrading database schema to V2.1...");
        // Migration: Old V2.0 -> V2.1
        await db.execAsync(`
          CREATE TABLE logs_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            weight REAL,
            distance REAL, 
            duration_min INTEGER, 
            image_uris TEXT
          );
          
          -- Copy Data (Combine walk+run -> distance)
          INSERT INTO logs_new (id, date, weight, distance, duration_min, image_uris)
          SELECT 
            id, date, weight, 
            (IFNULL(walk_dist, 0) + IFNULL(run_dist, 0)) as distance,
            0 as duration_min,
            image_uris
          FROM logs;
          
          DROP TABLE logs;
          ALTER TABLE logs_new RENAME TO logs;
        `);
      }
    } else {
      // Table doesn't exist, create fresh
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          weight REAL,
          distance REAL, 
          duration_min INTEGER, 
          image_uris TEXT
        );
      `);
    }

    // 2. Profile Table (V2.3)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nickname TEXT,
        goal TEXT,
        image_uri TEXT,
        quotes TEXT -- JSON Array of strings
      );
    `);

    // Ensure strictly one profile record exists
    const profileCount = await db.getFirstAsync("SELECT COUNT(*) as count FROM profile");
    if (profileCount.count === 0) {
      await db.runAsync(`
        INSERT INTO profile (nickname, goal, image_uri, quotes) 
        VALUES ('เพื่อน', 'สุขภาพแข็งแรง', NULL, '["สู้ๆ นะครับ", "วันนี้คุณทำได้ดีมาก!", "อย่าลืมดื่มน้ำเยอะๆ"]')
      `);
    }

    console.log('Database initialized successfully (Logs V2.1 & Profile)');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// ** New Function: For Full Reset ** 
export async function resetDatabase(db) {
  try {
    await db.execAsync(`
      DROP TABLE IF EXISTS logs;
      DROP TABLE IF EXISTS profile;
    `);
    // Re-run migration to recreate empty tables
    await migrateDbIfNeeded(db);
    console.log("Database has been reset.");
  } catch (error) {
    console.error("Error resetting database:", error);
    throw error;
  }
}
