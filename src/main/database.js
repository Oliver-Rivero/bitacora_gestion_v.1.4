import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

let db

export function setupDatabase() {
  const isDev = !app.isPackaged
  const dbPath = isDev 
    ? join(process.cwd(), 'finanzas.db')
    : join(app.getPath('userData'), 'finanzas.db')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT,
      color TEXT,
      balance REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subcategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoryId INTEGER,
      name TEXT NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      targetAmount REAL NOT NULL,
      initialAmount REAL DEFAULT 0,
      currentAmount REAL DEFAULT 0,
      annualRate REAL DEFAULT 0,
      icon TEXT DEFAULT 'PiggyBank',
      notes TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS savings_contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goalId INTEGER,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (goalId) REFERENCES savings_goals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      categoryId INTEGER,
      subcategoryId INTEGER,
      entityId INTEGER,
      toEntityId INTEGER,
      goalId INTEGER,
      tags TEXT,
      note TEXT,
      reminderId TEXT,
      FOREIGN KEY (categoryId) REFERENCES categories(id),
      FOREIGN KEY (subcategoryId) REFERENCES subcategories(id),
      FOREIGN KEY (entityId) REFERENCES entities(id),
      FOREIGN KEY (toEntityId) REFERENCES entities(id),
      FOREIGN KEY (goalId) REFERENCES savings_goals(id)
    );

    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entityId INTEGER,
      goalId INTEGER,
      amount REAL NOT NULL,
      categoryId INTEGER,
      subcategoryId INTEGER,
      dayOfMonth INTEGER NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT,
      lastProcessedDate TEXT,
      active INTEGER DEFAULT 1,
      FOREIGN KEY (entityId) REFERENCES entities(id),
      FOREIGN KEY (goalId) REFERENCES savings_goals(id),
      FOREIGN KEY (categoryId) REFERENCES categories(id),
      FOREIGN KEY (subcategoryId) REFERENCES subcategories(id)
    );

    CREATE TABLE IF NOT EXISTS configs (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS budget_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoryId INTEGER,
      subcategoryId INTEGER,
      amount REAL NOT NULL,
      isFixed INTEGER DEFAULT 1,
      FOREIGN KEY (categoryId) REFERENCES categories(id),
      FOREIGN KEY (subcategoryId) REFERENCES subcategories(id)
    );

    CREATE TABLE IF NOT EXISTS income_forecasts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL
    );
  `)

  // Migrations for existing databases
  try {
    db.prepare('ALTER TABLE transactions ADD COLUMN goalId INTEGER').run()
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE savings_goals ADD COLUMN calcMode TEXT DEFAULT "time"').run()
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE savings_goals ADD COLUMN deadlineMonths INTEGER').run()
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE savings_goals ADD COLUMN monthlySaving REAL DEFAULT 0').run()
  try { db.prepare("ALTER TABLE savings_goals ADD COLUMN annualYield REAL DEFAULT 0").run() } catch (e) {}
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE budget_items ADD COLUMN note TEXT').run()
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE recurring_transactions ADD COLUMN type TEXT DEFAULT "gasto"').run()
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE recurring_transactions ADD COLUMN note TEXT').run()
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE budget_items ADD COLUMN period TEXT DEFAULT "monthly"').run()
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE income_forecasts ADD COLUMN period TEXT DEFAULT "monthly"').run()
  } catch (e) {}

  try {
    db.prepare('DELETE FROM categories WHERE name = "Finanzas"').run()
  } catch (e) {}

  // Force seed categories if empty
  const count = db.prepare('SELECT COUNT(*) as count FROM categories').get().count
  if (count === 0) {
    const cats = [
      { name: 'Hogar', type: 'gasto', subs: ['Hipoteca', 'Cesta de la compra', 'Luz', 'Agua', 'Telefonía e internet', 'Mantenimiento', 'Seguro Hogar', 'Seguro Vida', 'Impuestos', 'Mascota'] },
      { name: 'Vehículo', type: 'gasto', subs: ['Combustible', 'Mantenimiento', 'Impuestos', 'Aparcamiento'] },
      { name: 'Personal', type: 'gasto', subs: ['Ropa', 'Farmacia', 'Gimnasio', 'Suplementos', 'Tecnología'] },
      { name: 'Ocio y entretenimiento', type: 'gasto', subs: ['Restaurantes', 'Suscripciones', 'Viajes', 'Cine', 'Teatro', 'Libros', 'Conciertos'] },
      { name: 'Ingresos', type: 'ingreso', subs: ['Nómina', 'Dietas', 'YouTube', 'Saldo inicial', 'Ajuste de saldo', 'Otros'] }
    ]
    
    // Use a simple loop for maximum compatibility
    for (const c of cats) {
      const result = db.prepare('INSERT INTO categories (name, type) VALUES (?, ?)').run(c.name, c.type)
      const catId = result.lastInsertRowid
      for (const s of c.subs) {
        db.prepare('INSERT INTO subcategories (categoryId, name) VALUES (?, ?)').run(catId, s)
      }
    }
  }

  // --- MIGRATION: Promote subcategories of 'Ingresos' to main categories of type 'ingreso' ---
  try {
    const oldIngresoCat = db.prepare('SELECT id FROM categories WHERE name = ? AND type = ?').get('Ingresos', 'ingreso')
    if (oldIngresoCat) {
      const subs = db.prepare('SELECT * FROM subcategories WHERE categoryId = ?').all(oldIngresoCat.id)
      
      let otrosCat = db.prepare('SELECT id FROM categories WHERE name = ? AND type = ?').get('Otros', 'ingreso')
      let otrosCatId
      if (!otrosCat) {
        const res = db.prepare('INSERT INTO categories (name, type) VALUES (?, ?)').run('Otros', 'ingreso')
        otrosCatId = res.lastInsertRowid
      } else {
        otrosCatId = otrosCat.id
      }

      for (const s of subs) {
        let newCat = db.prepare('SELECT id FROM categories WHERE name = ? AND type = ?').get(s.name, 'ingreso')
        let newCatId
        if (!newCat) {
          const res = db.prepare('INSERT INTO categories (name, type) VALUES (?, ?)').run(s.name, 'ingreso')
          newCatId = res.lastInsertRowid
        } else {
          newCatId = newCat.id
        }

        // Migrate transactions and configs
        db.prepare('UPDATE transactions SET categoryId = ?, subcategoryId = NULL WHERE categoryId = ? AND subcategoryId = ?').run(newCatId, oldIngresoCat.id, s.id)
        db.prepare('UPDATE recurring_transactions SET categoryId = ?, subcategoryId = NULL WHERE categoryId = ? AND subcategoryId = ?').run(newCatId, oldIngresoCat.id, s.id)
        db.prepare('UPDATE budget_items SET categoryId = ?, subcategoryId = NULL WHERE categoryId = ? AND subcategoryId = ?').run(newCatId, oldIngresoCat.id, s.id)
      }

      // Update remaining ones without subcategory or with unknown subcategories
      db.prepare('UPDATE transactions SET categoryId = ?, subcategoryId = NULL WHERE categoryId = ?').run(otrosCatId, oldIngresoCat.id)
      db.prepare('UPDATE recurring_transactions SET categoryId = ?, subcategoryId = NULL WHERE categoryId = ?').run(otrosCatId, oldIngresoCat.id)
      db.prepare('UPDATE budget_items SET categoryId = ?, subcategoryId = NULL WHERE categoryId = ?').run(otrosCatId, oldIngresoCat.id)

      // Delete old dummy category
      db.prepare('DELETE FROM categories WHERE id = ?').run(oldIngresoCat.id)
    }
  } catch (e) {
    console.error("Migration 'Ingresos' promotion error:", e)
  }

  // --- MIGRATION: Seed default categories for Ahorro and Inversión if empty ---
  try {
    const ahorroCount = db.prepare('SELECT COUNT(*) as count FROM categories WHERE type = ?').get('ahorro').count
    if (ahorroCount === 0) {
      const catsAhorro = [
        { name: 'Hucha', subs: ['Vacaciones', 'Fondo de Emergencia', 'Vehículo', 'Tecnología', 'General'] },
        { name: 'Plan de Ahorro', subs: ['Depósito', 'Cuenta Remunerada'] }
      ]
      for (const c of catsAhorro) {
        const res = db.prepare('INSERT INTO categories (name, type) VALUES (?, ?)').run(c.name, 'ahorro')
        const catId = res.lastInsertRowid
        for (const s of c.subs) {
          db.prepare('INSERT INTO subcategories (categoryId, name) VALUES (?, ?)').run(catId, s)
        }
      }
    }
  } catch (e) {
    console.error("Migration 'ahorro' seed error:", e)
  }

  try {
    const inversionCount = db.prepare('SELECT COUNT(*) as count FROM categories WHERE type = ?').get('inversion').count
    if (inversionCount === 0) {
      const catsInversion = [
        { name: 'Bolsa', subs: ['Acciones', 'ETF', 'Fondos Indexados'] },
        { name: 'Criptomonedas', subs: ['Bitcoin', 'Ethereum', 'Altcoins'] },
        { name: 'Inmobiliario', subs: ['Alquiler', 'Crowdfunding'] },
        { name: 'Otros', subs: ['Planes de Pensiones', 'Oro / Metales'] }
      ]
      for (const c of catsInversion) {
        const res = db.prepare('INSERT INTO categories (name, type) VALUES (?, ?)').run(c.name, 'inversion')
        const catId = res.lastInsertRowid
        for (const s of c.subs) {
          db.prepare('INSERT INTO subcategories (categoryId, name) VALUES (?, ?)').run(catId, s)
        }
      }
    }
  } catch (e) {
    console.error("Migration 'inversion' seed error:", e)
  }

  return db
}

export function getDb() {
  return db
}
