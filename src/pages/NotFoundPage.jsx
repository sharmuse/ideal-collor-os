import React from 'react'
import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <div>
      <h2>Página não encontrada</h2>
      <p>A rota que você tentou acessar não existe.</p>
      <Link to="/">Voltar para o início</Link>
    </div>
  )
}

export default NotFoundPage
