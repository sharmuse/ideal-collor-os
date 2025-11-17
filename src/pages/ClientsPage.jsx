import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function ClientsPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState(null)

  const emptyForm = {
    name: '',
    document: '',
    phone: '',
    whatsapp: '',
    email: '',
    zip_code: '',
    street: '',
    number: '',
    address_complement: '',
    district: '',
    city: '',
    state: '',
    reference_point: ''
  }

  const [form, setForm] = useState(emptyForm)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function loadClients() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true })

    if (!error) {
      setClients(data)
    } else {
      console.error(error)
      alert('Erro ao carregar clientes: ' + error.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadClients()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    try {
      if (editingId) {
        // ATUALIZAR
        const { error } = await supabase
          .from('clients')
          .update({
            name: form.name,
            document: form.document || null,
            phone: form.phone || null,
            whatsapp: form.whatsapp || null,
            email: form.email || null,
            zip_code: form.zip_code || null,
            street: form.street || null,
            number: form.number || null,
            address_complement: form.address_complement || null,
            district: form.district || null,
            city: form.city || null,
            state: form.state || null,
            reference_point: form.reference_point || null
          })
          .eq('id', editingId)

        if (error) {
          console.error(error)
          alert('Erro ao atualizar cliente: ' + error.message)
          return
        }
      } else {
        // INSERIR
        const { error } = await supabase.from('clients').insert([
          {
            name: form.name,
            document: form.document || null,
            phone: form.phone || null,
            whatsapp: form.whatsapp || null,
            email: form.email || null,
            zip_code: form.zip_code || null,
            street: form.street || null,
            number: form.number || null,
            address_complement: form.address_complement || null,
            district: form.district || null,
            city: form.city || null,
            state: form.state || null,
            reference_point: form.reference_point || null
          }
        ])

        if (error) {
          console.error(error)
          alert('Erro ao salvar cliente: ' + error.message)
          return
        }
      }

      setForm(emptyForm)
      setEditingId(null)
      await loadClients()
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(client) {
    setEditingId(client.id)
    setForm({
      name: client.name || '',
      document: client.document || '',
      phone: client.phone || '',
      whatsapp: client.whatsapp || '',
      email: client.email || '',
      zip_code: client.zip_code || '',
      street: client.street || '',
      number: client.number || '',
      address_complement: client.address_complement || '',
      district: client.district || '',
      city: client.city || '',
      state: client.state || '',
      reference_point: client.reference_point || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(id) {
    const ok = window.confirm('Tem certeza que deseja remover este cliente?')
    if (!ok) return

    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) {
      console.error(error)
      alert('Erro ao remover cliente: ' + error.message)
      return
    }
    await loadClients()
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
  }

  return (
    <div>
      <h2>Cadastro de Clientes</h2>
      <p>Clientes da IDEAL COLLOR que podem receber obras, materiais e ordens de serviço.</p>

      <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        <div className="form-card">
          <h3>{editingId ? 'Editar cliente' : 'Novo cliente'}</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Nome / Razão Social *
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              CPF / CNPJ
              <input
                name="document"
                value={form.document}
                onChange={handleChange}
              />
            </label>

            <label>
              Telefone
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="(DDD) 0000-0000"
              />
            </label>

            <label>
              WhatsApp
              <input
                name="whatsapp"
                value={form.whatsapp}
                onChange={handleChange}
                placeholder="(DDD) 00000-0000"
              />
            </label>

            <label>
              E-mail
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="cliente@exemplo.com"
              />
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
                placeholder="Rua, avenida, estrada..."
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
                placeholder="Bloco, apto, lote, sala..."
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
                placeholder="DF, GO, SP..."
              />
            </label>

            <label>
              Ponto de referência
              <input
                name="reference_point"
                value={form.reference_point}
                onChange={handleChange}
                placeholder="Próximo a..., esquina com..."
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
              {saving
                ? (editingId ? 'Atualizando...' : 'Salvando...')
                : (editingId ? 'Atualizar cliente' : 'Salvar cliente')}
            </button>

            {editingId && (
              <button
                type="button"
                className="button-secondary"
                onClick={handleCancelEdit}
              >
                Cancelar edição
              </button>
            )}
          </div>
        </div>
      </div>

      <h3>Clientes cadastrados</h3>

      {loading ? (
        <p>Carregando clientes...</p>
      ) : clients.length === 0 ? (
        <p>Nenhum cliente cadastrado.</p>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Documento</th>
                <th>Contato</th>
                <th>Cidade/UF</th>
                <th className="table-actions-col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.document}</td>
                  <td>
                    {c.phone}
                    {c.whatsapp && ` | WhatsApp: ${c.whatsapp}`}
                    {c.email && ` | ${c.email}`}
                  </td>
                  <td>
                    {c.city} {c.state && `/${c.state}`}
                  </td>
                  <td className="table-actions">
                    <button
                      type="button"
                      className="button-secondary button-xs"
                      onClick={() => handleEdit(c)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="button-danger button-xs"
                      onClick={() => handleDelete(c.id)}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ClientsPage
