import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import logo from '../assets/logo-idealcollor.png'

const TERMS_FALLBACK = `
Termo de ciência e aceite – IDEAL COLLOR

Declaro que estou ciente e de acordo com a cor, textura, acabamento e metragem especificados nesta Ordem de Serviço.

Estou ciente de que, por se tratar de produto fabricado sob encomenda, após a fabricação na cor escolhida não há possibilidade de troca, cancelamento ou alteração da cor.

Estou ciente também de que, em razão das características dos materiais e do processo produtivo, podem ocorrer pequenas variações de tonalidade entre lotes, não sendo possível garantir reprodução absolutamente idêntica em caso de metragem adicional solicitada posteriormente.

Declaro ainda que as informações de metragem e local de aplicação fornecidas são de minha responsabilidade, bem como qualquer necessidade de metragem extra decorrente de erro de cálculo, remanejamento ou alterações na obra.
`.trim()

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const ano = d.getFullYear()
  return `${dia}/${mes}/${ano}`
}

function OrderPrintPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOrder() {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          payment_type,
          opening_date,
          due_date,
          discount_percent,
          discount_value,
          total_services,
          total_materials,
          total_general,
          total_final,
          technical_notes,
          commercial_notes,
          client_signed,
          client_signed_at,
          client_signature_url,
          client_accept_text,
          seller_signed,
          seller_signed_at,
          seller_signature_url,
          clients:client_id (
            name,
            document,
            phone,
            whatsapp,
            email,
            zip_code,
            street,
            number,
            district,
            city,
            state
          ),
          sites:site_id (
            street,
            number,
            district,
            city,
            state
          ),
          order_services (
            id,
            quantity,
            unit_price,
            line_total,
            services:service_id ( name, unit )
          ),
          order_materials (
            id,
            quantity,
            unit_price,
            total_cost,
            unit,
            packaging,
            products:product_id ( type, name, color_code, unit )
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error(error)
      } else {
        setOrder(data)
      }
      setLoading(false)
    }

    loadOrder()
  }, [id])

  useEffect(() => {
    if (order) {
      // pequena espera pra garantir renderização antes de abrir o print
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [order])

  if (loading) {
    return <p>Carregando Ordem de Serviço...</p>
  }

  if (!order) {
    return <p>Ordem de Serviço não encontrada.</p>
  }

  const client = order.clients
  const site = order.sites
  const termsText = order.client_accept_text || TERMS_FALLBACK

  return (
    <div className="print-container">
      <header className="print-header">
        <div className="print-header-logo">
          <img src={logo} alt="IDEAL COLLOR" />
        </div>
        <div className="print-header-info">
          <h1>ORDEM DE SERVIÇO</h1>
          <p><strong>IDEAL COLLOR</strong></p>
          <p>Nº OS: {order.order_number}</p>
          <p>Status: {order.status}</p>
        </div>
      </header>

      <section className="print-section">
        <h2>Dados do cliente</h2>
        <p><strong>Nome/Razão social:</strong> {client?.name}</p>
        <p><strong>Documento:</strong> {client?.document}</p>
        <p>
          <strong>Contato:</strong>{' '}
          {client?.phone}
          {client?.whatsapp && ` | WhatsApp: ${client.whatsapp}`}
          {client?.email && ` | ${client.email}`}
        </p>
        <p>
          <strong>Endereço:</strong>{' '}
          {client?.street} {client?.number && `, nº ${client.number}`}{' '}
          {client?.district && ` - ${client.district}`}{' '}
          {client?.city && ` - ${client.city}`}{client?.state && `/${client.state}`}{' '}
          {client?.zip_code && ` - CEP: ${client.zip_code}`}
        </p>
      </section>

      <section className="print-section">
        <h2>Local da obra / serviço</h2>
        {site ? (
          <p>
            {site.street} {site.number && `, nº ${site.number}`}{' '}
            {site.district && ` - ${site.district}`}{' '}
            {site.city && ` - ${site.city}`}{site.state && `/${site.state}`}
          </p>
        ) : (
          <p>—</p>
        )}
        <p>
          <strong>Data de abertura:</strong> {formatDate(order.opening_date)}{' '}
          | <strong>Previsão:</strong> {formatDate(order.due_date)}
        </p>
        <p>
          <strong>Forma de pagamento:</strong> {order.payment_type === 'avista' ? 'À vista' : 'A prazo'}
        </p>
      </section>

      <section className="print-section">
        <h2>Serviços</h2>
        {(!order.order_services || order.order_services.length === 0) ? (
          <p>Sem serviços cadastrados.</p>
        ) : (
          <table className="print-table">
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Unidade</th>
                <th>Qtd</th>
                <th>Valor unit. (R$)</th>
                <th>Total (R$)</th>
              </tr>
            </thead>
            <tbody>
              {order.order_services.map(line => (
                <tr key={line.id}>
                  <td>{line.services?.name}</td>
                  <td>{line.services?.unit}</td>
                  <td>{line.quantity}</td>
                  <td>{Number(line.unit_price || 0).toFixed(2)}</td>
                  <td>{Number(line.line_total || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="print-section">
        <h2>Materiais</h2>
        {(!order.order_materials || order.order_materials.length === 0) ? (
          <p>Sem materiais cadastrados.</p>
        ) : (
          <table className="print-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Cor / código</th>
                <th>Embalagem</th>
                <th>Unidade</th>
                <th>Qtd</th>
                <th>Valor unit. (R$)</th>
                <th>Total (R$)</th>
              </tr>
            </thead>
            <tbody>
              {order.order_materials.map(line => (
                <tr key={line.id}>
                  <td>{line.products?.type} - {line.products?.name}</td>
                  <td>{line.products?.color_code}</td>
                  <td>{line.packaging}</td>
                  <td>{line.unit || line.products?.unit}</td>
                  <td>{line.quantity}</td>
                  <td>{Number(line.unit_price || 0).toFixed(2)}</td>
                  <td>{Number(line.total_cost || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="print-section">
        <h2>Totais</h2>
        <p><strong>Total serviços:</strong> R$ {Number(order.total_services || 0).toFixed(2)}</p>
        <p><strong>Total materiais:</strong> R$ {Number(order.total_materials || 0).toFixed(2)}</p>
        <p><strong>Total geral:</strong> R$ {Number(order.total_general || 0).toFixed(2)}</p>
        <p><strong>Desconto ({order.discount_percent || 0}%):</strong> R$ {Number(order.discount_value || 0).toFixed(2)}</p>
        <p><strong>Total final:</strong> R$ {Number(order.total_final || 0).toFixed(2)}</p>
      </section>

      <section className="print-section">
        <h2>Observações</h2>
        <p><strong>Técnicas:</strong> {order.technical_notes || '—'}</p>
        <p><strong>Comerciais:</strong> {order.commercial_notes || '—'}</p>
      </section>

      <section className="print-section">
        <h2>Termos de ciência e aceite</h2>
        <div className="print-terms">
          <pre>{termsText}</pre>
        </div>
      </section>

      <section className="print-section print-signatures">
        <div className="print-signature-block">
          <p><strong>Cliente / Comprador</strong></p>
          {order.client_signature_url ? (
            <>
              <img
                src={order.client_signature_url}
                alt="Assinatura do cliente"
                className="print-signature-image"
              />
              <p className="print-signature-note">
                Assinatura eletrônica registrada em:{' '}
                {order.client_signed_at
                  ? new Date(order.client_signed_at).toLocaleString('pt-BR')
                  : ''}
              </p>
            </>
          ) : (
            <>
              <div className="print-signature-line" />
              <p className="print-signature-note">Assinatura do cliente</p>
            </>
          )}
        </div>

        <div className="print-signature-block">
          <p><strong>Responsável IDEAL COLLOR</strong></p>
          {order.seller_signature_url ? (
            <>
              <img
                src={order.seller_signature_url}
                alt="Assinatura do responsável"
                className="print-signature-image"
              />
              <p className="print-signature-note">
                Assinatura eletrônica registrada em:{' '}
                {order.seller_signed_at
                  ? new Date(order.seller_signed_at).toLocaleString('pt-BR')
                  : ''}
              </p>
            </>
          ) : (
            <>
              <div className="print-signature-line" />
              <p className="print-signature-note">Assinatura do responsável</p>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

export default OrderPrintPage
