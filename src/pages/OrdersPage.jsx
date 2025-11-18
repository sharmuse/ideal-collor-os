import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const STATUS_OPTIONS = [
  { value: "aberta", label: "Aberta" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
];

const PAYMENT_OPTIONS = [
  { value: "prazo", label: "A prazo" },
  { value: "avista", label: "À vista" },
];

const PACKAGING_OPTIONS = [
  { value: "Saco", label: "Saco" },
  { value: "Balde", label: "Balde" },
  { value: "Outro", label: "Outro" },
];

const emptyForm = () => ({
  id: null,
  client_id: "",
  site_id: "",
  status: "aberta",
  payment_type: "prazo",
  opening_date: new Date().toISOString().slice(0, 10),
  due_date: "",
  technical_notes: "",
  commercial_notes: "",
  discount_percent: 0,
  total_services: 0,
  total_materials: 0,
  total_general: 0,
  total_final: 0,
});

const emptyServiceLine = () => ({
  service_id: "",
  quantity: "",
  unit_price: "",
  line_total: 0,
});

const emptyMaterialLine = () => ({
  product_id: "",
  quantity: "",
  unit: "",
  packaging: "",
  unit_price: "",
  total_cost: 0,
});

function formatDate(dateStr) {
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

  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [serviceLines, setServiceLines] = useState([emptyServiceLine()]);
  const [materialLines, setMaterialLines] = useState([emptyMaterialLine()]);
  const [editingOrderId, setEditingOrderId] = useState(null);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const [clientsRes, sitesRes, servicesRes, productsRes, ordersRes] =
          await Promise.all([
            supabase.from("clients").select("*").order("name", { ascending: true }),
            supabase.from("sites").select("*").order("created_at", { ascending: false }),
            supabase.from("services").select("*").order("name", { ascending: true }),
            supabase.from("products").select("*").order("name", { ascending: true }),
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
                clients:client_id ( name ),
                sites:site_id ( street, city, state )
              `
              )
              .order("opening_date", { ascending: false }),
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
        alert("Erro ao carregar dados iniciais das Ordens de Serviço.");
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, []);

  function recalcTotals(nextServiceLines, nextMaterialLines, nextForm) {
    const servicesTotal = nextServiceLines.reduce(
      (sum, line) => sum + (Number(line.line_total) || 0),
      0
    );
    const materialsTotal = nextMaterialLines.reduce(
      (sum, line) => sum + (Number(line.total_cost) || 0),
      0
    );
    const totalGeneral = servicesTotal + materialsTotal;

    let discountPercent = Number(nextForm.discount_percent) || 0;

    if (nextForm.payment_type !== "avista") {
      discountPercent = 0;
    } else if (discountPercent > 8) {
      discountPercent = 8;
    } else if (discountPercent < 0) {
      discountPercent = 0;
    }

    const discountValue = (totalGeneral * discountPercent) / 100;
    const totalFinal = totalGeneral - discountValue;

    setForm((prev) => ({
      ...prev,
      ...nextForm,
      discount_percent: discountPercent,
      total_services: servicesTotal,
      total_materials: materialsTotal,
      total_general: totalGeneral,
      total_final: totalFinal,
    }));
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    const nextForm = { ...form, [name]: value };
    recalcTotals(serviceLines, materialLines, nextForm);
  }

  function handleServiceLineChange(index, field, value) {
    const lines = [...serviceLines];
    lines[index] = { ...lines[index], [field]: value };

    if (field === "service_id") {
      const svc = services.find((s) => s.id === value);
      if (svc && svc.labor_price_unit != null) {
        lines[index].unit_price = svc.labor_price_unit;
      }
    }

    const qty = Number(lines[index].quantity) || 0;
    const price = Number(lines[index].unit_price) || 0;
    lines[index].line_total = qty * price;

    setServiceLines(lines);
    recalcTotals(lines, materialLines, form);
  }

  function handleMaterialLineChange(index, field, value) {
    const lines = [...materialLines];
    lines[index] = { ...lines[index], [field]: value };

    if (field === "product_id") {
      const prod = products.find((p) => p.id === value);
      if (prod) {
        if (prod.unit) lines[index].unit = prod.unit;
        if (prod.price_unit != null) lines[index].unit_price = prod.price_unit;
      }
    }

    const qty = Number(lines[index].quantity) || 0;
    const price = Number(lines[index].unit_price) || 0;
    lines[index].total_cost = qty * price;

    setMaterialLines(lines);
    recalcTotals(serviceLines, lines, form);
  }

  function addServiceLine() {
    setServiceLines((prev) => [...prev, emptyServiceLine()]);
  }

  function removeServiceLine(index) {
    const lines = serviceLines.filter((_, i) => i !== index);
    setServiceLines(lines.length ? lines : [emptyServiceLine()]);
    recalcTotals(lines, materialLines, form);
  }

  function addMaterialLine() {
    setMaterialLines((prev) => [...prev, emptyMaterialLine()]);
  }

  function removeMaterialLine(index) {
    const lines = materialLines.filter((_, i) => i !== index);
    setMaterialLines(lines.length ? lines : [emptyMaterialLine()]);
    recalcTotals(serviceLines, lines, form);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    try {
      let orderId = editingOrderId;

      const payload = {
        client_id: form.client_id || null,
        site_id: form.site_id || null,
        status: form.status,
        payment_type: form.payment_type,
        opening_date: form.opening_date || null,
        due_date: form.due_date || null,
        technical_notes: form.technical_notes || null,
        commercial_notes: form.commercial_notes || null,
        total_services: form.total_services || 0,
        total_materials: form.total_materials || 0,
        total_general: form.total_general || 0,
        total_final: form.total_final || 0,
        discount_percent: form.discount_percent || 0,
      };

      if (!orderId) {
        const { data, error } = await supabase
          .from("orders")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;
        orderId = data.id;
      } else {
        const { error } = await supabase
          .from("orders")
          .update(payload)
          .eq("id", orderId);

        if (error) throw error;

        await supabase.from("order_services").delete().eq("order_id", orderId);
        await supabase.from("order_materials").delete().eq("order_id", orderId);
      }

      const servicesToInsert = serviceLines
        .filter((l) => l.service_id && l.quantity)
        .map((l) => ({
          order_id: orderId,
          service_id: l.service_id,
          quantity: Number(l.quantity) || 0,
          unit_price: Number(l.unit_price) || 0,
          line_total: Number(l.line_total) || 0,
        }));

      if (servicesToInsert.length) {
        const { error } = await supabase
          .from("order_services")
          .insert(servicesToInsert);
        if (error) throw error;
      }

      const materialsToInsert = materialLines
        .filter((l) => l.product_id && l.quantity)
        .map((l) => ({
          order_id: orderId,
          product_id: l.product_id,
          quantity: Number(l.quantity) || 0,
          unit_price: Number(l.unit_price) || 0,
          total_cost: Number(l.total_cost) || 0,
          unit: l.unit || null,
          packaging: l.packaging || null,
        }));

      if (materialsToInsert.length) {
        const { error } = await supabase
          .from("order_materials")
          .insert(materialsToInsert);
        if (error) throw error;
      }

      alert("Ordem de Serviço salva com sucesso!");

      const { data: ordersData, error: ordersError } = await supabase
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
          clients:client_id ( name ),
          sites:site_id ( street, city, state )
        `
        )
        .order("opening_date", { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      setForm(emptyForm());
      setServiceLines([emptyServiceLine()]);
      setMaterialLines([emptyMaterialLine()]);
      setEditingOrderId(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar a Ordem de Serviço.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditOrder(orderId) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          order_services (
            service_id,
            quantity,
            unit_price,
            line_total
          ),
          order_materials (
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

      setEditingOrderId(orderId);

      setForm({
        id: data.id,
        client_id: data.client_id || "",
        site_id: data.site_id || "",
        status: data.status || "aberta",
        payment_type: data.payment_type || "prazo",
        opening_date: data.opening_date || "",
        due_date: data.due_date || "",
        technical_notes: data.technical_notes || "",
        commercial_notes: data.commercial_notes || "",
        discount_percent: data.discount_percent || 0,
        total_services: data.total_services || 0,
        total_materials: data.total_materials || 0,
        total_general: data.total_general || 0,
        total_final: data.total_final || 0,
      });

      setServiceLines(
        (data.order_services || []).length
          ? data.order_services.map((s) => ({
              service_id: s.service_id || "",
              quantity: s.quantity ?? "",
              unit_price: s.unit_price ?? "",
              line_total: s.line_total ?? 0,
            }))
          : [emptyServiceLine()]
      );

      setMaterialLines(
        (data.order_materials || []).length
          ? data.order_materials.map((m) => ({
              product_id: m.product_id || "",
              quantity: m.quantity ?? "",
              unit: m.unit ?? "",
              packaging: m.packaging ?? "",
              unit_price: m.unit_price ?? "",
              total_cost: m.total_cost ?? 0,
            }))
          : [emptyMaterialLine()]
      );
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar OS para edição.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteOrder(orderId) {
    if (!window.confirm("Tem certeza que deseja remover esta OS?")) return;

    try {
      await supabase.from("order_services").delete().eq("order_id", orderId);
      await supabase.from("order_materials").delete().eq("order_id", orderId);
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      if (error) throw error;

      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err) {
      console.error(err);
      alert("Erro ao remover OS.");
    }
  }

  function handlePrint(orderId) {
    navigate(`/orders/${orderId}/print`);
  }

  function handleSign(orderId) {
    navigate(`/orders/${orderId}/sign`);
  }

  const sitesForClient = form.client_id
    ? sites.filter((s) => s.client_id === form.client_id)
    : sites;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Ordens de Serviço</h1>
        <p>Cadastre e gerencie as OS da IDEAL COLLOR.</p>
      </div>

      {loading && <p style={{ marginBottom: "1rem" }}>Carregando dados...</p>}

      {/* FORMULÁRIO COMPLETO */}
      <form onSubmit={handleSubmit} className="card" style={{ marginBottom: "2rem" }}>
        <h2>{editingOrderId ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}</h2>

        <div className="form-grid">
          <div className="form-group">
            <label>Cliente</label>
            <select
              name="client_id"
              value={form.client_id}
              onChange={handleFormChange}
              required
            >
              <option value="">Selecione</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Obra / Local</label>
            <select
              name="site_id"
              value={form.site_id}
              onChange={handleFormChange}
            >
              <option value="">Selecione</option>
              {sitesForClient.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.street} - {s.city}/{s.state}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleFormChange}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Pagamento</label>
            <select
              name="payment_type"
              value={form.payment_type}
              onChange={handleFormChange}
            >
              {PAYMENT_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Abertura</label>
            <input
              type="date"
              name="opening_date"
              value={form.opening_date || ""}
              onChange={handleFormChange}
            />
          </div>

          <div className="form-group">
            <label>Previsão</label>
            <input
              type="date"
              name="due_date"
              value={form.due_date || ""}
              onChange={handleFormChange}
            />
          </div>

          <div className="form-group">
            <label>Desconto (%)</label>
            <input
              type="number"
              step="0.1"
              name="discount_percent"
              value={form.discount_percent}
              onChange={handleFormChange}
            />
            <small>Máx. 8% e só para pagamento à vista.</small>
          </div>
        </div>

        <div className="form-group">
          <label>Observações técnicas</label>
          <textarea
            name="technical_notes"
            value={form.technical_notes}
            onChange={handleFormChange}
          />
        </div>

        <div className="form-group">
          <label>Observações comerciais</label>
          <textarea
            name="commercial_notes"
            value={form.commercial_notes}
            onChange={handleFormChange}
          />
        </div>

        {/* SERVIÇOS */}
        <h3>Serviços</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Serviço</th>
              <th>Quantidade</th>
              <th>Valor unitário (R$)</th>
              <th>Total (R$)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {serviceLines.map((line, idx) => (
              <tr key={idx}>
                <td>
                  <select
                    value={line.service_id}
                    onChange={(e) =>
                      handleServiceLineChange(idx, "service_id", e.target.value)
                    }
                  >
                    <option value="">Selecione</option>
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
                    step="0.01"
                    value={line.quantity}
                    onChange={(e) =>
                      handleServiceLineChange(idx, "quantity", e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={line.unit_price}
                    onChange={(e) =>
                      handleServiceLineChange(idx, "unit_price", e.target.value)
                    }
                  />
                </td>
                <td>{(Number(line.line_total) || 0).toFixed(2)}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => removeServiceLine(idx)}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={addServiceLine}
          style={{ marginBottom: "1rem" }}
        >
          Adicionar serviço
        </button>

        {/* MATERIAIS */}
        <h3>Materiais / Produtos</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Produto / Material</th>
              <th>Quantidade</th>
              <th>Unidade</th>
              <th>Embalagem</th>
              <th>Valor unitário (R$)</th>
              <th>Total (R$)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {materialLines.map((line, idx) => (
              <tr key={idx}>
                <td>
                  <select
                    value={line.product_id}
                    onChange={(e) =>
                      handleMaterialLineChange(idx, "product_id", e.target.value)
                    }
                  >
                    <option value="">Selecione</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.type} - {p.name} ({p.color_code})
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={line.quantity}
                    onChange={(e) =>
                      handleMaterialLineChange(idx, "quantity", e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={line.unit}
                    onChange={(e) =>
                      handleMaterialLineChange(idx, "unit", e.target.value)
                    }
                  />
                </td>
                <td>
                  <select
                    value={line.packaging}
                    onChange={(e) =>
                      handleMaterialLineChange(idx, "packaging", e.target.value)
                    }
                  >
                    <option value="">Selecione</option>
                    {PACKAGING_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={line.unit_price}
                    onChange={(e) =>
                      handleMaterialLineChange(idx, "unit_price", e.target.value)
                    }
                  />
                </td>
                <td>{(Number(line.total_cost) || 0).toFixed(2)}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => removeMaterialLine(idx)}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={addMaterialLine}
          style={{ marginBottom: "1rem" }}
        >
          Adicionar material
        </button>

        {/* TOTAIS */}
        <div className="totals-grid">
          <div>
            <strong>Total serviços:</strong>{" "}
            R$ {(Number(form.total_services) || 0).toFixed(2)}
          </div>
          <div>
            <strong>Total materiais:</strong>{" "}
            R$ {(Number(form.total_materials) || 0).toFixed(2)}
          </div>
          <div>
            <strong>Total geral:</strong>{" "}
            R$ {(Number(form.total_general) || 0).toFixed(2)}
          </div>
          <div>
            <strong>Total final:</strong>{" "}
            R$ {(Number(form.total_final) || 0).toFixed(2)}
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving
            ? "Salvando..."
            : editingOrderId
            ? "Salvar alterações"
            : "Salvar Ordem de Serviço"}
        </button>
        {editingOrderId && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginLeft: "0.5rem" }}
            onClick={() => {
              setForm(emptyForm());
              setServiceLines([emptyServiceLine()]);
              setMaterialLines([emptyMaterialLine()]);
              setEditingOrderId(null);
            }}
          >
            Cancelar edição
          </button>
        )}
      </form>

      {/* LISTA DE OS */}
      <div className="card">
        <h2>Ordens de Serviço cadastradas</h2>

        {orders.length === 0 ? (
          <p>Nenhuma OS cadastrada.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nº OS</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Pagamento</th>
                <th>Abertura</th>
                <th>Previsão</th>
                <th>Total final (R$)</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.order_number}</td>
                  <td>{o.clients?.name || "-"}</td>
                  <td>
                    {
                      STATUS_OPTIONS.find((s) => s.value === o.status)?.label ||
                      o.status
                    }
                  </td>
                  <td>
                    {
                      PAYMENT_OPTIONS.find((p) => p.value === o.payment_type)
                        ?.label || o.payment_type
                    }
                  </td>
                  <td>{formatDate(o.opening_date)}</td>
                  <td>{formatDate(o.due_date)}</td>
                  <td>{(Number(o.total_final) || 0).toFixed(2)}</td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => handlePrint(o.id)}
                    >
                      Imprimir
                    </button>{" "}
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => handleSign(o.id)}
                    >
                      Assinar
                    </button>{" "}
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => handleEditOrder(o.id)}
                    >
                      Editar
                    </button>{" "}
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={() => handleDeleteOrder(o.id)}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default OrdersPage;
