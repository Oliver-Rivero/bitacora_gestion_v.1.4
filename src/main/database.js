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

  // Force seed categories if empty
  const count = db.prepare('SELECT COUNT(*) as count FROM categories').get().count
  if (count === 0) {
    const cats = [
      { name: 'Hogar', type: 'gasto', subs: ['Hipoteca', 'Cesta de la compra', 'Luz', 'Agua', 'Telefonía e internet', 'Mantenimiento', 'Seguro Hogar', 'Seguro Vida', 'Impuestos', 'Mascota'] },
      { name: 'Vehículo', type: 'gasto', subs: ['Combustible', 'Mantenimiento', 'Impuestos', 'Aparcamiento'] },
      { name: 'Personal', type: 'gasto', subs: ['Ropa', 'Farmacia', 'Gimnasio', 'Suplementos', 'Tecnología'] },
      { name: 'Ocio y entretenimiento', type: 'gasto', subs: ['Restaurantes', 'Suscripciones', 'Viajes', 'Cine', 'Teatro', 'Libros', 'Conciertos'] },
      { name: 'Finanzas', type: 'gasto', subs: ['Ahorro', 'Inversión'] },
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

  // Ensure 'Ajuste' category exists
  const hasAjuste = db.prepare('SELECT id FROM categories WHERE name = ?').get('Ajuste')
  if (!hasAjuste) {
    const result = db.prepare('INSERT INTO categories (name, type) VALUES (?, ?)').run('Ajuste', 'gasto')
    const catId = result.lastInsertRowid
    db.prepare('INSERT INTO subcategories (categoryId, name) VALUES (?, ?)').run(catId, 'Ajuste de Saldo')
  }

  return db
}

export function getDb() {
  return db
}
