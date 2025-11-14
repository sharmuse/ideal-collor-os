import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

function BackupPage() {
  const [downloading, setDownloading] = useState('')

  function downloadCSV(filename, rows) {
    if (!rows || rows.length === 0) {
      alert('Nenhum dado para exportar.')
      return
    }

    const headers = Object.keys(rows[0])
    const csvContent = [
      headers.join(';'),
      ...rows.map(row =>
        headers
          .map(h => {
            const value = row[h] ?? ''
            const escaped = String(value).replace(/"/g, '""')
            return `"${escaped}"`
          })
          .join(';')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleExport(table) {
    try {
      setDownloading(table)

      if (table === 'clients') {
        const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: true })
        if (error) throw error
        downloadCSV('clientes_ideal_collor.csv', data)
      }

      if (table === 'sites') {
        const { data, error } = await supabase.from('sites').select('*').order('created_at', { ascending: true })
        if (error) throw error
        downloadCSV('obras_ideal_collor.csv', data)
      }

      if (table === 'products') {
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: true })
        if (error) throw error
        downloadCSV('produtos_ideal_collor.csv', data)
      }

      if (table === 'services') {
        const { data, error } = await supabase.from('services').select('*').order('created_at', { ascending: true })
        if (error) throw error
        downloadCSV('servicos_ideal_collor.csv', data)
      }

      if (table === 'orders') {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, opening_date, due_date, payment_type, discount_percent, discount_value, total_services, total_materials, total_general, total_final')
    .order('created_at', { ascending: true })
        if (error) throw error
        downloadCSV('ordens_servico_ideal_collor.csv', data)
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao exportar CSV: ' + err.message)
    } finally {
      setDownloading('')
    }
  }

  return (
    <div>
      <h2>Backups (CSV / Excel)</h2>
      <p>
        Aqui você pode exportar os dados principais do sistema para arquivos CSV.
        Esses arquivos podem ser abertos no Excel, Google Sheets ou guardados como backup físico.
      </p>

      <div className="form-card">
        <h3>Exportar cadastros</h3>
        <div className="form-actions" style={{ flexWrap: 'wrap' }}>
          <button
            className="button-primary"
            onClick={() => handleExport('clients')}
            disabled={downloading === 'clients'}
          >
            {downloading === 'clients' ? 'Exportando...' : 'Clientes'}
          </button>

          <button
            className="button-primary"
            onClick={() => handleExport('sites')}
            disabled={downloading === 'sites'}
          >
            {downloading === 'sites' ? 'Exportando...' : 'Obras'}
          </button>

          <button
            className="button-primary"
            onClick={() => handleExport('products')}
            disabled={downloading === 'products'}
          >
            {downloading === 'products' ? 'Exportando...' : 'Produtos / Materiais'}
          </button>

          <button
            className="button-primary"
            onClick={() => handleExport('services')}
            disabled={downloading === 'services'}
          >
            {downloading === 'services' ? 'Exportando...' : 'Serviços'}
          </button>

          <button
            className="button-primary"
            onClick={() => handleExport('orders')}
            disabled={downloading === 'orders'}
          >
            {downloading === 'orders' ? 'Exportando...' : 'Ordens de Serviço'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BackupPage
