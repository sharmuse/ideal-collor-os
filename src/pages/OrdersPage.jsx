import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function OrderFormPage() {
  const [clients, setClients] = useState([])
  const [sites, setSites] = useState([])
  const [services, setServices] = useState([])
  const [products, setProducts] = useState([])

  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    client_id: '',
    site_id: '',
    status: 'Aberta',
    opening_date: '',
    due_date: '',
    payment_type: 'prazo', // 'avista' | 'prazo'
    discount_percent: 0,
    technical_notes: '',
    commercial_notes: ''
  })

  const [serviceLines, setServiceLines] = useState([
    { service_id: '', quantity: '', unit_price: '', line_total: 0 }
  ])

  const [materialLines, setMaterialLines] = useState([
    { product_id: '', quantity: '', unit: '', packaging: '', unit_price: '', total_cost: 0 }
  ])

  // MODAL DE CLIENTE RÁPIDO
  const [showClientModal, setShowClientModal] = useState(false)
  const [savingClient, setSavingClient] = useState(false)
  const [quickClient, setQuickClient] = useState({
    name: '',
    document: '',
    phone: '',
    whatsapp: '',
    email: '',
    city: '',
    state: ''
  })

  function handleFormChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function handleDiscountChange(e) {
    let value = e.target.value.replace(',', '.')
    if (value === '') value = 0
    let num = Number(value)
    if (isNaN(num)) num = 0
    if (num < 0) num = 0
    if (num > 8) num = 8 // máximo 8%
    setForm(prev => ({ ...prev, discount_percent: num }))
  }

  async function loadInitialData() {
    const [clientsRes, sitesRes, servicesRes, productsRes] = await Promise.all([
      supabase.from('clients').select('id, name, city, state').order('name'),
      supabase
        .from('sites')
        .select('id, client_id, street, number, city, state')
        .order('id', { ascending: false }),
      supabase.from('services').select('id, name, unit, unit_price').order('name'),
      supabase.from('products').select('id, type, name, unit, price, color_code').order('name')
    ])

    if (!clientsRes.error) setClients(clientsRes.data)
    if (!sitesRes.error) setSites(sitesRes.data)
    if (!servicesRes.error) setServices(servicesRes.data)
    if (!productsRes.error) setProducts(productsRes.data)
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // ---------- SERVIÇOS ----------

  function handleServiceChange(index, field, value) {
    setServiceLines(prev => {
      const copy = [...prev]
      const line = { ...copy[index] }

      if (field === 'service_id') {
        line.service_id = value
        const service = services.find(s => s.id === value)
        line.unit_price = service?.unit_price ?? ''
      } else if (field === 'quantity') {
        line.quantity = value
      } else if (field === 'unit_price') {
        line.unit_price = value
      }

      const q = Number(String(line.quantity).replace(',', '.')) || 0
      const p = Number(String(line.unit_price).replace(',', '.')) || 0
      line.line_total = q * p

      copy[index] = line
      return copy
    })
  }

  function addServiceLine() {
    setServiceLines(prev => [...prev, { service_id: '', quantity: '', unit_price: '', line_total: 0 }])
  }

  function removeServiceLine(index) {
    setServiceLines(prev => prev.filter((_, i) => i !== index))
  }

  // ---------- MATERIAIS ----------

  function handleMaterialChange(index, field, value) {
    setMaterialLines(prev => {
      const copy = [...prev]
      const line = { ...copy[index] }

      if (field === 'product_id') {
        line.product_id = value
        const product = products.find(p => p.id === value)
        line.unit = product?.unit || ''
        // se quiser, pode usar product.price como sugestão
        line.unit_price = product?.price ?? ''
      } else if (field === 'quantity') {
        line.quantity = value
      } else if (field === 'unit') {
        line.unit = value
      } else if (field === 'packaging') {
        line.packaging = value
      } else if (field === 'unit_price') {
        line.unit_price = value
      }

      const q = Number(String(line.quantity).replace(',', '.')) || 0
      const p = Number(String(line.unit_price).replace(',', '.')) || 0
      line.total_cost = q * p

      copy[index] = line
      return copy
    })
  }

  function addMaterialLine() {
    setMaterialLines(prev => [
      ...prev,
      { product_id: '', quantity: '', unit: '', packaging: '', unit_price: '', total_cost: 0 }
    ])
  }

  function removeMaterialLine(index) {
    setMaterialLines(prev => prev.filter((_, i) => i !== index))
  }

  // ---------- CÁLCULOS DE TOTAIS ----------

  const totalServices = serviceLines.reduce((sum, line) => sum + (Number(line.line_total) || 0), 0)
  const totalMaterials = materialLines.reduce((sum, line) => sum + (Number(line.total_cost) || 0), 0)
  const totalGeneral = totalServices + totalMaterials
  const discountValue = totalGeneral * (Number(form.discount_percent) || 0) / 100
  const totalFinal = totalGeneral - discountValue

  // ---------- SALVAR OS ----------

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    try {
      // gera um número de OS simples (pode ser substituído por sequence no banco)
      const orderNumber = `OS-${Date.now().toString().slice(-6)}`

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            order_number: orderNumber,
            client_id: form.client_id || null,
            site_id: form.site_id || null,
            status: form.status || 'Aberta',
            opening_date: form.opening_date || null,
            due_date: form.due_date || null,
            payment_type: form.payment_type || 'prazo',
            technical_notes: form.technical_notes || null,
            commercial_notes: form.commercial_notes || null,
            discount_percent: Number(form.discount_percent) || 0,
            discount_value: discountValue,
            total_services: totalServices,
            total_materials: totalMaterials,
            total_general: totalGeneral,
            total_final: totalFinal
          }
        ])
        .select()
        .single()

      if (orderError) {
        console.error(orderError)
        alert('Erro ao salvar ordem de serviço: ' + orderError.message)
        return
      }

      const orderId = orderData.id

      // serviços
      const servicePayload = serviceLines
        .filter(l => l.service_id && l.quantity)
        .map(l => ({
          order_id: orderId,
          service_id: l.service_id,
          quantity: Number(l.quantity) || 0,
          unit_price: Number(l.unit_price) || 0,
          line_total: Number(l.line_total) || 0
        }))

      if (servicePayload.length > 0) {
        const { error } = await supabase.from('order_services').insert(servicePayload)
        if (error) {
          console.error(error)
          alert('Erro ao salvar serviços da OS: ' + error.message)
          return
        }
      }

      // materiais
      const materialPayload = materialLines
        .filter(l => l.product_id && l.quantity)
        .map(l => ({
          order_id: orderId,
          product_id: l.product_id,
          quantity: Number(l.quantity) || 0,
          unit: l.unit || null,
          packaging: l.packaging || null,
          unit_price: Number(l.unit_price) || 0,
          total_cost: Number(l.total_cost) || 0
        }))

      if (materialPayload.length > 0) {
        const { error } = await supabase.from('order_materials').insert(materialPayload)
        if (error) {
          console.error(error)
          alert('Erro ao salvar materiais da OS: ' + error.message)
          return
        }
      }

      alert('Ordem de serviço salva com sucesso!')
      // limpa formulário
      setForm({
        client_id: '',
        site_id: '',
        status: 'Aberta',
        opening_date: '',
        due_date: '',
        payment_type: 'prazo',
        discount_percent: 0,
        technical_notes: '',
        commercial_notes: ''
      })
      setServiceLines([{ service_id: '', quantity: '', unit_price: '', line_total: 0 }])
      setMaterialLines([{ product_id: '', quantity: '', unit: '', packaging: '', unit_price: '', total_cost: 0 }])
    } finally {
      setSaving(false)
    }
  }

  // ---------- CLIENTE RÁPIDO (MODAL) ----------

  function handleQuickClientChange(e) {
    const { name, value } = e.target
    setQuickClient(prev => ({ ...prev, [name]: value }))
  }

  async function handleSaveQuickClient(e) {
    e.preventDefault()
    if (!quickClient.name) {
      alert('Informe ao menos o nome do cliente.')
      return
    }

    setSavingClient(true)
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([
          {
            name: quickClient.name,
            document: quickClient.document || null,
            phone: quickClient.phone || null,
            whatsapp: quickClient.whatsapp || null,
            email: quickClient.email || null,
            city: quickClient.city || null,
            state: quickClient.state || null
          }
        ])
        .select()
        .single()

      if (error) {
        console.error(error)
        alert('Erro ao salvar cliente: ' + error.message)
        return
      }

      // adiciona na lista e seleciona
      setClients(prev => [...prev, data])
      setForm(prev => ({ ...prev, client_id: data.id }))

      // limpa modal
      setQuickClient({
        name: '',
        document: '',
        phone: '',
        whatsapp: '',
        email: '',
        city: '',
        state: ''
      })
      setShowClientModal(false)
    } finally {
      setSavingClient(false)
    }
  }

  return (
    <div>
      <h2>Nova Ordem de Serviço</h2>

      <form className="form-card" onSubmit={handleSubmit}>
        {/* CABEÇALHO DA OS */}
        <div className="form-grid">
          <label>
            Cliente
            <div className="inline-field-with-button">
              <select
                name="client_id"
                value={form.client_id}
                onChange={handleFormChange}
              >
                <option value="">Selecione um cliente</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="button-secondary button-xs"
                onClick={() => setShowClientModal(true)}
              >
                Novo cliente
              </button>
            </div>
          </label>

          <label>
            Obra / Local
            <select
              name="site_id"
              value={form.site_id}
              onChange={handleFormChange}
            >
              <option value="">Selecione uma obra</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>
                  {s.street}, {s.number} - {s.city}/{s.state}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select
              name="status"
              value={form.status}
              onChange={handleFormChange}
            >
              <option value="Aberta">Aberta</option>
              <option value="Em andamento">Em andamento</option>
              <option value="Concluída">Concluída</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </label>

          <label>
            Data de abertura
            <input
              type="date"
              name="opening_date"
              value={form.opening_date}
              onChange={handleFormChange}
            />
          </label>

          <label>
            Data prevista
            <input
              type="date"
              name="due_date"
              value={form.due_date}
              onChange={handleFormChange}
            />
          </label>

          <label>
            Forma de pagamento
            <select
              name="payment_type"
              value={form.payment_type}
              onChange={handleFormChange}
            >
              <option value="prazo">A prazo</option>
              <option value="avista">À vista</option>
            </select>
          </label>

          <label>
            Desconto (%)
            <input
              name="discount_percent"
              value={form.discount_percent}
              onChange={handleDiscountChange}
            />
            <small>Máximo 8% e somente para vendas à vista.</small>
          </label>

          <label>
            Observações técnicas
            <textarea
              name="technical_notes"
              value={form.technical_notes}
              onChange={handleFormChange}
              rows={3}
            />
          </label>

          <label>
            Observações comerciais (prazo, forma de pagamento...)
            <textarea
              name="commercial_notes"
              value={form.commercial_notes}
              onChange={handleFormChange}
              rows={3}
            />
          </label>
        </div>

        {/* SERVIÇOS */}
        <section style={{ marginTop: '1.5rem' }}>
          <h3>Serviços da OS</h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Qtd</th>
                  <th>Valor unitário (R$)</th>
                  <th>Total (R$)</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {serviceLines.map((line, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        value={line.service_id}
                        onChange={e =>
                          handleServiceChange(index, 'service_id', e.target.value)
                        }
                      >
                        <option value="">Selecione</option>
                        {services.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        value={line.quantity}
                        onChange={e =>
                          handleServiceChange(index, 'quantity', e.target.value)
                        }
                        type="number"
                        step="0.01"
                      />
                    </td>
                    <td>
                      <input
                        value={line.unit_price}
                        onChange={e =>
                          handleServiceChange(index, 'unit_price', e.target.value)
                        }
                        type="number"
                        step="0.01"
                      />
                    </td>
                    <td>{Number(line.line_total || 0).toFixed(2)}</td>
                    <td className="table-actions">
                      <button
                        type="button"
                        className="button-danger button-xs"
                        onClick={() => removeServiceLine(index)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="button-secondary button-xs"
            onClick={addServiceLine}
          >
            + Adicionar serviço
          </button>
        </section>

        {/* MATERIAIS */}
        <section style={{ marginTop: '1.5rem' }}>
          <h3>Materiais da OS</h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Embalagem</th>
                  <th>Unidade</th>
                  <th>Qtd</th>
                  <th>Valor unitário (R$)</th>
                  <th>Total (R$)</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {materialLines.map((line, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        value={line.product_id}
                        onChange={e =>
                          handleMaterialChange(index, 'product_id', e.target.value)
                        }
                      >
                        <option value="">Selecione</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.type} - {p.name} {p.color_code && `(${p.color_code})`}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={line.packaging || ''}
                        onChange={e =>
                          handleMaterialChange(index, 'packaging', e.target.value)
                        }
                      >
                        <option value="">Selecione</option>
                        <option value="Balde">Balde</option>
                        <option value="Saco">Saco</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </td>
                    <td>
                      <input
                        value={line.unit}
                        onChange={e =>
                          handleMaterialChange(index, 'unit', e.target.value)
                        }
                        placeholder="kg, balde, saco..."
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={line.quantity}
                        onChange={e =>
                          handleMaterialChange(index, 'quantity', e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={line.unit_price}
                        onChange={e =>
                          handleMaterialChange(index, 'unit_price', e.target.value)
                        }
                      />
                    </td>
                    <td>{Number(line.total_cost || 0).toFixed(2)}</td>
                    <td className="table-actions">
                      <button
                        type="button"
                        className="button-danger button-xs"
                        onClick={() => removeMaterialLine(index)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="button-secondary button-xs"
            onClick={addMaterialLine}
          >
            + Adicionar material
          </button>
        </section>

        {/* TOTAIS */}
        <section style={{ marginTop: '1.5rem' }}>
          <h3>Totais</h3>
          <p><strong>Total serviços:</strong> R$ {totalServices.toFixed(2)}</p>
          <p><strong>Total materiais:</strong> R$ {totalMaterials.toFixed(2)}</p>
          <p><strong>Total geral:</strong> R$ {totalGeneral.toFixed(2)}</p>
          <p><strong>Desconto:</strong> R$ {discountValue.toFixed(2)}</p>
          <p><strong>Total final a pagar:</strong> R$ {totalFinal.toFixed(2)}</p>
        </section>

        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <button
            type="submit"
            className="button-primary"
            disabled={saving}
          >
            {saving ? 'Salvando OS...' : 'Salvar Ordem de Serviço'}
          </button>
        </div>
      </form>

      {/* MODAL DE NOVO CLIENTE */}
      {showClientModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Novo cliente rápido</h3>
            <form className="form-grid" onSubmit={handleSaveQuickClient}>
              <label>
                Nome / Razão Social *
                <input
                  name="name"
                  value={quickClient.name}
                  onChange={handleQuickClientChange}
                  required
                />
              </label>
              <label>
                CPF / CNPJ
                <input
                  name="document"
                  value={quickClient.document}
                  onChange={handleQuickClientChange}
                />
              </label>
              <label>
                Telefone
                <input
                  name="phone"
                  value={quickClient.phone}
                  onChange={handleQuickClientChange}
                />
              </label>
              <label>
                WhatsApp
                <input
                  name="whatsapp"
                  value={quickClient.whatsapp}
                  onChange={handleQuickClientChange}
                />
              </label>
              <label>
                E-mail
                <input
                  type="email"
                  name="email"
                  value={quickClient.email}
                  onChange={handleQuickClientChange}
                />
              </label>
              <label>
                Cidade
                <input
                  name="city"
                  value={quickClient.city}
                  onChange={handleQuickClientChange}
                />
              </label>
              <label>
                UF
                <input
                  name="state"
                  value={quickClient.state}
                  onChange={handleQuickClientChange}
                  maxLength={2}
                />
              </label>
            </form>

            <div className="form-actions">
              <button
                type="button"
                className="button-primary"
                onClick={handleSaveQuickClient}
                disabled={savingClient}
              >
                {savingClient ? 'Salvando...' : 'Salvar cliente e usar na OS'}
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setShowClientModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderFormPage
