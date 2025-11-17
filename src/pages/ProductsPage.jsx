import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const emptyForm = {
    type: '',
    name: '',
    color_code: '',
    unit: '',
    consumption: '',
    cost: '',
    price: '',
    stock_quantity: ''
  }

  const [form, setForm] = useState(emptyForm)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('type', { ascending: true })
      .order('name', { ascending: true })

    if (!error) {
      setProducts(data)
    } else {
      console.error(error)
      alert('Erro ao carregar produtos: ' + error.message)
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
      type: form.type || null,
      name: form.name || null,
      color_code: form.color_code || null,
      unit: form.unit || null,
      consumption: form.consumption ? Number(form.consumption) : null,
      cost: form.cost ? Number(form.cost) : null,
      price: form.price ? Number(form.price) : null,
      stock_quantity: form.stock_quantity ? Number(form.stock_quantity) : null
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingId)

        if (error) {
          console.error(error)
          alert('Erro ao atualizar produto: ' + error.message)
          return
        }
      } else {
        const { error } = await supabase.from('products').insert([payload])
        if (error) {
          console.error(error)
          alert('Erro ao salvar produto: ' + error.message)
          return
        }
      }

      setForm(emptyForm)
      setEditingId(null)
      await loadProducts()
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(product) {
    setEditingId(product.id)
    setForm({
      type: product.type || '',
      name: product.name || '',
      color_code: product.color_code || '',
      unit: product.unit || '',
      consumption: product.consumption ?? '',
      cost: product.cost ?? '',
      price: product.price ?? '',
      stock_quantity: product.stock_quantity ?? ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(id) {
    const ok = window.confirm('Tem certeza que deseja remover este produto/material?')
    if (!ok) return

    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      console.error(error)
      alert('Erro ao remover produto: ' + error.message)
      return
    }
    await loadProducts()
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
  }

  return (
    <div>
      <h2>Produtos / Materiais</h2>
      <p>Cadastro dos produtos e materiais utilizados pela IDEAL COLLOR.</p>

      <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        <div className="form-card">
          <h3>{editingId ? 'Editar produto / material' : 'Novo Produto / Material'}</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Tipo
              <input
                name="type"
                value={form.type}
                onChange={handleChange}
                placeholder="Fulget, toque de brilho, grafiato..."
              />
            </label>

            <label>
              Nome do produto
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
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
                name="consumption"
                value={form.consumption}
                onChange={handleChange}
                type="number"
                step="0.01"
              />
            </label>

            <label>
              Custo unitário (R$)
              <input
                name="cost"
                value={form.cost}
                onChange={handleChange}
                type="number"
                step="0.01"
              />
            </label>

            <label>
              Preço de venda unitário (R$)
              <input
                name="price"
                value={form.price}
                onChange={handleChange}
                type="number"
                step="0.01"
              />
            </label>

            <label>
              Estoque atual
              <input
                name="stock_quantity"
                value={form.stock_quantity}
                onChange={handleChange}
                type="number"
                step="1"
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
                : (editingId ? 'Atualizar produto' : 'Salvar produto')}
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

      <h3>Lista de produtos</h3>

      {loading ? (
        <p>Carregando produtos...</p>
      ) : products.length === 0 ? (
        <p>Nenhum produto cadastrado.</p>
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
                <th className="table-actions-col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>{p.type}</td>
                  <td>{p.name}</td>
                  <td>{p.color_code}</td>
                  <td>{p.unit}</td>
                  <td>{p.consumption}</td>
                  <td>{p.cost}</td>
                  <td>{p.price}</td>
                  <td>{p.stock_quantity}</td>
                  <td className="table-actions">
                    <button
                      type="button"
                      className="button-secondary button-xs"
                      onClick={() => handleEdit(p)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="button-danger button-xs"
                      onClick={() => handleDelete(p.id)}
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

export default ProductsPage
