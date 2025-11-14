import React from 'react'
import { Link } from 'react-router-dom'

function DashboardPage() {
  return (
    <div>
      <h2>Dashboard IDEAL COLLOR</h2>
      <p>Bem-vindo ao sistema de Ordem de Serviço e Gestão de Materiais.</p>

      <div style={{ marginTop: '1rem' }}>
        <h3>Atalhos principais</h3>
        <ul>
          <li><Link to="/clients">Cadastro de Clientes</Link></li>
          <li><Link to="/sites">Cadastro de Obras / Locais de serviço</Link></li>
          <li><Link to="/products">Cadastro de Produtos / Materiais</Link></li>
          <li><Link to="/services">Cadastro de Serviços</Link></li>
          <li><Link to="/orders">Ordens de Serviço</Link></li>
          <li><Link to="/reports">Relatórios</Link></li>
          <li><Link to="/backup">Backups (CSV/Excel)</Link></li>
        </ul>
      </div>
    </div>
  )
}

export default DashboardPage
