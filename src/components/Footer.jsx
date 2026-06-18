import React from 'react'

const address = 'Jl. H. Dehir, RT.008/RW.002, Jatiluhur, Kec. Jatiasih, Kota Bks, Jawa Barat 17425'
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

export default function Footer() {
  return (
    <footer className="ttc-footer">
      <div className="ttc-footer-inner">
        <div className="ttc-footer-brand">
          <h2>Indonesian Table Tennis Community</h2>
          <p>Portal komunitas tenis meja Indonesia untuk pemain, PTM/Club, pertandingan, marketplace, dan informasi komunitas.</p>
        </div>
        <div className="ttc-footer-links">
          <a href="mailto:indtabletennis@gmail.com">indtabletennis@gmail.com</a>
          <a href="https://wa.me/6287787367243" target="_blank" rel="noopener noreferrer">+6287787367243</a>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">{address}</a>
        </div>
      </div>
      <div className="ttc-footer-bottom">
        © 2026 Indonesian Table Tennis Community. All rights reserved.
      </div>
    </footer>
  )
}
