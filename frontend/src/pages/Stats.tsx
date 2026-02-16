import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { fetchStats } from "@/services/orders";
import "./Stats.scss";

type StatsData = {
  finanzas: any;
  operacion: any;
  mes_actual: any;
};

export default function Stats() {
  const [data, setData] = useState<StatsData | null>(null);

  useEffect(() => {
    fetchStats().then(setData);
  }, []);

  if (!data) return <div className="stats-loading">Cargando estadísticas...</div>;

  const { finanzas, operacion, mes_actual } = data;

  const moneyData = [
    { name: "Facturado", value: finanzas.total_facturado },
    { name: "Abonado", value: finanzas.total_abonado },
    { name: "Pendiente", value: finanzas.total_pendiente },
  ];

  const monthlyData = [
    { name: "Órdenes", value: mes_actual.ordenes },
    { name: "Ingresos", value: mes_actual.ingresos },
  ];

  const pieData = [
    { name: "Ingresos", value: finanzas.ingresos_brutos },
    { name: "Descuentos", value: finanzas.total_descuentos },
  ];

  const COLORS = ["#6366f1", "#ef4444"];

  return (
    <div className="stats-page">

      <h2>Estadísticas generales</h2>

      {/* ===== KPI CARDS ===== */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span>Total facturado</span>
          <h3>${finanzas.total_facturado.toLocaleString()}</h3>
        </div>

        <div className="kpi-card">
          <span>Total pendiente</span>
          <h3>${finanzas.total_pendiente.toLocaleString()}</h3>
        </div>

        <div className="kpi-card">
          <span>Órdenes totales</span>
          <h3>{operacion.total_ordenes}</h3>
        </div>

        <div className="kpi-card">
          <span>Ticket promedio</span>
          <h3>${finanzas.ticket_promedio.toFixed(2)}</h3>
        </div>
      </div>

      {/* ===== CHARTS ===== */}
      <div className="charts-grid">

        {/* Finanzas */}
        <div className="chart-card">
          <h4>Estado financiero</h4>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={moneyData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Mes actual */}
        <div className="chart-card">
          <h4>Mes actual</h4>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Descuentos vs Ingresos */}
        <div className="chart-card">
          <h4>Ingresos vs Descuentos</h4>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                outerRadius={80}
                label
              >
                {pieData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* ===== EXTRA INFO ===== */}
      <div className="extra-info">
        <div>
          <strong>Capacidad más solicitada:</strong>{" "}
          {operacion.capacidad_mas_solicitada} pasajeros
        </div>
        <div>
          <strong>Destino más frecuente:</strong>{" "}
          {operacion.destino_mas_frecuente}
        </div>
        <div>
          <strong>% promedio descuento:</strong>{" "}
          {finanzas.porcentaje_promedio_descuento.toFixed(2)}%
        </div>
      </div>

    </div>
  );
}