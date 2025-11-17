import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import SignaturePad from 'react-signature-canvas'
import { supabase } from '../supabaseClient'

const TERMS_TEXT = `
Termo de ciência e aceite – IDEAL COLLOR

Declaro que estou ciente e de acordo com a cor, textura, acabamento e metragem especificados nesta Ordem de Serviço.

Estou ciente de que, por se tratar de produto fabricado sob encomenda, após a fabricação na cor escolhida não há possibilidade de troca, cancelamento ou alteração da cor.

Estou ciente também de que, em razão das características dos materiais e do processo produtivo, podem ocorrer pequenas variações de tonalidade entre lotes, não sendo possível garantir reprodução absolutamente idêntica em caso de metragem adicional solicitada posteriormente.

Declaro ainda que as informações de metragem e local de aplicação fornecidas são de minha responsabilidade, bem como qualquer necessidade de metragem extra decorrente de erro de cálculo, remanejamento ou alterações na obra.
`.trim()

function dataURLToBlob(dataURL) {
  const parts = dataURL.split(',')
  const byteString = atob(parts[1])
  const mimeString = parts[0].split(':')[1].split(';')[0]
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return new Blob([ab], { type: mimeString })
}

function OrderSignPage() {
  const { id } = useParams()
  const sigRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState(null)

  const [signerType, setSignerType] = useState('client') // 'client' ou 'seller'
  const [name, setName] = useState('')
  const [document, setDocument] = useState('')
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    async function loadOrder() {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_final,
          client_signed,
          client_signed_at,
          seller_signed,
          seller_signed_at,
          clients:client_id ( name, document, email )
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error(error)
        setError('Erro ao carregar a Ordem de Serviço.')
      } else {
        setOrder(data)
        if (data.clients?.name) {
          setName(data.clients.name)
        }
        if (data.clients?.document) {
          setDocument(data.clients.document)
        }
      }
      setLoading(false)
    }

    loadOrder()
  }, [id])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!accepted) {
      setError('Você precisa marcar que leu e concorda com os termos.')
      return
    }

    if (!name.trim()) {
      setError('Informe o nome completo.')
      return
    }

    if (signerType === 'client' && !document.trim()) {
      setError('Informe o CPF/CNPJ.')
      return
    }

    if (!sigRef.current || sigRef.current.isEmpty()) {
      setError('Faça sua assinatura no quadro abaixo.')
      return
    }

    setSaving(true)

    try {
      // 1) capturar a imagem da assinatura
      const dataURL = sigRef.current.getTrimmedCanvas().toDataURL('image/png')
      const blob = dataURLToBlob(dataURL)
      const filePath = `${signerType}-${id}-${Date.now()}.png`

      // 2) enviar para Storage (bucket "signatures")
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: true
        })

      if (uploadError) {
        console.error(uploadError)
        setError('Erro ao enviar assinatura. Tente novamente.')
        return
      }

      const publicUrl = supabase.storage
        .from('signatures')
        .getPublicUrl(uploadData.path).data.publicUrl

      const now = new Date().toISOString()
      const updatePayload = {}

      if (signerType === 'client') {
        updatePayload.client_signed = true
        updatePayload.client_signed_at = now
        updatePayload.client_signature_url = publicUrl
        updatePayload.client_accept_text =
          `${TERMS_TEXT}\n\nAssinante: ${name} - Documento: ${document}`
      } else {
        updatePayload.seller_signed = true
        updatePayload.seller_signed_at = now
        updatePayload.seller_signature_url = publicUrl
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', id)

      if (updateError) {
        console.error(updateError)
        setError('Erro ao salvar assinatura. Tente novamente.')
        return
      }

      alert('Assinatura registrada com sucesso!')
      window.location.href = `/orders/${id}/print`
    } finally {
      setSaving(false)
    }
  }

  function isAlreadySignedAs(type) {
    if (!order) return false
    if (type === 'client') return !!order.client_signed
    if (type === 'seller') return !!order.seller_signed
    return false
  }

  if (loading) {
    return <p>Carregando Ordem de Serviço...</p>
  }

  if (!order) {
    return <p>Ordem de Serviço não encontrada.</p>
  }

  return (
    <div className="form-card" style={{ maxWidth: 900, margin: '1rem auto' }}>
      <h2>Assinatura eletrônica da OS</h2>
      <p><strong>Nº OS:</strong> {order.order_number}</p>
      <p>
        <strong>Cliente:</strong> {order.clients?.name || '—'}
      </p>
      <p>
        <strong>Valor total:</strong>{' '}
        R$ {Number(order.total_final || 0).toFixed(2)}
      </p>

      <hr style={{ margin: '1rem 0' }} />

      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Quem está assinando?
          <select
            value={signerType}
            onChange={e => setSignerType(e.target.value)}
          >
            <option value="client">Cliente / Comprador</option>
            <option value="seller">Responsável IDEAL COLLOR</option>
          </select>
        </label>

        <label>
          Nome completo
          <input
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </label>

        {signerType === 'client' && (
          <label>
            CPF / CNPJ
            <input
              value={document}
              onChange={e => setDocument(e.target.value)}
            />
          </label>
        )}
      </form>

      <div style={{ marginTop: '1rem' }}>
        <h3>Termos de ciência e aceite</h3>
        <div
          style={{
            border: '1px solid #ccc',
            padding: '0.75rem',
            borderRadius: 4,
            background: '#fafafa',
            whiteSpace: 'pre-wrap',
            fontSize: '0.9rem'
          }}
        >
          {TERMS_TEXT}
        </div>

        <label
          style={{
            marginTop: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <input
            type="checkbox"
            checked={accepted}
            onChange={e => setAccepted(e.target.checked)}
          />
          Declaro que li e concordo com os termos acima.
        </label>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <h3>Assinatura</h3>
        <p style={{ fontSize: '0.9rem' }}>
          Assine com o dedo (no celular) ou com o mouse (no computador) no quadro abaixo.
        </p>
        <div
          style={{
            border: '1px solid #ccc',
            borderRadius: 4,
            background: '#fff',
            width: '100%',
            maxWidth: 600,
            height: 200
          }}
        >
          <SignaturePad
            ref={sigRef}
            penColor="black"
            canvasProps={{
              style: {
                width: '100%',
                height: '100%',
                borderRadius: 4
              }
            }}
          />
        </div>
        <button
          type="button"
          className="button-secondary button-xs"
          style={{ marginTop: '0.5rem' }}
          onClick={() => sigRef.current && sigRef.current.clear()}
        >
          Limpar assinatura
        </button>
      </div>

      {error && (
        <p style={{ color: 'red', marginTop: '0.75rem' }}>{error}</p>
      )}

      <div className="form-actions" style={{ marginTop: '1rem' }}>
        <button
          type="button"
          className="button-primary"
          onClick={handleSubmit}
          disabled={saving || isAlreadySignedAs(signerType)}
        >
          {isAlreadySignedAs(signerType)
            ? 'Já assinado'
            : (saving ? 'Salvando assinatura...' : 'Assinar eletronicamente')}
        </button>
      </div>

      {order.client_signed && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
          Cliente já assinou em: {order.client_signed_at
            ? new Date(order.client_signed_at).toLocaleString('pt-BR')
            : ''}
        </p>
      )}

      {order.seller_signed && (
        <p style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
          Responsável IDEAL COLLOR já assinou em: {order.seller_signed_at
            ? new Date(order.seller_signed_at).toLocaleString('pt-BR')
            : ''}
        </p>
      )}
    </div>
  )
}

export default OrderSignPage

