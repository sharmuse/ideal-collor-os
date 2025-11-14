import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function SitesPage() {
  const [clients, setClients] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    client_id: '',
    zip_code: '',
    street: '',
    number: '',
    address_complement: '',
    district: '',
    city: '',
    state: '',
    reference_point: '',
    main_service_type: '',
    area_m2: '',
    technical_notes: ''
  })

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function loadData() {
    setLoading(true)

    const [clientsRes, sitesRes] = await Promise.all([
      supabase.from('clients').select('id, name').order('name', { ascending: true }),
      supabase
        .from('sites')
        .select(`id, client_id, zip_code, street, number, address_complement, district, city, state, reference_point, main_service_type, area_m2, technical_notes, clients:client_id (name)`)
        .order('created_at', { ascending: false })
    ])

    if (!clientsRes.error) setClients(clientsRes.data)
    if (!sitesRes.error) setSites(sitesRes.data)

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase.from('sites').insert([
        {
          client_id: form.client_id || null,
          zip_code: form.zip_code || null,
          street: form.street || null,
          number: form.number || null,
          address_complement: form.address_complement || null,
          district: form.district || null,
          city: form.city || null,
          state: form.state || null,
          reference_point: form.reference_point || null,
          main_service_type: form.main_service_type || null,
          area_m2: form.area_m2 ? Number(form.area_m2) : null,
          technical_notes: form.technical_notes || null
        }
      ])

      if (error) {
        console.error(error)
        alert('Erro ao salvar obra/local: ' + error.message)
        return
      }

      setForm({
        client_id: '',
        zip_code: '',
        street: '',
        number: '',
        address_complement: '',
        district: '',
        city: '',
        state: '',
        reference_point: '',
        main_service_type: '',
        area_m2: '',
        technical_notes: ''
      })

      await loadData()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2>Cadastro de Obras / Locais de serviço</h2>
      <p>
        Locais onde os serviços da IDEAL COLLOR serão executados, vinculados a um cliente.
      </p>

      {/* FORMULÁRIO */}
      <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        <div className="form-card">
          <h3>Nova obra / local</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Cliente *
              <select
                name="client_id"
                value={form.client_id}
                onChange={handleChange}
                required
              >
                <option value="">Selecione um cliente</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              CEP
              <input
                name="zip_code"
                value={form.zip_code}
                onChange={handleChange}
                placeholder="00000-000"
              />
            </label>

            <label>
              Rua / Avenida
              <input
                name="street"
                value={form.street}
                onChange={handleChange}
                placeholder="Rua, avenida, condomínio..."
              />
            </label>

            <label>
              Número
              <input
                name="number"
                value={form.number}
                onChange={handleChange}
                placeholder="Nº"
              />
            </label>

            <label>
              Complemento
              <input
                name="address_complement"
                value={form.address_complement}
                onChange={handleChange}
                placeholder="Bloco, casa, lote, torre..."
              />
            </label>

            <label>
              Bairro
              <input
                name="district"
                value={form.district}
                onChange={handleChange}
              />
            </label>

            <label>
              Cidade
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
              />
            </label>

            <label>
              UF
              <input
                name="state"
                value={form.state}
                onChange={handleChange}
                maxLength={2}
                placeholder="DF, GO..."
              />
            </label>

            <label>
              Ponto de referência
              <input
                name="reference_point"
                value={form.reference_point}
                onChange={handleChange}
                placeholder="Próximo a..., condomínio..., esquina com..."
              />
            </label>

            <label>
              Tipo de serviço principal
              <input
                name="main_service_type"
                value={form.main_service_type}
                onChange={handleChange}
                placeholder="Fulget, toque de brilho, grafiato..."
              />
            </label>

            <label>
              Metragem aproximada (m²)
              <input
                type="number"
                step="0.01"
                name="area_m2"
                value={form.area_m2}
                onChange={handleChange}
              />
            </label>

            <label>
              Observações técnicas da obra
              <textarea
                name="technical_notes"
                value={form.technical_notes}
                onChange={handleChange}
                rows={3}
              />
            </label>
          </form>

          <div className="form-actions">
            <button
              type="button"
              className="button-primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar obra/local'}
            </button>
          </div>
        </div>
      </div>

      {/* LISTA */}
      <h3>Obras / locais cadastrados</h3>

      {loading ? (
        <p>Carregando obras...</p>
      ) : sites.length === 0 ? (
        <p>Nenhuma obra cadastrada.</p>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Endereço</th>
                <th>Cidade/UF</th>
                <th>Serviço principal</th>
                <th>Metragem (m²)</th>
              </tr>
            </thead>
            <tbody>
              {sites.map(s => (
                <tr key={s.id}>
                  <td>{s.clients?.name}</td>
                  <td>
                    {s.street}, {s.number}
                    {s.address_complement && ` - ${s.address_complement}`}
                    {' - '}
                    {s.district}
                  </td>
                  <td>
                    {s.city} {s.state && `/${s.state}`}
                  </td>
                  <td>{s.main_service_type}</td>
                  <td>{s.area_m2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default SitesPage
