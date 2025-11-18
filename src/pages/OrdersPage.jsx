// src/pages/OrdersPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./OrdersPage.css";

function formatDateBR(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function OrdersPage() {
  const navigate = useNavigate();

  // Listas vindas do banco
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  // Estado do formulário
  const [editingId, setEditingId] = useState(null);
  const [clientId, setClientId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [status, setStatus] = useState("Aberta");
  const [paymentType, setPaymentType] = useState("A prazo");
  const [openingDate, setOpeningDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [technicalNotes, setTechnicalNotes] = useState("");
  const [commercialNotes, setCommercialNotes] = useState("");

  // Linhas de serviços e materiais
  const [serviceItems, setServiceItems] = useState([
    { service_id: "", quantity: "", unit_price: "", line_total: 0 },
  ]);

  const [materialItems, setMaterialItems] = useState([
    {
      product_id: "",
      quantity: "",
      unit: "",
      packaging: "",
      unit_price: "",
      total_cost: 0,
    },
  ]);

  const [loading, setLoading] = useState(false);

  // -------------------- CARREGAR DADOS INICIAIS --------------------
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [clientsRes, sitesRes, servicesRes, productsRes, ordersRes] =
          await Promise.all([
            supabase.from("clients").select("id, name").order("name"),
            supabase
              .from("sites")
              .select("id, client_id, street, number, district, city, state")
              .order("created_at", { ascending: false }),
            supabase
              .from("services")
              .select("id, name, unit, labor_price_unit")
              .order("name"),
            supabase
              .from("products")
              .select("id, type, name, color_code, unit, price_unit")
              .order("name"),
            supabase
              .from("orders")
              .select(
                `
                id,
                order_number,
                status,
                payment_type,
                opening_date,
                due_date,
                total_final,
                clients:client_id ( name )
              `
              )
              .order("created_at", { ascending: false }),
          ]);

        if (clientsRes.error) throw clientsRes.error;
        if (sitesRes.error) throw sitesRes.error;
        if (servicesRes.error) throw servicesRes.error;
        if (productsRes.error) throw productsRes.error;
        if (ordersRes.error) throw ordersRes.error;

        setClients(clientsRes.data || []);
        setSites(sitesRes.data || []);
        setServices(servicesRes.data || []);
        setProducts(productsRes.data || []);
        setOrders(ordersRes.data || []);
      } catch (err) {
        console.error(err);
        alert("Erro ao carregar dados iniciais.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // -------------------- HANDLERS DOS SERVIÇOS --------------------
  function handleServiceChange(index, field, value) {
    setServiceItems((prev) => {
      const items = [...prev];
      let row = { ...items[index] };

      if (field === "service_id") {
        row.service_id = value;
        const svc = services.find((s) => s.id === value);
        if (svc) {
          row.unit_price = svc.labor_price_unit || 0;
        }
      } else if (field === "quantity" || field === "unit_price") {
        row[field] = value;
      } else {
        row[field] = value;
      }

      const qty = parseFloat(row.quantity) || 0;
      const price = parseFloat(row.unit_price) || 0;
      row.line_total = qty * price;

      items[index] = row;
      return items;
    });
  }

  function addServiceRow() {
    setServiceItems((prev) => [
      ...prev,
      { service_id: "", quantity: "", unit_price: "", line_total: 0 },
    ]);
  }

  function removeServiceRow(index) {
    setServiceItems((prev) => prev.filter((_, i) => i !== index));
  }

  // -------------------- HANDLERS DOS MATERIAIS --------------------
  function handleMaterialChange(index, field, value) {
    setMaterialItems((prev) => {
      const items = [...prev];
      let row = { ...items[index] };

      if (field === "product_id") {
        row.product_id = value;
        const prod = products.find((p) => p.id === value);
        if (prod) {
          // Preenche preço e unidade com o que está cadastrado no produto
          row.unit_price = prod.price_unit || 0;
          if (!row.unit) row.unit = prod.unit || "";
        }
      } else if (field === "quantity" || field === "unit_price") {
        row[field] = value;
      } else {
        row[field] = value;
      }

      const qty = parseFloat(row.quantity) || 0;
      const price = parseFloat(row.unit_price) || 0;
      row.total_cost = qty * price;

      items[index] = row;
      return items;
    });
  }

  function addMaterialRow() {
    setMaterialItems((prev) => [
      ...prev,
      {
        product_id: "",
        quantity: "",
        unit: "",
        packaging: "",
        unit_price: "",
        total_cost: 0,
      },
    ]);
  }

  function removeMaterialRow(index) {
    setMaterialItems((prev) => prev.filter((_, i) => i !== index));
  }

  // -------------------- CÁLCULO DOS TOTAIS --------------------
  const totalServices = serviceItems.reduce(
    (sum, item) => sum + (parseFloat(item.line_total) || 0),
    0
  );
  const totalMaterials = materialItems.reduce(
    (sum, item) => sum + (parseFloat(item.total_cost) || 0),
    0
  );
  const totalGeneral = totalServices + totalMaterials;
  const discountValue =
    totalGeneral * ((parseFloat(discountPercent) || 0) / 100);
  const totalFinal = totalGeneral - discountValue;

  // -------------------- LIMPAR FORMULÁRIO --------------------
  function resetForm() {
    setEditingId(null);
    setClientId("");
    setSiteId("");
    setStatus("Aberta");
    setPaymentType("A prazo");
    setOpeningDate(new Date().toISOString().slice(0, 10));
    setDueDate("");
    setDiscountPercent("0");
    setTechnicalNotes("");
    setCommercialNotes("");
    setServiceItems([
      { service_id: "", quantity: "", unit_price: "", line_total: 0 },
    ]);
    setMaterialItems([
      {
        product_id: "",
        quantity: "",
        unit: "",
        packaging: "",
        unit_price: "",
        total_cost: 0,
      },
    ]);
  }

  // -------------------- SALVAR ORDEM --------------------
  async function handleSave(e) {
    e.preventDefault();
    if (!clientId) {
      alert("Selecione um cliente.");
      return;
    }

    setLoading(true);

    try {
      // Gera número OS se não existir (bem simples)
      const generatedNumber = `OS-${Math.floor(
        100000 + Math.random() * 900000
      )}`;

      if (!editingId) {
        // NOVA OS
        const { data: orderInserted, error: orderError } = await supabase
          .from("orders")
          .insert([
            {
              order_number: generatedNumber,
              client_id: clientId,
              site_id: siteId || null,
              status,
              payment_type: paymentType,
              opening_date: openingDate || null,
              due_date: dueDate || null,
              technical_notes: technicalNotes || null,
              commercial_notes: commercialNotes || null,
              total_services: totalServices,
              total_materials: totalMaterials,
              total_general: totalGeneral,
              discount_percent: parseFloat(discountPercent) || 0,
              discount_value: discountValue,
              total_final: totalFinal,
            },
          ])
          .select()
          .single();

        if (orderError) throw orderError;

        const orderId = orderInserted.id;

        // Inserir serviços
        const servicesToInsert = serviceItems
          .filter((s) => s.service_id && s.quantity)
          .map((s) => ({
            order_id: orderId,
            service_id: s.service_id,
            quantity: parseFloat(s.quantity) || 0,
            unit_price: parseFloat(s.unit_price) || 0,
            line_total: parseFloat(s.line_total) || 0,
          }));

        if (servicesToInsert.length > 0) {
          const { error: osError } = await supabase
            .from("order_services")
            .insert(servicesToInsert);
          if (osError) throw osError;
        }

        // Inserir materiais
        const materialsToInsert = materialItems
          .filter((m) => m.product_id && m.quantity)
          .map((m) => ({
            order_id: orderId,
            product_id: m.product_id,
            quantity: parseFloat(m.quantity) || 0,
            unit: m.unit || null,
            packaging: m.packaging || null,
            unit_price: parseFloat(m.unit_price) || 0,
            total_cost: parseFloat(m.total_cost) || 0,
          }));

        if (materialsToInsert.length > 0) {
          const { error: omError } = await supabase
            .from("order_materials")
            .insert(materialsToInsert);
          if (omError) throw omError;
        }

        alert("Ordem de Serviço criada com sucesso!");

      } else {
        // EDITAR OS EXISTENTE
        const orderId = editingId;

        const { error: updateError } = await supabase
          .from("orders")
          .update({
            client_id: clientId,
            site_id: siteId || null,
            status,
            payment_type: paymentType,
            opening_date: openingDate || null,
            due_date: dueDate || null,
            technical_notes: technicalNotes || null,
            commercial_notes: commercialNotes || null,
            total_services: totalServices,
            total_materials: totalMaterials,
            total_general: totalGeneral,
            discount_percent: parseFloat(discountPercent) || 0,
            discount_value: discountValue,
            total_final: totalFinal,
          })
          .eq("id", orderId);

        if (updateError) throw updateError;

        // Remove tudo e insere de novo (mais simples)
        await supabase.from("order_services").delete().eq("order_id", orderId);
        await supabase
          .from("order_materials")
          .delete()
          .eq("order_id", orderId);

        const servicesToInsert = serviceItems
          .filter((s) => s.service_id && s.quantity)
          .map((s) => ({
            order_id: orderId,
            service_id: s.service_id,
            quantity: parseFloat(s.quantity) || 0,
            unit_price: parseFloat(s.unit_price) || 0,
            line_total: parseFloat(s.line_total) || 0,
          }));

        if (servicesToInsert.length > 0) {
          const { error: osError } = await supabase
            .from("order_services")
            .insert(servicesToInsert);
          if (osError) throw osError;
        }

        const materialsToInsert = materialItems
          .filter((m) => m.product_id && m.quantity)
          .map((m) => ({
            order_id: orderId,
            product_id: m.product_id,
            quantity: parseFloat(m.quantity) || 0,
            unit: m.unit || null,
            packaging: m.packaging || null,
            unit_price: parseFloat(m.unit_price) || 0,
            total_cost: parseFloat(m.total_cost) || 0,
          }));

        if (materialsToInsert.length > 0) {
          const { error: omError } = await supabase
            .from("order_materials")
            .insert(materialsToInsert);
          if (omError) throw omError;
        }

        alert("Ordem de Serviço atualizada com sucesso!");
      }

      // Recarrega listagem
      const { data: ordersRes, error: ordersErr } = await supabase
        .from("orders")
        .select(
          `
          id,
          order_number,
          status,
          payment_type,
          opening_date,
          due_date,
          total_final,
          clients:client_id ( name )
        `
        )
        .order("created_at", { ascending: false });

      if (ordersErr) throw ordersErr;
      setOrders(ordersRes || []);

      resetForm();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar Ordem de Serviço.");
    } finally {
      setLoading(false);
    }
  }

  // -------------------- EDITAR / REMOVER / AÇÕES --------------------
  async function handleEdit(orderId) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          order_number,
          client_id,
          site_id,
          status,
          payment_type,
          opening_date,
          due_date,
          technical_notes,
          commercial_notes,
          discount_percent,
          order_services(
            service_id,
            quantity,
            unit_price,
            line_total
          ),
          order_materials(
            product_id,
            quantity,
            unit,
            packaging,
            unit_price,
            total_cost
          )
        `
        )
        .eq("id", orderId)
        .single();

      if (error) throw error;

      setEditingId(data.id);
      setClientId(data.client_id || "");
      setSiteId(data.site_id || "");
      setStatus(data.status || "Aberta");
      setPaymentType(data.payment_type || "A prazo");
      setOpeningDate(
        data.opening_date
          ? new Date(data.opening_date).toISOString().slice(0, 10)
          : ""
      );
      setDueDate(
        data.due_date
          ? new Date(data.due_date).toISOString().slice(0, 10)
          : ""
      );
      setTechnicalNotes(data.technical_notes || "");
      setCommercialNotes(data.commercial_notes || "");
      setDiscountPercent(
        data.discount_percent !== null ? String(data.discount_percent) : "0"
      );
      setServiceItems(
        (data.order_services || []).length > 0
          ? data.order_services.map((s) => ({
              service_id: s.service_id,
              quantity: s.quantity ?? "",
              unit_price: s.unit_price ?? "",
              line_total: s.line_total ?? 0,
            }))
          : [{ service_id: "", quantity: "", unit_price: "", line_total: 0 }]
      );
      setMaterialItems(
        (data.order_materials || []).length > 0
          ? data.order_materials.map((m) => ({
              product_id: m.product_id,
              quantity: m.quantity ?? "",
              unit: m.unit ?? "",
              packaging: m.packaging ?? "",
              unit_price: m.unit_price ?? "",
              total_cost: m.total_cost ?? 0,
            }))
          : [
              {
                product_id: "",
                quantity: "",
                unit: "",
                packaging: "",
                unit_price: "",
                total_cost: 0,
              },
            ]
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar dados da OS para edição.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(orderId) {
    if (!window.confirm("Deseja realmente remover esta Ordem de Serviço?"))
      return;

    setLoading(true);
    try {
      await supabase.from("order_services").delete().eq("order_id", orderId);
      await supabase.from("order_materials").delete().eq("order_id", orderId);
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      if (error) throw error;

      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (editingId === orderId) resetForm();
    } catch (err) {
      console.error(err);
      alert("Erro ao remover Ordem de Serviço.");
    } finally {
      setLoading(false);
    }
  }

  // -------------------- RENDER --------------------
  return (
    <div className="orders-page">
      <h1 className="os-title">Ordens de Serviço</h1>

      <div className="os-card">
        <h2 className="os-section-title">
          {editingId ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}
        </h2>

        <form onSubmit={handleSave}>
          {/* DADOS PRINCIPAIS */}
          <div className="os-grid">
            <div className="form-group">
              <label>Cliente</label>
              <select
                className="form-control"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Obra</label>
              <select
                className="form-control"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.street}, {s.number} - {s.district} ({s.city}/{s.state})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                className="form-control"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Aberta">Aberta</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Concluída">Concluída</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>

            <div className="form-group">
              <label>Pagamento</label>
              <select
                className="form-control"
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
              >
                <option value="A prazo">A prazo</option>
                <option value="À vista">À vista</option>
              </select>
            </div>

            <div className="form-group">
              <label>Data de abertura</label>
              <input
                type="date"
                className="form-control"
                value={openingDate}
                onChange={(e) => setOpeningDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Previsão de conclusão</label>
              <input
                type="date"
                className="form-control"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Desconto (%)</label>
              <input
                type="number"
                className="form-control"
                min="0"
                max="100"
                step="0.1"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Observações técnicas</label>
            <textarea
              className="form-control"
              rows={2}
              value={technicalNotes}
              onChange={(e) => setTechnicalNotes(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Observações comerciais</label>
            <textarea
              className="form-control"
              rows={2}
              value={commercialNotes}
              onChange={(e) => setCommercialNotes(e.target.value)}
            />
          </div>

          {/* SERVIÇOS */}
          <hr />
          <h3 className="os-section-title">Serviços</h3>
          <div className="table-responsive">
            <table className="table table-sm os-table">
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>Serviço</th>
                  <th style={{ width: "10%" }}>Qtd</th>
                  <th style={{ width: "15%" }}>Vlr unit. (R$)</th>
                  <th style={{ width: "15%" }}>Subtotal (R$)</th>
                  <th style={{ width: "10%" }}></th>
                </tr>
              </thead>
              <tbody>
                {serviceItems.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        className="form-control form-control-sm"
                        value={row.service_id}
                        onChange={(e) =>
                          handleServiceChange(
                            index,
                            "service_id",
                            e.target.value
                          )
                        }
                      >
                        <option value="">Selecione...</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={row.quantity}
                        min="0"
                        step="0.01"
                        onChange={(e) =>
                          handleServiceChange(
                            index,
                            "quantity",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={row.unit_price}
                        min="0"
                        step="0.01"
                        onChange={(e) =>
                          handleServiceChange(
                            index,
                            "unit_price",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td className="os-money-col">
                      {Number(row.line_total || 0).toFixed(2)}
                    </td>
                    <td>
                      {serviceItems.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeServiceRow(index)}
                        >
                          X
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={addServiceRow}
          >
            + Adicionar serviço
          </button>

          {/* MATERIAIS */}
          <hr />
          <h3 className="os-section-title">Materiais / Produtos</h3>
          <div className="table-responsive">
            <table className="table table-sm os-table">
              <thead>
                <tr>
                  <th style={{ width: "30%" }}>Produto</th>
                  <th style={{ width: "10%" }}>Qtd</th>
                  <th style={{ width: "10%" }}>Unid.</th>
                  <th style={{ width: "15%" }}>Embalagem</th>
                  <th style={{ width: "15%" }}>Vlr unit. (R$)</th>
                  <th style={{ width: "15%" }}>Subtotal (R$)</th>
                  <th style={{ width: "5%" }}></th>
                </tr>
              </thead>
              <tbody>
                {materialItems.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        className="form-control form-control-sm"
                        value={row.product_id}
                        onChange={(e) =>
                          handleMaterialChange(
                            index,
                            "product_id",
                            e.target.value
                          )
                        }
                      >
                        <option value="">Selecione...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.type} - {p.name} {p.color_code && `(${p.color_code})`}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={row.quantity}
                        min="0"
                        step="0.01"
                        onChange={(e) =>
                          handleMaterialChange(
                            index,
                            "quantity",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={row.unit}
                        onChange={(e) =>
                          handleMaterialChange(index, "unit", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={row.packaging}
                        onChange={(e) =>
                          handleMaterialChange(
                            index,
                            "packaging",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={row.unit_price}
                        min="0"
                        step="0.01"
                        onChange={(e) =>
                          handleMaterialChange(
                            index,
                            "unit_price",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td className="os-money-col">
                      {Number(row.total_cost || 0).toFixed(2)}
                    </td>
                    <td>
                      {materialItems.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeMaterialRow(index)}
                        >
                          X
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={addMaterialRow}
          >
            + Adicionar material
          </button>

          {/* TOTAIS */}
          <hr />
          <h3 className="os-section-title">Totais</h3>
          <div className="os-grid os-grid-totals">
            <div className="form-group">
              <label>Total serviços (R$)</label>
              <input
                className="form-control"
                value={totalServices.toFixed(2)}
                readOnly
              />
            </div>
            <div className="form-group">
              <label>Total materiais (R$)</label>
              <input
                className="form-control"
                value={totalMaterials.toFixed(2)}
                readOnly
              />
            </div>
            <div className="form-group">
              <label>Total geral (R$)</label>
              <input
                className="form-control"
                value={totalGeneral.toFixed(2)}
                readOnly
              />
            </div>
            <div className="form-group">
              <label>Desconto (R$)</label>
              <input
                className="form-control"
                value={discountValue.toFixed(2)}
                readOnly
              />
            </div>
            <div className="form-group">
              <label>Total final (R$)</label>
              <input
                className="form-control"
                value={totalFinal.toFixed(2)}
                readOnly
              />
            </div>
          </div>

          <div className="os-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {editingId ? "Atualizar OS" : "Salvar OS"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetForm}
              disabled={loading}
            >
              Limpar
            </button>
          </div>
        </form>
      </div>

      {/* LISTAGEM */}
      <div className="os-card">
        <h2 className="os-section-title">Ordens de Serviço cadastradas</h2>
        <div className="table-responsive">
          <table className="table table-striped table-sm os-table">
            <thead>
              <tr>
                <th>Nº OS</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Pagamento</th>
                <th>Abertura</th>
                <th>Previsão</th>
                <th>Total final (R$)</th>
                <th style={{ width: "230px" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.order_number || o.id}</td>
                  <td>{o.clients?.name}</td>
                  <td>{o.status}</td>
                  <td>{o.payment_type}</td>
                  <td>{formatDateBR(o.opening_date)}</td>
                  <td>{formatDateBR(o.due_date)}</td>
                  <td className="os-money-col">
                    {Number(o.total_final || 0).toFixed(2)}
                  </td>
                  <td>
                    <div className="os-actions-row">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => navigate(`/orders/${o.id}/print`)}
                      >
                        Imprimir
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => navigate(`/orders/${o.id}/sign`)}
                      >
                        Assinar
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleEdit(o.id)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleRemove(o.id)}
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center">
                    Nenhuma OS cadastrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default OrdersPage;
