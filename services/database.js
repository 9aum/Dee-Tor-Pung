/**
 * database.js
 * 
 * ไฟล์นี้ทำหน้าที่ "จัดการโครงสร้างฐานข้อมูล" (Database Schema)
 * เมื่อเปิดแอปขึ้นมา SQLite จะเรียกฟังก์ชัน migrateDbIfNeeded เพื่อตรวจสอบว่า:
 * 1. มีตารางข้อมูลหรือยัง? ถ้าไม่มี -> สร้างใหม่
 * 2. ตารางเป็นเวอร์ชันเก่าหรือไม่? ถ้าเก่า -> อัปเกรด (Add columns etc.)
 */

export async function migrateDbIfNeeded(db) {
  try {
    // เปิดโหมด WAL เพื่อประสิทธิภาพการอ่านเขียนที่ดีขึ้น
    await db.execAsync(`PRAGMA journal_mode = WAL;`);

    // 1. ตรวจสอบตาราง 'logs' (บันทึกการออกกำลังกาย)
    // เช็คว่ามีตารางนี้อยู่ไหม และโครงสร้างถูกต้องตามเวอร์ชันล่าสุด (V2.1) หรือไม่
    const tableInfo = await db.getAllAsync("PRAGMA table_info(logs)");

    if (tableInfo.length > 0) {
      // ถ้ามีตารางอยู่แล้ว ให้เช็คว่ามี Column 'distance' ไหม
      const hasDistance = tableInfo.some(col => col.name === 'distance');
      const hasWalkDist = tableInfo.some(col => col.name === 'walk_dist');

      // ถ้าไม่มีระยะทาง (distance) แต่มี walk_dist (เวอร์ชันเก่า V2.0)
      // ให้ทำการอัปเกรดฐานข้อมูล
      if (!hasDistance && hasWalkDist) {
        console.log("Upgrading database schema to V2.1...");

        // เทคนิคการแก้ตาราง SQLite: สร้างตารางใหม่ -> ก๊อปข้อมูล -> ลบตารางเก่า -> เปลี่ยนชื่อตารางใหม่
        await db.execAsync(`
          CREATE TABLE logs_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            weight REAL,
            distance REAL, 
            duration_min INTEGER, 
            image_uris TEXT
          );
          
          -- รวมข้อมูล walk_dist + run_dist เป็น distance เดียว
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
      // ถ้าไม่มีตารางเลย (เพิ่งลงแอปครั้งแรก) -> สร้างตารางใหม่เลย
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

    // 2. ตรวจสอบตาราง 'profile' (ข้อมูลส่วนตัว) V2.3
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nickname TEXT,
        goal TEXT,
        image_uri TEXT,
        quotes TEXT -- เก็บคำคมเป็น JSON Array Text
      );
    `);

    // สร้างข้อมูล Profile เริ่มต้นให้ 1 แถวเสมอ (ถ้ายังไม่มี)
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

/**
 * ฟังก์ชันสำหรับล้างข้อมูลทั้งหมด (Factory Reset ภายในแอป)
 * ใช้ในหน้า Profile -> ปุ่ม "ล้างข้อมูล"
 */
export async function resetDatabase(db) {
  try {
    // ลบตารางทิ้งทั้งหมด
    await db.execAsync(`
      DROP TABLE IF EXISTS logs;
      DROP TABLE IF EXISTS profile;
    `);
    // สร้างตารางเปล่าขึ้นมาใหม่
    await migrateDbIfNeeded(db);
    console.log("Database has been reset.");
  } catch (error) {
    console.error("Error resetting database:", error);
    throw error;
  }
}
