import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Entities
  getEntities: () => ipcRenderer.invoke('db-get-entities'),
  addEntity: (data) => ipcRenderer.invoke('db-add-entity', data),
  editEntity: (data) => ipcRenderer.invoke('db-edit-entity', data),
  deleteEntity: (id) => ipcRenderer.invoke('db-delete-entity', id),

  // Categories
  getCategories: () => ipcRenderer.invoke('db-get-categories'),
  addCategory: (data) => ipcRenderer.invoke('db-add-category', data),
  deleteCategory: (id) => ipcRenderer.invoke('db-delete-category', id),
  addSubcategory: (data) => ipcRenderer.invoke('db-add-subcategory', data),
  deleteSubcategory: (id) => ipcRenderer.invoke('db-delete-subcategory', id),

  // Transactions
  getTransactions: () => ipcRenderer.invoke('db-get-transactions'),
  addTransaction: (data) => ipcRenderer.invoke('db-add-transaction', data),
  editTransaction: (data) => ipcRenderer.invoke('db-edit-transaction', data),
  deleteTransaction: (id) => ipcRenderer.invoke('db-delete-transaction', id),

  // Utilities
  createAppleReminder: (data) => ipcRenderer.invoke('create-apple-reminder', data),

  // Savings Goals
  getSavingsGoals: () => ipcRenderer.invoke('db-get-savings-goals'),
  addSavingsGoal: (goal) => ipcRenderer.invoke('db-add-savings-goal', goal),
  editSavingsGoal: (goal) => ipcRenderer.invoke('db-edit-savings-goal', goal),
  deleteSavingsGoal: (id) => ipcRenderer.invoke('db-delete-savings-goal', id),
  addSavingsContribution: (data) => ipcRenderer.invoke('db-add-savings-contribution', data),
  getSavingsContributions: (goalId) => ipcRenderer.invoke('db-get-savings-contributions', goalId),
  getAllContributions: () => ipcRenderer.invoke('db-get-all-contributions'),

  // Recurring Transactions
  getRecurringTransactions: () => ipcRenderer.invoke('db-get-recurring'),
  addRecurringTransaction: (data) => ipcRenderer.invoke('db-add-recurring', data),
  editRecurringTransaction: (data) => ipcRenderer.invoke('db-edit-recurring', data),
  deleteRecurringTransaction: (id) => ipcRenderer.invoke('db-delete-recurring', id),
  
  // Budgeting
  getBudget: () => ipcRenderer.invoke('db-get-budget'),
  addBudget: (data) => ipcRenderer.invoke('db-add-budget', data),
  editBudget: (data) => ipcRenderer.invoke('db-edit-budget', data),
  deleteBudget: (id) => ipcRenderer.invoke('db-delete-budget', id),
  getIncomeForecasts: () => ipcRenderer.invoke('db-get-income-forecasts'),
  addIncomeForecast: (data) => ipcRenderer.invoke('db-add-income-forecast', data),
  deleteIncomeForecast: (id) => ipcRenderer.invoke('db-delete-income-forecast', id),
  resetAllData: () => ipcRenderer.invoke('db-reset-all'),
  exportDatabase: () => ipcRenderer.invoke('db-export'),
  importDatabase: () => ipcRenderer.invoke('db-import')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
