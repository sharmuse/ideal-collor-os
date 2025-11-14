import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function ServicesPage() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    unit: '',
    labor_price_unit: '',
    estimated_time: ''
  })

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function loadServices() {
    setLoading(true)
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) {
      setServices(data)
    } else {
      console.error(error)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadServices()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    const payload = {
      ...form,
      labor_price_unit: form.labor_price_unit ? Number(form.labor_price_unit) : null
    }

    const { error } = await supabase.from('services').insert([payload])

    if (error) {
      console.error(error)
      alert('Erro ao salvar serviço: ' + error.message)
    } else {
      setForm({
        name: '',
        description: '',
        unit: '',
        labor_price_unit: '',
        estimated_time: ''
      })
      await loadServices()
    }

    setSaving(false)
  }

  return (
    <div>
      <h2>Serviços</h2>
      <p>Cadastro dos serviços prestados pela IDEAL COLLOR.</p>

      <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        <div className="form-card">
          <h3>Novo Serviço</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Nome do serviço
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Descrição
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
              />
            </label>

            <label>
              Unidade de cobrança (m², diária, hora...)
              <input
                name="unit"
                value={form.unit}
                onChange={handleChange}
              />
            </label>

            <label>
              Valor de mão de obra por unidade (R$)
              <input
                type="number"
                step="0.01"
                name="labor_price_unit"
                value={form.labor_price_unit}
                onChange={handleChange}
              />
            </label>

            <label>
              Tempo estimado (opcional)
              <input
                name="estimated_time"
                placeholder="Ex.: 2 dias, 3 horas..."
                value={form.estimated_time}
                onChange={handleChange}
              />
            </label>

            <div className="form-actions">
              <button type="submit" className="button-primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar serviço'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <h3>Lista de serviços</h3>

      {loading ? (
        <p>Carregando serviços...</p>
      ) : services.length === 0 ? (
        <p>Nenhum serviço cadastrado ainda.</p>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Unidade</th>
                <th>Valor mão de obra</th>
                <th>Tempo estimado</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {services.map(s => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.unit}</td>
                  <td>{s.labor_price_unit}</td>
                  <td>{s.estimated_time}</td>
                  <td>{s.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ServicesPage
