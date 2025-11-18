// src/pages/OrderPrintPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function OrderPrintPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("orders")
          .select(
            `
            id,
            order_number,
            status,
            payment_type,
            opening_date,
            due_date,
            technical_notes,
            commercial_notes,
            total_services,
            total_materials,
            total_general,
            total_final,
            discount_percent,
            client_signed,
            client_signature_url,
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
              reference_point
            ),
            sites:site_id (
              street,
              number,
              district,
              city,
              state,
              zip_code,
              main_service_type,
              area_m2,
              reference_point
            ),
            order_services(
              quantity,
              unit_price,
              line_total,
              services:service_id(
                name,
                unit,
                labor_price_unit
              )
            ),
            order_materials(
              quantity,
              unit,
              packaging,
              unit_price,
              total_cost,
              products:product_id(
                type,
                name,
                color_code,
                unit as product_unit
              )
            )
          `
          )
          .eq("id", id)
          .single();

        if (error) {
          console.error("Erro Supabase ao carregar OS:", error);
          throw error;
        }
        setOrder(data);
      } catch (err) {
        console.error(err);
        alert("Erro ao carregar dados da Ordem de Serviço.");
        navigate("/orders");
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [id, navigate]);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="centered">
        <p>Carregando OS...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="centered">
        <p>OS não encontrada.</p>
      </div>
    );
  }

  const client = order.clients;
  const site = order.sites;

  return (
    <div className="print-page">
      <div className="no-print" style={{ marginBottom: "1rem" }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/orders")}
        >
          Voltar
        </button>{" "}
        <button className="btn btn-primary" onClick={handlePrint}>
          Imprimir
        </button>
      </div>

      <div className="print-card">
        <header className="print-header">
          <div>
            <h1>IDEAL COLLOR</h1>
            <p>Sistema de Ordem de Serviço</p>
          </div>
          <div>
            <h2>Ordem de Serviço</h2>
            <p>
              <strong>Nº OS:</strong> {order.order_number || order.id}
            </p>
            <p>
              <strong>Status:</strong> {order.status}
            </p>
          </div>
        </header>

        <section className="print-section">
          <h3>Dados do Cliente</h3>
          <p>
            <strong>Nome:</strong> {client?.name}
          </p>
          <p>
            <strong>Documento:</strong> {client?.document}
          </p>
          <p>
            <strong>Telefone:</strong> {client?.phone}{" "}
            {client?.whatsapp && (
              <>
                | <strong>WhatsApp:</strong> {client.whatsapp}
              </>
            )}
          </p>
          <p>
            <strong>E-mail:</strong> {client?.email}
          </p>
          <p>
            <strong>Endereço:</strong>{" "}
            {client?.street}, {client?.number} - {client?.district},{" "}
            {client?.city}/{client?.state} - CEP {client?.zip_code}
          </p>
          {client?.reference_point && (
            <p>
              <strong>Referência:</strong> {client.reference_point}
            </p>
          )}
        </section>

        <section className="print-section">
          <h3>Dados da Obra</h3>
          {site ? (
            <>
              <p>
                <strong>Endereço:</strong>{" "}
                {site.street}, {site.number} - {site.district},{" "}
                {site.city}/{site.state} - CEP {site.zip_code}
              </p>
              <p>
                <strong>Serviço principal:</strong> {site.main_service_type}
              </p>
              <p>
                <strong>Área (m²):</strong> {site.area_m2}
              </p>
              {site.reference_point && (
                <p>
                  <strong>Referência:</strong> {site.reference_point}
                </p>
              )}
            </>
          ) : (
            <p>Sem obra vinculada.</p>
          )}
        </section>

        <section className="print-section">
          <h3>Serviços</h3>
          {order.order_services && order.order_services.length > 0 ? (
            <table className="table print-table">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Qtd</th>
                  <th>Unidade</th>
                  <th>Valor unitário (R$)</th>
                  <th>Total (R$)</th>
                </tr>
              </thead>
              <tbody>
                {order.order_services.map((s, idx) => (
                  <tr key={idx}>
                    <td>{s.services?.name}</td>
                    <td>{s.quantity}</td>
                    <td>{s.services?.unit}</td>
                    <td>{Number(s.unit_price || 0).toFixed(2)}</td>
                    <td>{Number(s.line_total || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Nenhum serviço lançado.</p>
          )}
        </section>

        <section className="print-section">
          <h3>Materiais / Produtos</h3>
          {order.order_materials && order.order_materials.length > 0 ? (
            <table className="table print-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Produto</th>
                  <th>Cor / Código</th>
                  <th>Qtd</th>
                  <th>Unidade</th>
                  <th>Embalagem</th>
                  <th>Valor unitário (R$)</th>
                  <th>Total (R$)</th>
                </tr>
              </thead>
              <tbody>
                {order.order_materials.map((m, idx) => (
                  <tr key={idx}>
                    <td>{m.products?.type}</td>
                    <td>{m.products?.name}</td>
                    <td>{m.products?.color_code}</td>
                    <td>{m.quantity}</td>
                    <td>{m.unit || m.products?.product_unit}</td>
                    <td>{m.packaging}</td>
                    <td>{Number(m.unit_price || 0).toFixed(2)}</td>
                    <td>{Number(m.total_cost || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Nenhum material lançado.</p>
          )}
        </section>

        <section className="print-section">
          <h3>Totais</h3>
          <p>
            <strong>Total serviços:</strong>{" "}
            R$ {Number(order.total_services || 0).toFixed(2)}
          </p>
          <p>
            <strong>Total materiais:</strong>{" "}
            R$ {Number(order.total_materials || 0).toFixed(2)}
          </p>
          <p>
            <strong>Total geral:</strong>{" "}
            R$ {Number(order.total_general || 0).toFixed(2)}
          </p>
          <p>
            <strong>Desconto:</strong>{" "}
            {Number(order.discount_percent || 0).toFixed(1)}%
          </p>
          <p>
            <strong>Total final:</strong>{" "}
            R$ {Number(order.total_final || 0).toFixed(2)}
          </p>
        </section>

        <section className="print-section">
          <h3>Observações</h3>
          {order.technical_notes && (
            <p>
              <strong>Técnicas:</strong> {order.technical_notes}
            </p>
          )}
          {order.commercial_notes && (
            <p>
              <strong>Comerciais:</strong> {order.commercial_notes}
            </p>
          )}
          {!order.technical_notes && !order.commercial_notes && (
            <p>Sem observações adicionais.</p>
          )}
        </section>

        <section className="print-section">
          <h3>Assinatura do Cliente</h3>
          {order.client_signed && order.client_signature_url ? (
            <>
              <p>Assinado eletronicamente.</p>
              <img
                src={order.client_signature_url}
                alt="Assinatura do cliente"
                style={{ maxWidth: "300px", maxHeight: "150px" }}
              />
            </>
          ) : (
            <p>______________________________________________</p>
          )}
        </section>
      </div>
    </div>
  );
}

export default OrderPrintPage;
