import React, { createContext, useContext, useState, type ReactNode } from 'react'
import PromptDialog from '../components/PromptDialog'

interface PromptOptions {
  defaultValue?: string
  placeholder?: string
  confirmText?: string
  cancelText?: string
  inputType?: 'text' | 'number'
  min?: number
  max?: number
}

interface PromptContextType {
  showPrompt: (message: string, options?: PromptOptions) => Promise<string | null>
}

const PromptContext = createContext<PromptContextType | undefined>(undefined)

export const usePrompt = (): PromptContextType => {
  const context = useContext(PromptContext)
  if (!context) {
    throw new Error('usePrompt must be used within a PromptProvider')
  }
  return context
}

interface PromptState {
  message: string
  defaultValue: string
  placeholder: string
  confirmText: string
  cancelText: string
  inputType: 'text' | 'number'
  min?: number
  max?: number
  id: number
  resolver: (value: string | null) => void
}

export const PromptProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [prompt, setPrompt] = useState<PromptState | null>(null)
  const [idCounter, setIdCounter] = useState(0)

  const showPrompt = (
    message: string,
    options: PromptOptions = {}
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      const newId = idCounter + 1
      setIdCounter(newId)
      setPrompt({
        message,
        defaultValue: options.defaultValue || '',
        placeholder: options.placeholder || '',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        inputType: options.inputType || 'text',
        min: options.min,
        max: options.max,
        id: newId,
        resolver: resolve
      })
    })
  }

  const handleConfirm = (value: string) => {
    if (prompt) {
      prompt.resolver(value)
      setPrompt(null)
    }
  }

  const handleCancel = () => {
    if (prompt) {
      prompt.resolver(null)
      setPrompt(null)
    }
  }

  return (
    <PromptContext.Provider value={{ showPrompt }}>
      {children}
      {prompt && (
        <PromptDialog
          key={prompt.id}
          message={prompt.message}
          defaultValue={prompt.defaultValue}
          placeholder={prompt.placeholder}
          confirmText={prompt.confirmText}
          cancelText={prompt.cancelText}
          inputType={prompt.inputType}
          min={prompt.min}
          max={prompt.max}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </PromptContext.Provider>
  )
}
