import React from 'react'
import './TableTennisHero.css' // we'll put styles inside global.css later, but let's inline in component

export function TableTennisHero() {
  return (
    <div className="hero-visual">
      <div className="hero-visual-content">
        {/* Paddle shape */}
        <div className="paddle paddle-left"></div>
        <div className="paddle paddle-right"></div>
        {/* Ball with motion trail */}
        <div className="ball"></div>
        <div className="ball-trail"></div>
        {/* Table / net lines */}
        <div className="table-net"></div>
        <div className="table-line"></div>
        {/* Lime streaks */}
        <div className="lime-streak streak-1"></div>
        <div className="lime-streak streak-2"></div>
        <div className="lime-streak streak-3"></div>
        {/* Floating tech cards */}
        <div className="tech-card">Supabase 🔐</div>
        <div className="tech-card">Netlify ⚡</div>
      </div>
    </div>
  )
}