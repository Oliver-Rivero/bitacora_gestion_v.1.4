import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setupDatabase, getDb } from './database.js'
import { exec } from 'child_process'
import { getConfig, setConfig } from './config'
import fs from 'fs'
import { dialog } from 'electron'
// http import removed

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1760,
    height: 1210,
    show: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.oliver.bitacoragestion')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize SQLite database
  setupDatabase()
  const db = getDb()

  // --- IPC Handlers ---

  // Entities
  ipcMain.handle('db-get-entities', () => {
    return db.prepare('SELECT * FROM entities ORDER BY name ASC').all()
  })

  ipcMain.handle('db-add-entity', (_, { name, url, color }) => {
    const stmt = db.prepare('INSERT INTO entities (name, url, color, balance) VALUES (?, ?, ?, 0)')
    const info = stmt.run(name, url, color)
    return info.lastInsertRowid
  })

  ipcMain.handle('db-edit-entity', (_, { id, name, url, color }) => {
    const stmt = db.prepare('UPDATE entities SET name = ?, url = ?, color = ? WHERE id = ?')
    stmt.run(name, url, color, id)
    return true
  })

  ipcMain.handle('db-delete-entity', (_, id) => {
    db.prepare('DELETE FROM entities WHERE id = ?').run(id)
    return true
  })

  // Categories & Subcategories
  ipcMain.handle('db-get-categories', () => {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all()
    return categories.map(cat => ({
      ...cat,
      subcategories: db.prepare('SELECT * FROM subcategories WHERE categoryId = ? ORDER BY name ASC').all(cat.id)
    }))
  })

  ipcMain.handle('db-add-category', (_, { name, type }) => {
    const stmt = db.prepare('INSERT INTO categories (name, type) VALUES (?, ?)')
    const info = stmt.run(name, type)
    return info.lastInsertRowid
  })

  ipcMain.handle('db-delete-category', (_, id) => {
    db.transaction(() => {
      db.prepare('DELETE FROM subcategories WHERE categoryId = ?').run(id)
      db.prepare('DELETE FROM categories WHERE id = ?').run(id)
    })()
    return true
  })

  ipcMain.handle('db-add-subcategory', (_, { categoryId, name }) => {
    const stmt = db.prepare('INSERT INTO subcategories (categoryId, name) VALUES (?, ?)')
    const info = stmt.run(categoryId, name)
    return info.lastInsertRowid
  })

  ipcMain.handle('db-delete-subcategory', (_, id) => {
    db.prepare('DELETE FROM subcategories WHERE id = ?').run(id)
    return true
  })

  // Transactions
  ipcMain.handle('db-get-transactions', () => {
    return db.prepare(`
      SELECT t.*, c.name as categoryName, s.name as subcategoryName, e.name as entityName, e2.name as toEntityName
      FROM transactions t
      LEFT JOIN categories c ON t.categoryId = c.id
      LEFT JOIN subcategories s ON t.subcategoryId = s.id
      LEFT JOIN entities e ON t.entityId = e.id
      LEFT JOIN entities e2 ON t.toEntityId = e2.id
      ORDER BY date DESC, id DESC
    `).all()
  })

  ipcMain.handle('db-add-transaction', (_, txn) => {
    const { date, type, amount, categoryId, subcategoryId, entityId, toEntityId, goalId, tags, note, reminderId } = txn
    
    const insertStmt = db.prepare(`
      INSERT INTO transactions (date, type, amount, categoryId, subcategoryId, entityId, toEntityId, goalId, tags, note, reminderId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    db.transaction(() => {
      insertStmt.run(date, type, amount, categoryId, subcategoryId, entityId, toEntityId, goalId, tags, note, reminderId)
      
      // Update entity balances
      if (type === 'ingreso') {
        db.prepare('UPDATE entities SET balance = balance + ? WHERE id = ?').run(amount, entityId)
      } else if (type === 'gasto' || type === 'ahorro' || type === 'inversion') {
        db.prepare('UPDATE entities SET balance = balance - ? WHERE id = ?').run(amount, entityId)
        
        // IF goalId is present, also add contribution
        if (goalId) {
          db.prepare('INSERT INTO savings_contributions (goalId, amount, date) VALUES (?, ?, ?)').run(goalId, amount, date)
          db.prepare('UPDATE savings_goals SET currentAmount = currentAmount + ? WHERE id = ?').run(amount, goalId)
        }
      } else if (type === 'transferencia') {
        db.prepare('UPDATE entities SET balance = balance - ? WHERE id = ?').run(amount, entityId)
        db.prepare('UPDATE entities SET balance = balance + ? WHERE id = ?').run(amount, toEntityId)
      }
    })()
    return true
  })

  ipcMain.handle('db-delete-transaction', (_, id) => {
    const txn = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id)
    if (!txn) return false

    db.transaction(() => {
      // Revert balances
      if (txn.type === 'ingreso') {
        db.prepare('UPDATE entities SET balance = balance - ? WHERE id = ?').run(txn.amount, txn.entityId)
      } else if (txn.type === 'gasto' || txn.type === 'ahorro' || txn.type === 'inversion') {
        db.prepare('UPDATE entities SET balance = balance + ? WHERE id = ?').run(txn.amount, txn.entityId)
        
        // IF goalId was present, revert contribution
        if (txn.goalId) {
          db.prepare('DELETE FROM savings_contributions WHERE goalId = ? AND amount = ? AND date = ?').run(txn.goalId, txn.amount, txn.date)
          db.prepare('UPDATE savings_goals SET currentAmount = currentAmount - ? WHERE id = ?').run(txn.amount, txn.goalId)
        }
      } else if (txn.type === 'transferencia') {
        db.prepare('UPDATE entities SET balance = balance + ? WHERE id = ?').run(txn.amount, txn.entityId)
        db.prepare('UPDATE entities SET balance = balance - ? WHERE id = ?').run(txn.amount, txn.toEntityId)
      }
      db.prepare('DELETE FROM transactions WHERE id = ?').run(id)
    })()
    return true
  })

  ipcMain.handle('db-edit-transaction', (_, txn) => {
    const { id, date, type, amount, categoryId, subcategoryId, entityId, toEntityId, goalId, tags, note } = txn
    const oldTxn = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id)
    if (!oldTxn) return false

    db.transaction(() => {
      // 1. REVERT OLD IMPACT
      if (oldTxn.type === 'ingreso') {
        db.prepare('UPDATE entities SET balance = balance - ? WHERE id = ?').run(oldTxn.amount, oldTxn.entityId)
      } else if (oldTxn.type === 'gasto' || oldTxn.type === 'ahorro' || oldTxn.type === 'inversion') {
        db.prepare('UPDATE entities SET balance = balance + ? WHERE id = ?').run(oldTxn.amount, oldTxn.entityId)
        if (oldTxn.goalId) {
          db.prepare('DELETE FROM savings_contributions WHERE goalId = ? AND amount = ? AND date = ?').run(oldTxn.goalId, oldTxn.amount, oldTxn.date)
          db.prepare('UPDATE savings_goals SET currentAmount = currentAmount - ? WHERE id = ?').run(oldTxn.amount, oldTxn.goalId)
        }
      } else if (oldTxn.type === 'transferencia') {
        db.prepare('UPDATE entities SET balance = balance + ? WHERE id = ?').run(oldTxn.amount, oldTxn.entityId)
        db.prepare('UPDATE entities SET balance = balance - ? WHERE id = ?').run(oldTxn.amount, oldTxn.toEntityId)
      }

      // 2. UPDATE RECORD
      db.prepare(`
        UPDATE transactions 
        SET date = ?, type = ?, amount = ?, categoryId = ?, subcategoryId = ?, entityId = ?, toEntityId = ?, goalId = ?, tags = ?, note = ?
        WHERE id = ?
      `).run(date, type, amount, categoryId, subcategoryId, entityId, toEntityId, goalId, tags, note, id)

      // 3. APPLY NEW IMPACT
      if (type === 'ingreso') {
        db.prepare('UPDATE entities SET balance = balance + ? WHERE id = ?').run(amount, entityId)
      } else if (type === 'gasto' || type === 'ahorro' || type === 'inversion') {
        db.prepare('UPDATE entities SET balance = balance - ? WHERE id = ?').run(amount, entityId)
        if (goalId) {
          db.prepare('INSERT INTO savings_contributions (goalId, amount, date) VALUES (?, ?, ?)').run(goalId, amount, date)
          db.prepare('UPDATE savings_goals SET currentAmount = currentAmount + ? WHERE id = ?').run(amount, goalId)
        }
      } else if (type === 'transferencia') {
        db.prepare('UPDATE entities SET balance = balance - ? WHERE id = ?').run(amount, entityId)
        db.prepare('UPDATE entities SET balance = balance + ? WHERE id = ?').run(amount, toEntityId)
      }
    })()
    return true
  })

  // Apple Reminders Integration
  ipcMain.handle('create-apple-reminder', (_, { title, dueDate }) => {
    return new Promise((resolve, reject) => {
      // dueDate is expected in ISO format
      const dateObj = new Date(dueDate)
      const dateStr = dateObj.toLocaleString('en-US') // OS-dependent but usually works with AppleScript if localized correctly
      
      // Better way using specific components to avoid locale issues
      const script = `
        tell application "Reminders"
          set newReminder to make new reminder with properties {name:"${title}"}
          set due date of newReminder to date "${dateStr}"
        end tell
      `
      
      exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
        if (error) {
          console.error('AppleScript Error:', error)
          reject(error)
        } else {
          resolve(stdout.trim())
        }
      })
    })
  })

  // Savings Goals
  ipcMain.handle('db-get-savings-goals', () => {
    return db.prepare('SELECT * FROM savings_goals ORDER BY createdAt DESC').all()
  })

  ipcMain.handle('db-add-savings-goal', (_, goal) => {
    const { name, targetAmount, initialAmount, annualRate, icon, notes, createdAt } = goal
    console.log('Main: Adding savings goal:', name)
    const stmt = db.prepare(`
      INSERT INTO savings_goals (name, targetAmount, initialAmount, currentAmount, annualRate, icon, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const info = stmt.run(
      name, 
      targetAmount || 0, 
      initialAmount || 0, 
      initialAmount || 0, 
      annualRate || 0, 
      icon || 'PiggyBank', 
      notes || '', 
      createdAt || new Date().toISOString()
    )
    const goalId = info.lastInsertRowid

    if (initialAmount > 0) {
      db.prepare('INSERT INTO savings_contributions (goalId, amount, date) VALUES (?, ?, ?)')
        .run(goalId, initialAmount, createdAt || new Date().toISOString())
    }

    return goalId
  })

  ipcMain.handle('db-edit-savings-goal', (_, goal) => {
    const { id, name, targetAmount, annualRate, icon, notes, calcMode, deadlineMonths, monthlySaving } = goal
    const stmt = db.prepare(`
      UPDATE savings_goals 
      SET name = ?, targetAmount = ?, annualRate = ?, icon = ?, notes = ?, calcMode = ?, deadlineMonths = ?, monthlySaving = ?
      WHERE id = ?
    `)
    stmt.run(name, targetAmount, annualRate, icon, notes, calcMode || 'time', deadlineMonths || 12, monthlySaving || 0, id)
    return true
  })

  ipcMain.handle('db-delete-savings-goal', (_, id) => {
    try {
      db.transaction(() => {
        db.prepare('UPDATE transactions SET goalId = NULL WHERE goalId = ?').run(id)
        db.prepare('UPDATE recurring_transactions SET goalId = NULL WHERE goalId = ?').run(id)
        db.prepare('DELETE FROM savings_contributions WHERE goalId = ?').run(id)
        db.prepare('DELETE FROM savings_goals WHERE id = ?').run(id)
      })()
      return true
    } catch (e) {
      console.error('Error deleting savings goal:', e)
      return false
    }
  })

  ipcMain.handle('db-add-savings-contribution', (_, { goalId, amount, date }) => {
    db.transaction(() => {
      db.prepare('INSERT INTO savings_contributions (goalId, amount, date) VALUES (?, ?, ?)').run(goalId, amount, date)
      db.prepare('UPDATE savings_goals SET currentAmount = currentAmount + ? WHERE id = ?').run(amount, goalId)
    })()
    return true
  })

  ipcMain.handle('db-get-savings-contributions', (_, goalId) => {
    return db.prepare('SELECT * FROM savings_contributions WHERE goalId = ? ORDER BY date DESC').all(goalId)
  })

  ipcMain.handle('db-get-all-contributions', () => {
    return db.prepare('SELECT c.*, g.name as goalName FROM savings_contributions c JOIN savings_goals g ON c.goalId = g.id ORDER BY c.date DESC').all()
  })

  // Recurring Transactions
  ipcMain.handle('db-get-recurring', () => {
    return db.prepare(`
      SELECT r.*, e.name as entityName, g.name as goalName, c.name as categoryName, s.name as subcategoryName
      FROM recurring_transactions r
      LEFT JOIN entities e ON r.entityId = e.id
      LEFT JOIN savings_goals g ON r.goalId = g.id
      LEFT JOIN categories c ON r.categoryId = c.id
      LEFT JOIN subcategories s ON r.subcategoryId = s.id
    `).all()
  })

  ipcMain.handle('db-add-recurring', (_, data) => {
    const { entityId, goalId, amount, categoryId, subcategoryId, dayOfMonth, startDate, endDate, type, note, lastProcessedDate } = data
    const stmt = db.prepare(`
      INSERT INTO recurring_transactions (entityId, goalId, amount, categoryId, subcategoryId, dayOfMonth, startDate, endDate, type, note, lastProcessedDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const info = stmt.run(
      entityId ?? null, 
      goalId ?? null, 
      amount ?? null, 
      categoryId ?? null, 
      subcategoryId ?? null, 
      dayOfMonth ?? null, 
      startDate ?? null, 
      endDate ?? null, 
      type || 'gasto', 
      note || '', 
      lastProcessedDate ?? null
    )
    return info.lastInsertRowid
  })

  ipcMain.handle('db-edit-recurring', (_, data) => {
    const { id, entityId, goalId, amount, categoryId, subcategoryId, dayOfMonth, startDate, endDate, active, type, note } = data
    const stmt = db.prepare(`
      UPDATE recurring_transactions 
      SET entityId = ?, goalId = ?, amount = ?, categoryId = ?, subcategoryId = ?, dayOfMonth = ?, startDate = ?, endDate = ?, active = ?, type = ?, note = ?
      WHERE id = ?
    `)
    stmt.run(
      entityId ?? null, 
      goalId ?? null, 
      amount ?? null, 
      categoryId ?? null, 
      subcategoryId ?? null, 
      dayOfMonth ?? null, 
      startDate ?? null, 
      endDate ?? null, 
      active ?? 1, 
      type || 'gasto', 
      note || '', 
      id
    )
    return true
  })

  ipcMain.handle('db-delete-recurring', (_, id) => {
    db.prepare('DELETE FROM recurring_transactions WHERE id = ?').run(id)
    return true
  })

  // Budget Items
  ipcMain.handle('db-get-budget', () => {
    return db.prepare(`
      SELECT b.*, c.name as categoryName, s.name as subcategoryName
      FROM budget_items b
      LEFT JOIN categories c ON b.categoryId = c.id
      LEFT JOIN subcategories s ON b.subcategoryId = s.id
    `).all()
  })

  ipcMain.handle('db-add-budget', (_, data) => {
    const { categoryId, subcategoryId, amount, isFixed, note, period } = data
    const stmt = db.prepare('INSERT INTO budget_items (categoryId, subcategoryId, amount, isFixed, note, period) VALUES (?, ?, ?, ?, ?, ?)')
    const info = stmt.run(categoryId, subcategoryId, amount, isFixed, note, period || 'monthly')
    return info.lastInsertRowid
  })

  ipcMain.handle('db-edit-budget', (_, data) => {
    const { id, categoryId, subcategoryId, amount, isFixed, note, period } = data
    const stmt = db.prepare('UPDATE budget_items SET categoryId = ?, subcategoryId = ?, amount = ?, isFixed = ?, note = ?, period = ? WHERE id = ?')
    stmt.run(categoryId, subcategoryId, amount, isFixed, note, period || 'monthly', id)
    return true
  })

  ipcMain.handle('db-delete-budget', (_, id) => {
    db.prepare('DELETE FROM budget_items WHERE id = ?').run(id)
    return true
  })

  // Income Forecasts
  ipcMain.handle('db-get-income-forecasts', () => {
    return db.prepare('SELECT * FROM income_forecasts').all()
  })

  ipcMain.handle('db-add-income-forecast', (_, { name, amount, period }) => {
    const stmt = db.prepare('INSERT INTO income_forecasts (name, amount, period) VALUES (?, ?, ?)')
    const info = stmt.run(name, amount, period || 'monthly')
    return info.lastInsertRowid
  })

  ipcMain.handle('db-delete-income-forecast', (_, id) => {
    db.prepare('DELETE FROM income_forecasts WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('db-reset-all', () => {
    db.transaction(() => {
      db.prepare('DELETE FROM transactions').run()
      db.prepare('DELETE FROM entities').run()
      db.prepare('DELETE FROM savings_contributions').run()
      db.prepare('DELETE FROM savings_goals').run()
      db.prepare('DELETE FROM recurring_transactions').run()
      db.prepare('DELETE FROM budget_items').run()
      db.prepare('DELETE FROM income_forecasts').run()
      // We keep categories and subcategories as they are the foundation
    })()
    return true
  })

  ipcMain.handle('db-export', async () => {
    const isDev = !app.isPackaged
    const dbPath = isDev 
      ? join(process.cwd(), 'finanzas.db')
      : join(app.getPath('userData'), 'finanzas.db')

    const { filePath } = await dialog.showSaveDialog({
      title: 'Exportar Copia de Seguridad',
      defaultPath: join(app.getPath('downloads'), `bitacora_backup_${new Date().toISOString().split('T')[0]}.db`),
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    })

    if (filePath) {
      fs.copyFileSync(dbPath, filePath)
      return true
    }
    return false
  })

  ipcMain.handle('db-import', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Importar Copia de Seguridad',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile']
    })

    if (filePaths && filePaths.length > 0) {
      const isDev = !app.isPackaged
      const dbPath = isDev 
        ? join(process.cwd(), 'finanzas.db')
        : join(app.getPath('userData'), 'finanzas.db')

      try {
        fs.copyFileSync(filePaths[0], dbPath)
        app.relaunch()
        app.exit(0)
        return true
      } catch (e) {
        console.error('Error importing DB:', e)
        return false
      }
    }
    return false
  })

  // Startup processing
  processRecurringTransactions(db)

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

function processRecurringTransactions(db) {
  const recurring = db.prepare('SELECT * FROM recurring_transactions WHERE active = 1').all()
  const now = new Date()
  const todayDateStr = now.toISOString().split('T')[0]
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  recurring.forEach(r => {
    const startDate = new Date(r.startDate)
    const endDate = r.endDate ? new Date(r.endDate) : null
    
    if (now < startDate) return
    if (endDate && now > endDate) {
      db.prepare('UPDATE recurring_transactions SET active = 0 WHERE id = ?').run(r.id)
      return
    }

    // Determine if we need to execute for this month
    // We check if lastProcessedDate is in this month
    let needsExecution = false
    if (!r.lastProcessedDate) {
      needsExecution = true
    } else {
      const lastDate = new Date(r.lastProcessedDate)
      if (lastDate.getMonth() !== currentMonth || lastDate.getFullYear() !== currentYear) {
        // Only execute if today is >= dayOfMonth
        if (now.getDate() >= r.dayOfMonth) {
          needsExecution = true
        }
      }
    }

    if (needsExecution) {
      db.transaction(() => {
        // 1. Add Transaction
        const execDate = new Date(currentYear, currentMonth, r.dayOfMonth).toISOString().split('T')[0]
        const txnType = r.type || 'gasto'
        const txnNote = r.note || `Automático: ${r.dayOfMonth}/${currentMonth + 1}`

        const stmt = db.prepare(`
          INSERT INTO transactions (date, type, amount, categoryId, subcategoryId, entityId, goalId, note)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        stmt.run(execDate, txnType, r.amount, r.categoryId, r.subcategoryId, r.entityId, r.goalId, txnNote)

        // 2. Update Balance
        if (txnType === 'ingreso') {
          db.prepare('UPDATE entities SET balance = balance + ? WHERE id = ?').run(r.amount, r.entityId)
        } else {
          db.prepare('UPDATE entities SET balance = balance - ? WHERE id = ?').run(r.amount, r.entityId)
        }

        // 3. Update Goal
        if (r.goalId && (txnType === 'gasto' || txnType === 'ahorro' || txnType === 'inversion')) {
          db.prepare('INSERT INTO savings_contributions (goalId, amount, date) VALUES (?, ?, ?)').run(r.goalId, r.amount, execDate)
          db.prepare('UPDATE savings_goals SET currentAmount = currentAmount + ? WHERE id = ?').run(r.amount, r.goalId)
        }

        // 4. Update Recurring State
        db.prepare('UPDATE recurring_transactions SET lastProcessedDate = ? WHERE id = ?').run(todayDateStr, r.id)
      })()
      console.log(`Executed recurring transaction ${r.id} for ${currentMonth + 1}/${currentYear}`)
    }
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
