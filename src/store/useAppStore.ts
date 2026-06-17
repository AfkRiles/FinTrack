import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Currency, Theme, Tab, FXRate } from '../types'

interface AppState {
  currency: Currency
  theme: Theme
  activeTab: Tab
  fxRate: FXRate | null
  lastFXFetch: number

  setCurrency: (c: Currency) => void
  setTheme: (t: Theme) => void
  setActiveTab: (t: Tab) => void
  setFXRate: (rate: FXRate) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currency: 'ZAR',
      theme: 'system',
      activeTab: 'income',
      fxRate: null,
      lastFXFetch: 0,

      setCurrency: (currency) => set({ currency }),
      setTheme: (theme) => set({ theme }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setFXRate: (fxRate) => set({ fxRate, lastFXFetch: Date.now() }),
    }),
    {
      name: 'fintrack-settings',
    }
  )
)
