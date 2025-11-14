import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

function ReportsPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [materialsReport, setMaterialsReport] = useState([])
  const [statusSummary, setStatusSummary] = useState([])

  async function loadReport() {
    setLoading(true)
    try {
      let query = supabase
        .from('orders')
        .select(`
          id,
          status,
          opening_date,
          order_materials (
            quantity,
            products:product_id (
              name,
              type,
              unit
            )
          )
        `)

      if (startDate) {
        query = query.gte('opening_date', startDate)
      }
      if (endDate) {
        query = query.lte('opening_date', endDate)
      }

      const { data, error } = await query

      if (error) {
        console.error(error)
        alert('Erro ao carregar relatório: ' + error.message)
        return
      }

      const materialMap = {}
      const statusMap = {}

      for (const order of data) {
        // conta status
        statusMap[order.status] = (statusMap[order.status] || 0) + 1

        const mats = order.order_materials || []
        for (const item of mats) {
          const prod = item.products
          if (!prod) continue

          const key = prod.name + '|' + (prod.type || '') + '|' + (prod.unit || '')
          if (!materialMap[key]) {
            materialMap[key] = {
              name: prod.name,
              type: prod.type || '',
              unit: prod.unit || '',
              total_quantity: 0
            }
          }
          materialMap[key].total_quantity += Number(item.quantity || 0)
        }
      }

      const materialsArray = Object.values(materialMap).sort(
        (a, b) => b.total_quantity - a.total_quantity
      )

      const statusArray = Object.entries(statusMap).map(([status, count]) => ({
        status,
        count
      }))

      setMaterialsReport(materialsArray)
      setStatusSummary(statusArray)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>Relatórios</h2>
      <p>
        Relatórios simples para acompanhar o uso de materiais e a situação das Ordens de Serviço
        da IDEAL COLLOR.
      </p>

      <div className="form-card" style={{ marginTop: '1rem' }}>
        <h3>Período do relatório</h3>
        <div className="form-grid">
          <label>
            Data inicial (abertura da OS)
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </label>

          <label>
            Data final (abertura da OS)
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </label>
        </div>

        <div className="form-actions">
          <button className="button-primary" type="button" onClick={loadReport} disabled={loading}>
            {loading ? 'Carregando...' : 'Gerar relatório'}
          </button>
        </div>
      </div>

      {/* STATUS DAS OS */}
      <div style={{ marginTop: '1.5rem' }}>
        <h3>Resumo de Ordens de Serviço por status</h3>
        {statusSummary.length === 0 ? (
          <p>Nenhum dado carregado ainda.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Quantidade de OS</th>
              </tr>
            </thead>
            <tbody>
              {statusSummary.map(item => (
                <tr key={item.status}>
                  <td>{item.status}</td>
                  <td>{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MATERIAIS MAIS USADOS */}
      <div style={{ marginTop: '1.5rem' }}>
        <h3>Materiais mais usados no período</h3>
        {materialsReport.length === 0 ? (
          <p>Nenhum dado carregado ainda.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Tipo</th>
                  <th>Unidade</th>
                  <th>Quantidade total</th>
                </tr>
              </thead>
              <tbody>
                {materialsReport.map((m, index) => (
                  <tr key={index}>
                    <td>{m.name}</td>
                    <td>{m.type}</td>
                    <td>{m.unit}</td>
                    <td>{m.total_quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReportsPage
