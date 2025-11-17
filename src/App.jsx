import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ClientsPage from './pages/ClientsPage'
import SitesPage from './pages/SitesPage'
import ProductsPage from './pages/ProductsPage'
import ServicesPage from './pages/ServicesPage'
import OrdersPage from './pages/OrdersPage'
import OrderPrintPage from './pages/OrderPrintPage'
import OrderSignPage from './pages/OrderSignPage'
import BackupPage from './pages/BackupPage'
import ReportsPage from './pages/ReportsPage'
import NotFoundPage from './pages/NotFoundPage'
import ProtectedRoute from './components/ProtectedRoute'
import logo from './assets/logo-idealcollor.png'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function getSession() {
      const { data, error } = await supabase.auth.getUser()
      if (!error) {
        setUser(data.user ?? null)
      }
      setLoading(false)
    }

    getSession()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'SIGNED_OUT') {
        navigate('/login')
      }
      if (event === 'SIGNED_IN') {
        navigate('/')
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [navigate])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="centered">
        <p>Carregando...</p>
      </div>
    )
  }

  return (
    <div className="app-container">
      <header className="app-header no-print">
        <div className="header-top">
          <div className="brand">
            <img src={logo} alt="Ideal Collor" className="brand-logo" />
            <div className="brand-text">
              <span className="brand-title">IDEAL COLLOR</span>
              <span className="brand-subtitle">Sistema de Ordem de Serviço</span>
            </div>
          </div>
          {user && (
            <div className="user-info">
              <span>{user.email}</span>
              <button onClick={handleLogout}>Sair</button>
            </div>
          )}
        </div>
        <nav>
          {user && (
            <>
              <Link to="/">Dashboard</Link>
              <Link to="/clients">Clientes</Link>
              <Link to="/sites">Obras</Link>
              <Link to="/products">Produtos</Link>
              <Link to="/services">Serviços</Link>
              <Link to="/orders">Ordens de Serviço</Link>
              <Link to="/reports">Relatórios</Link>
              <Link to="/backup">Backups</Link>
            </>
          )}
          {!user && <Link to="/login">Login</Link>}
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          {/* Login */}
          <Route path="/login" element={<LoginPage user={user} />} />

          {/* Dashboard */}
          <Route
            path="/"
            element={
              <ProtectedRoute user={user}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Clientes */}
          <Route
            path="/clients"
            element={
              <ProtectedRoute user={user}>
                <ClientsPage />
              </ProtectedRoute>
            }
          />

          {/* Obras */}
          <Route
            path="/sites"
            element={
              <ProtectedRoute user={user}>
                <SitesPage />
              </ProtectedRoute>
            }
          />

          {/* Produtos */}
          <Route
            path="/products"
            element={
              <ProtectedRoute user={user}>
                <ProductsPage />
              </ProtectedRoute>
            }
          />

          {/* Serviços */}
          <Route
            path="/services"
            element={
              <ProtectedRoute user={user}>
                <ServicesPage />
              </ProtectedRoute>
            }
          />

          {/* Lista / criação de OS */}
          <Route
            path="/orders"
            element={
              <ProtectedRoute user={user}>
                <OrdersPage />
              </ProtectedRoute>
            }
          />

          {/* Impressão da OS 
              Aqui usamos /orders/:id porque é isso que o botão de imprimir usa */}
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute user={user}>
                <OrderPrintPage />
              </ProtectedRoute>
            }
          />

          {/* Assinatura eletrônica da OS
              Deixamos sem ProtectedRoute para o cliente conseguir assinar pelo link */}
          <Route
            path="/orders/:id/sign"
            element={<OrderSignPage />}
          />

          {/* Relatórios */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute user={user}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          {/* Backups */}
          <Route
            path="/backup"
            element={
              <ProtectedRoute user={user}>
                <BackupPage />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
