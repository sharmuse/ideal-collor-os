import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

function LoginPage({ user }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setError(error.message)
    }

    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) {
      setError(error.message)
    } else {
      setError('Cadastro realizado. Verifique seu e-mail se for solicitado pelo Supabase.')
    }

    setLoading(false)
  }

  return (
    <div className="centered">
      <div className="form-card">
        <h2>Login IDEAL COLLOR</h2>
        <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
          Use seu e-mail e senha para acessar o sistema.
          Se ainda não tiver usuário, cadastre-se abaixo.
        </p>

        <form className="form-grid" onSubmit={handleLogin}>
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </label>

          {error && (
            <div style={{ color: 'red', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="button-primary" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <button
              type="button"
              onClick={handleRegister}
              disabled={loading}
            >
              Cadastrar usuário
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
