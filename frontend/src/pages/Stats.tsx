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
import { fetchStats } from "../services/orders";
import Sidebar from "../components/Sidebar";
import { DollarSign, TrendingUp, Receipt, CreditCard } from "lucide-react";
import "./Stats.scss";
import { sileo } from "sileo";

type StatsData = {
  finanzas: any;
  operacion: any;
  mes_actual: any;
};

export default function Stats() {
  const [data, setData] = useState<StatsData | null>(null);

  useEffect(() => {
    sileo
      .promise(fetchStats(), {
        loading: { title: "Cargando estadísticas..." },
        success: { title: "Datos actualizados" },
        error: { title: "Error al cargar estadísticas" },
      })
      .then(setData);
  }, []);
  if (!data)
    return <div className="stats-loading">Cargando estadísticas...</div>;

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
    <div className="stats-layout">
      <Sidebar />

      <div className="stats-page">
        <header className="stats-header">
          <h2>Estadísticas generales</h2>
          <p>Resumen financiero y operativo</p>
        </header>

        {/* ===== KPI CARDS ===== */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon purple">
              <DollarSign size={18} />
            </div>
            <div>
              <span>Total facturado</span>
              <h3>${finanzas.total_facturado.toLocaleString()}</h3>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon orange">
              <Receipt size={18} />
            </div>
            <div>
              <span>Total pendiente</span>
              <h3>${finanzas.total_pendiente.toLocaleString()}</h3>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon green">
              <TrendingUp size={18} />
            </div>
            <div>
              <span>Órdenes totales</span>
              <h3>{operacion.total_ordenes}</h3>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon blue">
              <CreditCard size={18} />
            </div>
            <div>
              <span>Ticket promedio</span>
              <h3>${finanzas.ticket_promedio.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        {/* ===== CHARTS ===== */}
        <div className="charts-grid">
          <div className="chart-card">
            <h4>Estado financiero</h4>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={moneyData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h4>Mes actual</h4>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#16a34a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h4>Ingresos vs Descuentos</h4>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" outerRadius={85} label>
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
    </div>
  );
}
