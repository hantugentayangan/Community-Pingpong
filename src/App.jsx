import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Players from './pages/Players'
import Ptm from './pages/Ptm'
import News from './pages/News'
import NewsDetail from './pages/NewsDetail'
import Marketplace from './pages/Marketplace'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import MyPtm from './pages/MyPtm'
import Admin from './pages/Admin'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/players" element={<Players />} />
            <Route path="/ptm" element={<Ptm />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/:id" element={<NewsDetail />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-ptm" element={<MyPtm />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
      </BrowserRouter>
    </LanguageProvider>
  )
}

export default App