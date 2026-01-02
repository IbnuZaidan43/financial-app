import { useState, useEffect } from 'react'
import type { Tabungan, Transaksi } from '@prisma/client'

interface Transaction {
  id: number
  judul: string
  jumlah: number
  deskripsi?: string
  tanggal: string
  tipe: 'pemasukan' | 'pengeluaran'
  kategoriId?: number
  kategori?: {
    id: number
    nama: string
    jenis: string
    icon?: string
    warna?: string
  }
}

// Gunakan type dari Prisma agar selalu sync
type Savings = Tabungan

interface DashboardStats {
  totalPemasukan: number
  totalPengeluaran: number
  saldo: number
  recentTransactions: Transaction[]
  dailyData: Array<{
    day: number
    pemasukan: number
    pengeluaran: number
  }>
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/transactions')
      if (!response.ok) throw new Error('Failed to fetch transactions')
      const data = await response.json()
      setTransactions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const createTransaction = async (transactionData: Omit<Transaction, 'id' | 'kategori'>) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      })
      if (!response.ok) throw new Error('Failed to create transaction')
      const newTransaction = await response.json()
      setTransactions(prev => [newTransaction, ...prev])
      return newTransaction
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
    createTransaction
  }
}

export function useSavings() {
  const [savings, setSavings] = useState<Savings[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSavings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/savings')
      if (!response.ok) throw new Error('Failed to fetch savings')
      const data = await response.json()
      setSavings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const createSavings = async (savingsData: Omit<Savings, 'id' | 'jumlah' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await fetch('/api/savings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(savingsData),
      })
      if (!response.ok) throw new Error('Failed to create savings')
      const newSavings = await response.json()
      setSavings(prev => [newSavings, ...prev])
      return newSavings
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  const updateSavings = async (id: number, jumlah: number) => {
    try {
      const response = await fetch('/api/savings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, jumlah }),
      })
      if (!response.ok) throw new Error('Failed to update savings')
      const updatedSavings = await response.json()
      setSavings(prev => 
        prev.map(saving => 
          saving.id === id ? updatedSavings : saving
        )
      )
      return updatedSavings
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  useEffect(() => {
    fetchSavings()
  }, [])

  return {
    savings,
    loading,
    error,
    refetch: fetchSavings,
    createSavings,
    updateSavings
  }
}

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard')
      if (!response.ok) throw new Error('Failed to fetch dashboard stats')
      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}