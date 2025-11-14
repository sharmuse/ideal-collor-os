import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    type: '',
    name: '',
    color_code: '',
    unit: '',
    avg_consumption: '',
    cost_unit: '',
    price_unit: '',
    stock_qty: ''
  })

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) {
      setProducts(data)
    } else {
      console.error(error)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadProducts()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    const payload = {
      ...form,
      avg_consumption: form.avg_consumption ? Number(form.avg_consumption) : null,
      cost_unit: form.cost_unit ? Number(form.cost_unit) : null,
      price_unit: form.price_unit ? Number(form.price_unit) : null,
      stock_qty: form.stock_qty ? Number(form.stock_qty) : 0
    }

    const { error } = await supabase.from('products').insert([payload])

    if (error) {
      console.error(error)
      alert('Erro ao salvar produto: ' + error.message)
    } else {
      setForm({
        type: '',
        name: '',
        color_code: '',
        unit: '',
        avg_consumption: '',
        cost_unit: '',
        price_unit: '',
        stock_qty: ''
      })
      await loadProducts()
    }

    setSaving(false)
  }

  return (
    <div>
      <h2>Produtos / Materiais</h2>
      <p>Cadastro dos produtos e materiais utilizados pela IDEAL COLLOR.</p>

      <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        <div className="form-card">
          <h3>Novo Produto / Material</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Tipo
              <input
                name="type"
                placeholder="Fulget, toque de brilho, grafiato..."
                value={form.type}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Nome do produto
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Cor / código
              <input
                name="color_code"
                value={form.color_code}
                onChange={handleChange}
              />
            </label>

            <label>
              Unidade (kg, lata, saco, m²...)
              <input
                name="unit"
                value={form.unit}
                onChange={handleChange}
              />
            </label>

            <label>
              Consumo médio (kg/m², m²/unid.)
              <input
                type="number"
                step="0.01"
                name="avg_consumption"
                value={form.avg_consumption}
                onChange={handleChange}
              />
            </label>

            <label>
              Custo unitário (R$)
              <input
                type="number"
                step="0.01"
                name="cost_unit"
                value={form.cost_unit}
                onChange={handleChange}
              />
            </label>

            <label>
              Preço de venda unitário (R$)
              <input
                type="number"
                step="0.01"
                name="price_unit"
                value={form.price_unit}
                onChange={handleChange}
              />
            </label>

            <label>
              Estoque atual
              <input
                type="number"
                step="0.01"
                name="stock_qty"
                value={form.stock_qty}
                onChange={handleChange}
              />
            </label>

            <div className="form-actions">
              <button type="submit" className="button-primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar produto'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <h3>Lista de produtos</h3>

      {loading ? (
        <p>Carregando produtos...</p>
      ) : products.length === 0 ? (
        <p>Nenhum produto cadastrado ainda.</p>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Nome</th>
                <th>Cor</th>
                <th>Unidade</th>
                <th>Consumo médio</th>
                <th>Custo</th>
                <th>Preço</th>
                <th>Estoque</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>{p.type}</td>
                  <td>{p.name}</td>
                  <td>{p.color_code}</td>
                  <td>{p.unit}</td>
                  <td>{p.avg_consumption}</td>
                  <td>{p.cost_unit}</td>
                  <td>{p.price_unit}</td>
                  <td>{p.stock_qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ProductsPage
