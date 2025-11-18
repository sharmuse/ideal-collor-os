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
  const [client, setClient] = useState(null);
  const [site, setSite] = useState(null);
  const [orderServices, setOrderServices] = useState([]);
  const [orderMaterials, setOrderMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      setLoading(true);
      try {
        // 1) Carrega a OS
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", id)
          .single();

        if (orderError || !orderData) {
          console.error(orderError);
          throw new Error("Ordem de Serviço não encontrada");
        }

        setOrder(orderData);

        // 2) Busca cliente e obra (se existirem)
        const clientPromise = orderData.client_id
          ? supabase
              .from("clients")
              .select(
                `
                id,
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
              `
              )
              .eq("id", orderData.client_id)
              .single()
          : { data: null, error: null };

        const sitePromise = orderData.site_id
          ? supabase
              .from("sites")
              .select(
                `
                id,
                street,
                number,
                district,
                city,
                state,
                zip_code,
                main_service_type,
                area_m2,
                reference_point
              `
              )
              .eq("id", orderData.site_id)
              .single()
          : { data: null, error: null };

        // 3) Busca as linhas de serviços e materiais
        const orderServicesPromise = supabase
          .from("order_services")
          .select("id, order_id, service_id, quantity, unit_price, line_total")
          .eq("order_id", id);

        const orderMaterialsPromise = supabase
          .from("order_materials")
          .select(
            "id, order_id, product_id, quantity, unit, packaging, unit_price, total_cost"
          )
          .eq("order_id", id);

        const [
          { data: clientData },
          { data: siteData },
          { data: orderServicesData, error: orderServicesError },
          { data: orderMaterialsData, error: orderMaterialsError },
        ] = await Promise.all([
          clientPromise,
          sitePromise,
          orderServicesPromise,
          orderMaterialsPromise,
        ]);

        if (orderServicesError) {
          console.error(orderServicesError);
        }
        if (orderMaterialsError) {
          console.error(orderMaterialsError);
        }

        setClient(clientData || null);
        setSite(siteData || null);

        // 4) Para cada serviço, buscar os dados da tabela services
        let servicesDetailed = [];
        if (orderServicesData && orderServicesData.length > 0) {
          const serviceIds = Array.from(
            new Set(orderServicesData.map((s) => s.service_id).filter(Boolean))
          );

          if (serviceIds.length > 0) {
            const { data: servicesData, error: servicesError } = await supabase
              .from("services")
              .select("id, name, unit, labor_price_unit")
              .in("id", serviceIds);

            if (servicesError) {
              console.error(servicesError);
              servicesDetailed = orderServicesData.map((s) => ({
                ...s,
                service: null,
              }));
            } else {
              servicesDetailed = orderServicesData.map((s) => ({
                ...s,
                service: servicesData.find((sv) => sv.id === s.service_id) || null,
              }));
            }
          } else {
            servicesDetailed = orderServicesData.map((s) => ({
              ...s,
              service: null,
            }));
          }
        }

        setOrderServices(servicesDetailed);

        // 5) Para cada material, buscar os dados da tabela products
        let materialsDetailed = [];
        if (orderMaterialsData && orderMaterialsData.length > 0) {
          const productIds = Array.from(
            new Set(orderMaterialsData.map((m) => m.product_id).filter(Boolean))
          );

          if (productIds.length > 0) {
            const { data: productsData, error: productsError } = await supabase
              .from("products")
              .select("id, type, name, color_code, unit")
              .in("id", productIds);

            if (productsError) {
              console.error(productsError);
              materialsDetailed = orderMaterialsData.map((m) => ({
                ...m,
                product: null,
              }));
            } else {
              materialsDetailed = orderMaterialsData.map((m) => ({
                ...m,
                product: productsData.find((p) => p.id === m.product_id) || null,
              }));
            }
          } else {
            materialsDetailed = orderMaterialsData.map((m) => ({
              ...m,
              product: null,
            }));
          }
        }

        setOrderMaterials(materialsDetailed);
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

  return (
    <div className="print-page">
      <div className="no-print" style={{ marginBottom: "1rem" }}>
        <button className="btn btn-secondary" onClick={() => navigate("/orders")}>
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

        {/* CLIENTE */}
        <section className="print-section">
          <h3>Dados do Cliente</h3>
          {client ? (
            <>
              <p>
                <strong>Nome:</strong> {client.name}
              </p>
              <p>
                <strong>Documento:</strong> {client.document}
              </p>
              <p>
                <strong>Telefone:</strong> {client.phone}{" "}
                {client.whatsapp && (
                  <>
                    | <strong>WhatsApp:</strong> {client.whatsapp}
                  </>
                )}
              </p>
              <p>
                <strong>E-mail:</strong> {client.email}
              </p>
              <p>
                <strong>Endereço:</strong>{" "}
                {client.street}, {client.number} - {client.district},{" "}
                {client.city}/{client.state} - CEP {client.zip_code}
              </p>
              {client.reference_point && (
                <p>
                  <strong>Referência:</strong> {client.reference_point}
                </p>
              )}
            </>
          ) : (
            <p>Cliente não encontrado.</p>
          )}
        </section>

        {/* OBRA */}
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

        {/* SERVIÇOS */}
        <section className="print-section">
          <h3>Serviços</h3>
          {orderServices && orderServices.length > 0 ? (
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
                {orderServices.map((s) => (
                  <tr key={s.id}>
                    <td>{s.service?.name || "—"}</td>
                    <td>{s.quantity}</td>
                    <td>{s.service?.unit || "—"}</td>
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

        {/* MATERIAIS */}
        <section className="print-section">
          <h3>Materiais / Produtos</h3>
          {orderMaterials && orderMaterials.length > 0 ? (
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
                {orderMaterials.map((m) => (
                  <tr key={m.id}>
                    <td>{m.product?.type || "—"}</td>
                    <td>{m.product?.name || "—"}</td>
                    <td>{m.product?.color_code || "—"}</td>
                    <td>{m.quantity}</td>
                    <td>{m.unit || m.product?.unit || "—"}</td>
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

        {/* TOTAIS */}
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

        {/* OBSERVAÇÕES */}
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

        {/* ASSINATURA */}
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
