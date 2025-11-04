import React, { createContext, useContext, useState, type ReactNode } from 'react'
import Alert, { type AlertType } from '../components/Alert'

interface AlertContextType {
  showAlert: (message: string, type?: AlertType, duration?: number) => void
  showSuccess: (message: string, duration?: number) => void
  showError: (message: string, duration?: number) => void
  showWarning: (message: string, duration?: number) => void
  showInfo: (message: string, duration?: number) => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export const useAlert = (): AlertContextType => {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider')
  }
  return context
}

interface AlertState {
  message: string
  type: AlertType
  duration: number
  id: number
}

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<AlertState | null>(null)

  const showAlert = (message: string, type: AlertType = 'info', duration: number = 0) => {
    setAlert({
      message,
      type,
      duration,
      id: Date.now()
    })
  }

  const showSuccess = (message: string, duration: number = 4000) => {
    showAlert(message, 'success', duration)
  }

  const showError = (message: string, duration: number = 0) => {
    showAlert(message, 'error', duration)
  }

  const showWarning = (message: string, duration: number = 5000) => {
    showAlert(message, 'warning', duration)
  }

  const showInfo = (message: string, duration: number = 4000) => {
    showAlert(message, 'info', duration)
  }

  const handleClose = () => {
    setAlert(null)
  }

  return (
    <AlertContext.Provider value={{ showAlert, showSuccess, showError, showWarning, showInfo }}>
      {children}
      {alert && (
        <Alert
          key={alert.id}
          message={alert.message}
          type={alert.type}
          duration={alert.duration}
          onClose={handleClose}
        />
      )}
    </AlertContext.Provider>
  )
}
