import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const STATUS_OPTIONS = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' }
]

const PAYMENT_OPTIONS = [
  { value: 'prazo', label: 'A prazo' },
  { value: 'avista', label: 'À vista' }
]

function OrdersPage() {
  const [clients, setClients] = useState([])
  const [sites, setSites] = useState([])
  const [services, setServices] = useState([])
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    client_id: '',
    site_id: '',
    opening_date: '',
    due_date: '',
    status: 'aberta',
    payment_type: 'prazo',      // NOVO
    discount_percent: 0,        // NOVO
    technical_notes: '',
    commercial_notes: ''
  })

  const [serviceItems, setServiceItems] = useState([
    { service_id: '', quantity: '', unit_price: '' }
  ])

  const [materialItems, setMaterialItems] = useState([
    { product_id: '', quantity: '', unit: '', unit_cost: '' }
  ])

  // Filtros de listagem
  const [filters, setFilters] = useState({
    client_id: '',
    status: '',
    start_date: '',
    end_date: ''
  })

  function handleFilterChange(e) {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  function clearFilters() {
    setFilters({
      client_id: '',
      status: '',
      start_date: '',
      end_date: ''
    })
  }

  function handleFormChange(e) {
    const { name, value } = e.target

    // Tratamento especial para forma de pagamento e desconto
    if (name === 'payment_type') {
      setForm(prev => ({
        ...prev,
        payment_type: value,
        // se não for à vista, zera o desconto
        discount_percent: value === 'avista' ? prev.discount_percent : 0
      }))
      return
    }

    if (name === 'discount_percent') {
      let v = Number(value || 0)
      if (isNaN(v) || v < 0) v = 0
      if (v > 8) v = 8 // trava no máximo 8%
      setForm(prev => ({ ...prev, discount_percent: v }))
      return
    }

    setForm(prev => ({ ...prev, [name]: value }))
  }

  function handleServiceItemChange(index, field, value) {
    setServiceItems(prev => {
      const copy = [...prev]
      let item = { ...copy[index], [field]: value }

      if (field === 'service_id') {
        const svc = services.find(s => s.id === value)
        if (svc && !item.unit_price) {
          item.unit_price = svc.labor_price_unit || ''
        }
      }

      copy[index] = item
      return copy
    })
  }

  function handleMaterialItemChange(index, field, value) {
    setMaterialItems(prev => {
      const copy = [...prev]
      let item = { ...copy[index], [field]: value }

      if (field === 'product_id') {
        const prod = products.find(p => p.id === value)
        if (prod) {
          if (!item.unit) item.unit = prod.unit || ''
          if (!item.unit_cost) item.unit_cost = prod.cost_unit || ''
        }
      }

      copy[index] = item
      return copy
    })
  }

  function addServiceRow() {
    setServiceItems(prev => [...prev, { service_id: '', quantity: '', unit_price: '' }])
  }

  function addMaterialRow() {
    setMaterialItems(prev => [...prev, { product_id: '', quantity: '', unit: '', unit_cost: '' }])
  }

  function removeServiceRow(index) {
    setServiceItems(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  function removeMaterialRow(index) {
    setMaterialItems(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  async function loadBaseData() {
    setLoading(true)

    const [clientsRes, sitesRes, servicesRes, productsRes, ordersRes] = await Promise.all([
      supabase.from('clients').select('id, name').order('name', { ascending: true }),
      supabase.from('sites').select('*').order('created_at', { ascending: false }),
      supabase.from('services').select('*').order('name', { ascending: true }),
      supabase.from('products').select('*').order('name', { ascending: true }),
      supabase
        .from('orders')
        .select(
          'id, order_number, status, opening_date, total_general, total_final, client_id, clients ( name ), sites ( street, city, state )'
        )
        .order('created_at', { ascending: false })
    ])

    if (!clientsRes.error) setClients(clientsRes.data)
    if (!sitesRes.error) setSites(sitesRes.data)
    if (!servicesRes.error) setServices(servicesRes.data)
    if (!productsRes.error) setProducts(productsRes.data)
    if (!ordersRes.error) setOrders(ordersRes.data)

    setLoading(false)
  }

  useEffect(() => {
    loadBaseData()
  }, [])

  function filteredSites() {
    if (!form.client_id) return sites
    return sites.filter(s => s.client_id === form.client_id)
  }

  function calcTotalServices() {
    return serviceItems.reduce((sum, item) => {
      const q = Number(item.quantity || 0)
      const p = Number(item.unit_price || 0)
      return sum + q * p
    }, 0)
  }

  function calcTotalMaterials() {
    return materialItems.reduce((sum, item) => {
      const q = Number(item.quantity || 0)
      const c = Number(item.unit_cost || 0)
      return sum + q * c
    }, 0)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    try {
      const totalServices = calcTotalServices()
      const totalMaterials = calcTotalMaterials()
      const totalGeneral = totalServices + totalMaterials

      const isCash = form.payment_type === 'avista'
      const rawPercent = Number(form.discount_percent || 0)
      const discountPercent = isCash ? Math.min(Math.max(rawPercent, 0), 8) : 0
      const discountValue = (totalGeneral * discountPercent) / 100
      const totalFinal = totalGeneral - discountValue

      const { data: insertedOrder, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            client_id: form.client_id || null,
            site_id: form.site_id || null,
            status: form.status,
            opening_date: form.opening_date || null,
            due_date: form.due_date || null,
            technical_notes: form.technical_notes,
            commercial_notes: form.commercial_notes,
            payment_type: form.payment_type,
            discount_percent: discountPercent,
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
        setSaving(false)
        return
      }

      const orderId = insertedOrder.id

      const servicesPayload = serviceItems
        .filter(i => i.service_id && i.quantity)
        .map(i => ({
          order_id: orderId,
          service_id: i.service_id,
          quantity: Number(i.quantity || 0),
          unit_price: Number(i.unit_price || 0),
          line_total: Number(i.quantity || 0) * Number(i.unit_price || 0)
        }))

      if (servicesPayload.length > 0) {
        const { error } = await supabase.from('order_services').insert(servicesPayload)
        if (error) {
          console.error(error)
          alert('Erro ao salvar serviços da OS: ' + error.message)
        }
      }

      const materialsPayload = materialItems
        .filter(i => i.product_id && i.quantity)
        .map(i => ({
          order_id: orderId,
          product_id: i.product_id,
          quantity: Number(i.quantity || 0),
          unit: i.unit || null,
          total_cost: Number(i.quantity || 0) * Number(i.unit_cost || 0)
        }))

      if (materialsPayload.length > 0) {
        const { error } = await supabase.from('order_materials').insert(materialsPayload)
        if (error) {
          console.error(error)
          alert('Erro ao salvar materiais da OS: ' + error.message)
        }
      }

      setForm({
        client_id: '',
        site_id: '',
        opening_date: '',
        due_date: '',
        status: 'aberta',
        payment_type: 'prazo',
        discount_percent: 0,
        technical_notes: '',
        commercial_notes: ''
      })
      setServiceItems([{ service_id: '', quantity: '', unit_price: '' }])
      setMaterialItems([{ product_id: '', quantity: '', unit: '', unit_cost: '' }])

      await loadBaseData()
    } finally {
      setSaving(false)
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      const dia = String(d.getDate()).padStart(2, '0')
      const mes = String(d.getMonth() + 1).padStart(2, '0')
      const ano = d.getFullYear()
      return `${dia}/${mes}/${ano}`
    } catch {
      return dateStr
    }
  }

  function getClientName(client) {
    return client?.name || '—'
  }

  function getSiteText(site) {
    if (!site) return '—'
    return `${site.street || ''} - ${site.city || ''} ${site.state ? '- ' + site.state : ''}`
  }

  // Totais atuais
  const totalServices = calcTotalServices()
  const totalMaterials = calcTotalMaterials()
  const totalGeneral = totalServices + totalMaterials

  const isCash = form.payment_type === 'avista'
  const rawPercent = Number(form.discount_percent || 0)
  const discountPercent = isCash ? Math.min(Math.max(rawPercent, 0), 8) : 0
  const discountValue = (totalGeneral * discountPercent) / 100
  const totalFinal = totalGeneral - discountValue

  // Aplica filtros na listagem de OS
  function getFilteredOrders() {
    return orders.filter(o => {
      if (filters.client_id && o.client_id !== filters.client_id) return false
      if (filters.status && o.status !== filters.status) return false

      if (filters.start_date) {
        if (!o.opening_date) return false
        if (new Date(o.opening_date) < new Date(filters.start_date)) return false
      }

      if (filters.end_date) {
        if (!o.opening_date) return false
        if (new Date(o.opening_date) > new Date(filters.end_date)) return false
      }

      return true
    })
  }

  const filteredOrders = getFilteredOrders()

  return (
    <div>
      <h2>Ordens de Serviço</h2>
      <p>
        Criação e listagem de Ordens de Serviço da IDEAL COLLOR, vinculando clientes, obras,
        serviços e materiais.
      </p>

      {/* FORM NOVA OS */}
      <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        <div className="form-card">
          <h3>Nova Ordem de Serviço</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Cliente
              <select
                name="client_id"
                value={form.client_id}
                onChange={handleFormChange}
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
              Obra / Local
              <select
                name="site_id"
                value={form.site_id}
                onChange={handleFormChange}
              >
                <option value="">Selecione uma obra</option>
                {filteredSites().map(s => (
                  <option key={s.id} value={s.id}>
                    {s.street} - {s.city} {s.state && `(${s.state})`}
                  </option>
                ))}
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
              Status
              <select
                name="status"
                value={form.status}
                onChange={handleFormChange}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Forma de pagamento
              <select
                name="payment_type"
                value={form.payment_type}
                onChange={handleFormChange}
              >
                {PAYMENT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Desconto (%)
              <input
                type="number"
                name="discount_percent"
                step="0.1"
                min="0"
                max="8"
                value={form.payment_type === 'avista' ? form.discount_percent : 0}
                onChange={handleFormChange}
                disabled={form.payment_type !== 'avista'}
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
          </form>

          <hr style={{ margin: '1.5rem 0' }} />

          {/* SERVIÇOS */}
          <h4>Serviços da OS</h4>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Qtd</th>
                  <th>Valor unitário (R$)</th>
                  <th>Total (R$)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {serviceItems.map((item, index) => {
                  const q = Number(item.quantity || 0)
                  const p = Number(item.unit_price || 0)
                  const lineTotal = q * p
                  return (
                    <tr key={index}>
                      <td>
                        <select
                          value={item.service_id}
                          onChange={e =>
                            handleServiceItemChange(index, 'service_id', e.target.value)
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
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={e =>
                            handleServiceItemChange(index, 'quantity', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={e =>
                            handleServiceItemChange(index, 'unit_price', e.target.value)
                          }
                        />
                      </td>
                      <td>{lineTotal.toFixed(2)}</td>
                      <td>
                        <button type="button" onClick={() => removeServiceRow(index)}>
                          Remover
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            style={{ marginTop: '0.5rem' }}
            onClick={addServiceRow}
          >
            + Adicionar serviço
          </button>

          <hr style={{ margin: '1.5rem 0' }} />

          {/* MATERIAIS */}
          <h4>Materiais da OS</h4>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Produto / Material</th>
                  <th>Qtd</th>
                  <th>Unid.</th>
                  <th>Custo unitário (R$)</th>
                  <th>Total (R$)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {materialItems.map((item, index) => {
                  const q = Number(item.quantity || 0)
                  const c = Number(item.unit_cost || 0)
                  const lineTotal = q * c

                  return (
                    <tr key={index}>
                      <td>
                        <select
                          value={item.product_id}
                          onChange={e =>
                            handleMaterialItemChange(index, 'product_id', e.target.value)
                          }
                        >
                          <option value="">Selecione</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.type})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={e =>
                            handleMaterialItemChange(index, 'quantity', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={item.unit}
                          onChange={e =>
                            handleMaterialItemChange(index, 'unit', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_cost}
                          onChange={e =>
                            handleMaterialItemChange(index, 'unit_cost', e.target.value)
                          }
                        />
                      </td>
                      <td>{lineTotal.toFixed(2)}</td>
                      <td>
                        <button type="button" onClick={() => removeMaterialRow(index)}>
                          Remover
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            style={{ marginTop: '0.5rem' }}
            onClick={addMaterialRow}
          >
            + Adicionar material
          </button>

          <hr style={{ margin: '1.5rem 0' }} />

          <div>
            <p><strong>Total serviços:</strong> R$ {totalServices.toFixed(2)}</p>
            <p><strong>Total materiais:</strong> R$ {totalMaterials.toFixed(2)}</p>
            <p><strong>Total geral (antes do desconto):</strong> R$ {totalGeneral.toFixed(2)}</p>
            <p><strong>Desconto aplicado:</strong> {discountPercent.toFixed(2)}% (R$ {discountValue.toFixed(2)})</p>
            <p><strong>Total final (à pagar):</strong> R$ {totalFinal.toFixed(2)}</p>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="button-primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Salvando OS...' : 'Salvar Ordem de Serviço'}
            </button>
          </div>
        </div>
      </div>

      {/* FILTROS DA LISTA */}
      <h3>Ordens de Serviço cadastradas</h3>

      <div className="form-card" style={{ marginBottom: '0.75rem' }}>
        <h4>Filtros</h4>
        <div className="form-grid">
          <label>
            Cliente
            <select
              name="client_id"
              value={filters.client_id}
              onChange={handleFilterChange}
            >
              <option value="">Todos</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">Todos</option>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Data inicial (abertura)
            <input
              type="date"
              name="start_date"
              value={filters.start_date}
              onChange={handleFilterChange}
            />
          </label>

          <label>
            Data final (abertura)
            <input
              type="date"
              name="end_date"
              value={filters.end_date}
              onChange={handleFilterChange}
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="button" onClick={clearFilters}>
            Limpar filtros
          </button>
        </div>
      </div>

      {loading ? (
        <p>Carregando ordens de serviço...</p>
      ) : filteredOrders.length === 0 ? (
        <p>Nenhuma OS encontrada com os filtros atuais.</p>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Nº OS</th>
                <th>Cliente</th>
                <th>Obra</th>
                <th>Status</th>
                <th>Data abertura</th>
                <th>Total (R$)</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => {
                const totalMostrar =
                  o.total_final != null ? o.total_final : o.total_general || 0
                return (
                  <tr key={o.id}>
                    <td>{o.order_number}</td>
                    <td>{getClientName(o.clients)}</td>
                    <td>{getSiteText(o.sites)}</td>
                    <td>{o.status}</td>
                    <td>{formatDate(o.opening_date)}</td>
                    <td>{Number(totalMostrar).toFixed(2)}</td>
                    <td>
                      <Link to={`/orders/${o.id}`}>Visualizar / Imprimir</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default OrdersPage
