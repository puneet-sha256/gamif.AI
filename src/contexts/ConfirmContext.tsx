import React, { createContext, useContext, useState, type ReactNode } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

interface ConfirmContextType {
  showConfirm: (message: string, confirmText?: string, cancelText?: string) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined)

export const useConfirm = (): ConfirmContextType => {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}

interface ConfirmState {
  message: string
  confirmText: string
  cancelText: string
  id: number
  resolver: (value: boolean) => void
}

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  const showConfirm = (
    message: string,
    confirmText: string = 'Confirm',
    cancelText: string = 'Cancel'
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirm({
        message,
        confirmText,
        cancelText,
        id: Date.now(),
        resolver: resolve
      })
    })
  }

  const handleConfirm = () => {
    if (confirm) {
      confirm.resolver(true)
      setConfirm(null)
    }
  }

  const handleCancel = () => {
    if (confirm) {
      confirm.resolver(false)
      setConfirm(null)
    }
  }

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      {confirm && (
        <ConfirmDialog
          key={confirm.id}
          message={confirm.message}
          confirmText={confirm.confirmText}
          cancelText={confirm.cancelText}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  )
}
