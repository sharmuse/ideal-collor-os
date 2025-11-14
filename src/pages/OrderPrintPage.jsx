import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import logo from '../assets/logo-idealcollor.png' // ajuste se o nome for diferente

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
          opening_date,
          due_date,
          technical_notes,
          commercial_notes,
          payment_type,
          discount_percent,
          discount_value,
          total_services,
          total_materials,
          total_general,
          total_final,
          clients:client_id (
            name,
            document,
            phone,
            whatsapp,
            email,
            street,
            number,
            district,
            city,
            state,
            zip_code,
            address_complement,
            reference_point
          ),
          sites:site_id (
            street,
            number,
            district,
            city,
            state,
            zip_code,
            address_complement,
            reference_point,
            main_service_type,
            area_m2,
            technical_notes
          ),
          order_services (
            quantity,
            unit_price,
            line_total,
            services:service_id (
              name,
              unit
            )
          ),
          order_materials (
            quantity,
            unit,
            total_cost,
            products:product_id (
              name,
              type,
              unit,
              color_code
            )
          )
        `)
        .eq('id', id)
        .single()

      if (!error) {
        setOrder(data)
      } else {
        console.error(error)
      }

      setLoading(false)
    }

    loadOrder()
  }, [id])

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

  function handlePrint() {
    window.print()
  }

  function formatPaymentType(type) {
    if (type === 'avista') return 'À vista'
    if (type === 'prazo') return 'A prazo'
    return type || ''
  }

  if (loading) {
    return <p>Carregando OS para impressão...</p>
  }

  if (!order) {
    return (
      <div>
        <p>Ordem de Serviço não encontrada.</p>
        <Link to="/orders">Voltar</Link>
      </div>
    )
  }

  const client = order.clients
  const site = order.sites
  const services = order.order_services || []
  const materials = order.order_materials || []

  const totalServices = Number(order.total_services || 0)
  const totalMaterials = Number(order.total_materials || 0)
  const totalGeneral = Number(order.total_general || totalServices + totalMaterials)
  const discountPercent = Number(order.discount_percent || 0)
  const discountValue = Number(order.discount_value || 0)
  const totalFinal =
    order.total_final != null ? Number(order.total_final) : totalGeneral - discountValue

  return (
    <div className="print-page">
      <div className="no-print" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
        <Link to="/orders">&larr; Voltar para lista</Link>
        <button className="button-primary" onClick={handlePrint}>
          Imprimir / Salvar em PDF
        </button>
      </div>

      <div className="print-header">
        <div className="print-logo-box">
          <img src={logo} alt="Ideal Collor" className="print-logo" />
        </div>
        <div className="print-os-info">
          <p><strong>Ordem de Serviço</strong></p>
          <p><strong>Nº OS:</strong> {order.order_number}</p>
          <p><strong>Status:</strong> {order.status}</p>
          <p><strong>Abertura:</strong> {formatDate(order.opening_date)}</p>
          <p><strong>Prevista:</strong> {formatDate(order.due_date)}</p>
          <p><strong>Forma de pagamento:</strong> {formatPaymentType(order.payment_type)}</p>
        </div>
      </div>

      <hr />

      <section>
        <h3>Dados do Cliente</h3>
        <p><strong>Nome/Razão Social:</strong> {client?.name}</p>
        <p><strong>Documento:</strong> {client?.document}</p>
        <p>
          <strong>Contato:</strong>{' '}
          {client?.phone} {client?.whatsapp && ` | WhatsApp: ${client.whatsapp}`} {client?.email && ` | E-mail: ${client.email}`}
        </p>
        <p>
          <strong>Endereço:</strong>{' '}
          {client?.street}, {client?.number}
          {client?.address_complement && ` - ${client.address_complement}`}
          {' - '}
          {client?.district} - {client?.city}/{client?.state} CEP {client?.zip_code}
        </p>
        {client?.reference_point && (
          <p>
            <strong>Ponto de referência:</strong> {client.reference_point}
          </p>
        )}
      </section>

      <section>
        <h3>Local da Obra</h3>
        {site ? (
          <>
            <p>
              <strong>Endereço:</strong>{' '}
              {site.street}, {site.number}
              {site.address_complement && ` - ${site.address_complement}`}
              {' - '}
              {site.district} - {site.city}/{site.state} CEP {site.zip_code}
            </p>
            {site.reference_point && (
              <p>
                <strong>Ponto de referência:</strong> {site.reference_point}
              </p>
            )}
            <p>
              <strong>Serviço principal:</strong> {site.main_service_type}
            </p>
            <p>
              <strong>Metragem aproximada:</strong> {site.area_m2} m²
            </p>
            <p>
              <strong>Observações técnicas da obra:</strong> {site.technical_notes}
            </p>
          </>
        ) : (
          <p>Nenhuma obra vinculada.</p>
        )}
      </section>

      <section>
        <h3>Serviços</h3>
        {services.length === 0 ? (
          <p>Nenhum serviço informado.</p>
        ) : (
          <table className="print-table">
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Unid.</th>
                <th>Qtd</th>
                <th>Vlr unit. (R$)</th>
                <th>Total (R$)</th>
              </tr>
            </thead>
            <tbody>
              {services.map((item, index) => (
                <tr key={index}>
                  <td>{item.services?.name}</td>
                  <td>{item.services?.unit}</td>
                  <td>{item.quantity}</td>
                  <td>{Number(item.unit_price || 0).toFixed(2)}</td>
                  <td>{Number(item.line_total || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h3>Materiais</h3>
        {materials.length === 0 ? (
          <p>Nenhum material informado.</p>
        ) : (
          <table className="print-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Cor</th>
                <th>Unid.</th>
                <th>Qtd</th>
                <th>Total (R$)</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((item, index) => (
                <tr key={index}>
                  <td>{item.products?.name}</td>
                  <td>{item.products?.type}</td>
                  <td>{item.products?.color_code}</td>
                  <td>{item.unit || item.products?.unit}</td>
                  <td>{item.quantity}</td>
                  <td>{Number(item.total_cost || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h3>Observações</h3>
        <p><strong>Técnicas:</strong> {order.technical_notes}</p>
        <p><strong>Comerciais (prazo, forma de pagamento, etc.):</strong> {order.commercial_notes}</p>
      </section>

      <section className="print-totals">
        <p><strong>Total serviços:</strong> R$ {totalServices.toFixed(2)}</p>
        <p><strong>Total materiais:</strong> R$ {totalMaterials.toFixed(2)}</p>
        <p><strong>Total geral (antes do desconto):</strong> R$ {totalGeneral.toFixed(2)}</p>
        <p>
          <strong>Desconto:</strong> {discountPercent.toFixed(2)}% (R$ {discountValue.toFixed(2)})
        </p>
        <p><strong>Total final a pagar:</strong> R$ {totalFinal.toFixed(2)}</p>
      </section>

      <section className="print-terms">
        <h3>Termos e ciência do cliente</h3>
        <p>
          1. O cliente declara estar ciente da <strong>cor escolhida</strong> para o(s) produto(s)
          desta Ordem de Serviço, bem como das amostras ou referências apresentadas no ato da
          contratação. Após a fabricação do produto na cor solicitada, <strong>não há possibilidade de
          alteração da cor</strong> ou devolução por motivo de mudança de preferência.
        </p>
        <p>
          2. Por se tratar de produto fabricado sob encomenda e de forma artesanal/industrial própria,
          com base na <strong>metragem informada pelo cliente/contratante</strong>, a IDEAL COLLOR informa
          que <strong>não é possível garantir a reprodução 100% idêntica da mesma cor</strong> em novas
          produções futuras, caso seja necessária metragem adicional por erro de cálculo ou pedido
          complementar.
        </p>
        <p>
          3. O cliente concorda e reconhece que eventuais diferenças de tonalidade entre lotes
          produzidos em datas diferentes são inerentes ao processo de fabricação, não caracterizando
          defeito do produto.
        </p>
      </section>

      <section className="print-signatures">
        <div>
          <p>_____________________________________</p>
          <p>Vendedor / Responsável IDEAL COLLOR</p>
          <p>Data: _____ / _____ / ______</p>
        </div>
        <div>
          <p>_____________________________________</p>
          <p>Cliente – ciente da cor escolhida e dos termos acima</p>
          <p>Data: _____ / _____ / ______</p>
        </div>
      </section>
    </div>
  )
}

export default OrderPrintPage
