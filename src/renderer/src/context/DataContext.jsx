import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const DataContext = createContext()

export function DataProvider({ children }) {
  const [entities, setEntities] = useState([])
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [savingsGoals, setSavingsGoals] = useState([])
  const [contributions, setContributions] = useState([])
  const [recurringTransactions, setRecurringTransactions] = useState([])
  const [budgetItems, setBudgetItems] = useState([])
  const [incomeForecasts, setIncomeForecasts] = useState([])
  const [loading, setLoading] = useState(true)
  const [ledgerFormRequested, setLedgerFormRequested] = useState(false)

  const refreshData = useCallback(async () => {
    setLoading(true)
    try {
      const [ent, cat, txs, goals, con, rec, budget, income] = await Promise.all([
        window.api.getEntities(),
        window.api.getCategories(),
        window.api.getTransactions(),
        window.api.getSavingsGoals(),
        window.api.getAllContributions(),
        window.api.getRecurringTransactions(),
        window.api.getBudget(),
        window.api.getIncomeForecasts()
      ])
      setEntities(ent)
      setCategories(cat)
      setTransactions(txs)
      setSavingsGoals(goals)
      setContributions(con)
      setRecurringTransactions(rec)
      setBudgetItems(budget)
      setIncomeForecasts(income)
      console.log('DataContext: Data refreshed successfully')
    } catch (error) {
      console.error('DataContext: Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const value = {
    entities,
    categories,
    transactions,
    savingsGoals,
    contributions,
    recurringTransactions,
    loading,
    refreshData,
    ledgerFormRequested,
    setLedgerFormRequested,
    addTransaction: async (txn) => {
      await window.api.addTransaction(txn)
      await refreshData()
    },
    deleteTransaction: async (id) => {
      await window.api.deleteTransaction(id)
      await refreshData()
    },
    editTransaction: async (txn) => {
      await window.api.editTransaction(txn)
      await refreshData()
    },
    addEntity: async (ent) => {
      await window.api.addEntity(ent)
      await refreshData()
    },
    deleteEntity: async (id) => {
      await window.api.deleteEntity(id)
      await refreshData()
    },
    addCategory: async (cat) => {
      await window.api.addCategory(cat)
      await refreshData()
    },
    deleteCategory: async (id) => {
      await window.api.deleteCategory(id)
      await refreshData()
    },
    addSubcategory: async (sub) => {
      await window.api.addSubcategory(sub)
      await refreshData()
    },
    deleteSubcategory: async (id) => {
      await window.api.deleteSubcategory(id)
      await refreshData()
    },
    createReminder: async (data) => {
      return await window.api.createAppleReminder(data)
    },
    // Savings Goals
    addSavingsGoal: async (goal) => {
      console.log('DataContext: Calling window.api.addSavingsGoal')
      await window.api.addSavingsGoal(goal)
      console.log('DataContext: Saving goal finished, refreshing data')
      await refreshData()
    },
    editSavingsGoal: async (goal) => {
      await window.api.editSavingsGoal(goal)
      await refreshData()
    },
    deleteSavingsGoal: async (id) => {
      await window.api.deleteSavingsGoal(id)
      await refreshData()
    },
    recordSavingsContribution: async (goalId, amount) => {
      const date = new Date().toISOString().split('T')[0]
      await window.api.addSavingsContribution({ goalId, amount, date })
      await refreshData()
    },
    getGoalContributions: async (goalId) => {
      return await window.api.getSavingsContributions(goalId)
    },
    // Recurring Transactions
    addRecurringTransaction: async (data) => {
      await window.api.addRecurringTransaction(data)
      await refreshData()
    },
    editRecurringTransaction: async (data) => {
      await window.api.editRecurringTransaction(data)
      await refreshData()
    },
    deleteRecurringTransaction: async (id) => {
      await window.api.deleteRecurringTransaction(id)
      await refreshData()
    },
    // Budgeting
    budgetItems,
    incomeForecasts,
    addBudget: async (data) => {
      await window.api.addBudget(data)
      await refreshData()
    },
    editBudget: async (data) => {
      await window.api.editBudget(data)
      await refreshData()
    },
    deleteBudget: async (id) => {
      await window.api.deleteBudget(id)
      await refreshData()
    },
    addIncomeForecast: async (data) => {
      await window.api.addIncomeForecast(data)
      await refreshData()
    },
    deleteIncomeForecast: async (id) => {
      await window.api.deleteIncomeForecast(id)
      await refreshData()
    }
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
