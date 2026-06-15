import React, { createContext, useState, useContext, useEffect } from 'react'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('app-language')
    return saved === 'id' ? 'id' : 'en'
  })

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'id' : 'en'
    setLanguage(newLang)
    localStorage.setItem('app-language', newLang)
  }

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}