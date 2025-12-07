import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getAnalyticsOverview, getOrdersPerDay, getTopProducts, getPreferencesDistribution, getEngagement, getAllFoods, getAnalyticsSnapshot } from '../services/api';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { Line, Bar, Pie } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartModal from '../components/ChartModal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  zoomPlugin,
  Title,
  Tooltip,
  Legend
);

const AnalyticsOverview = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [ordersSeries, setOrdersSeries] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [topProducts, setTopProducts] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [engagement, setEngagement] = useState(null);
  // inventory will be normalized to an array of { foodName, amount, price? }
  const [inventory, setInventory] = useState([]);
  const [allergenCounts, setAllergenCounts] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [daysWindow, setDaysWindow] = useState(30);
  const [zoomEnabled, setZoomEnabled] = useState(false);
  const ordersRef = React.useRef();
  const topRef = React.useRef();
  const costRef = React.useRef();
  const customersRef = React.useRef();
  const inventoryRef = React.useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await getCurrentUser();
        if (user.role !== 'ROLE_ADMIN') {
          alert('Access denied. Admin privileges required.');
          navigate('/recommendations');
          return;
        }

        const [ov, orders, top, prefs, eng, invFoods, snap] = await Promise.all([
          getAnalyticsOverview(),
          getOrdersPerDay(daysWindow),
          getTopProducts(10),
          getPreferencesDistribution(),
          getEngagement(daysWindow),
          getAllFoods(),
          getAnalyticsSnapshot(daysWindow),
        ]);

        setOverview(ov);

  // orders is object { '2025-11-01': 2, ... }
        const labels = Object.keys(orders);
        const data = Object.values(orders);
        setOrdersSeries({ labels, data });

        setTopProducts(top);
        setPreferences(prefs);
        setEngagement(eng);
        // normalize inventory: prefer the foods API (inventory management uses getAllFoods), else fallback to snapshot
        let invList = [];
        if (invFoods && Array.isArray(invFoods) && invFoods.length) {
          invList = invFoods;
        } else if (snap && snap.inventoryList) {
          invList = snap.inventoryList;
        } else if (snap && snap.inventoryMap) {
          invList = Object.entries(snap.inventoryMap).map(([k, v]) => ({ foodName: k, amount: v }));
        }
        setInventory(invList || []);
  // anomalies come from snapshot (if present)
  setAnomalies((snap && snap.anomalies) ? snap.anomalies : []);
  // allergen counts (tokenized) come from snapshot.preferences.allergenCounts when available
  setAllergenCounts((snap && snap.preferences && snap.preferences.allergenCounts) ? snap.preferences.allergenCounts : {});
      } catch (error) {
        console.error('Error loading analytics:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  if (loading) return (
    <div className="analytics-container" role="main" aria-busy="true">
      <div className="loading" role="status" aria-live="polite">Loading analytics...</div>
    </div>
  );
  
  if (!overview) return (
    <div className="analytics-container" role="main">
      <p role="status">No analytics available.</p>
    </div>
  );

  const ordersData = {
    labels: ordersSeries.labels,
    datasets: [
      {
        label: 'Orders per day',
        data: ordersSeries.data,
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
      // anomalies dataset: show only anomaly points
      {
        label: 'Anomalies',
        data: (ordersSeries.labels || []).map((lbl, i) => {
          const match = (anomalies || []).find(a => a.date === lbl);
          return match ? ordersSeries.data[i] : null;
        }),
        showLine: false,
        pointBackgroundColor: 'rgba(255,99,132,0.9)',
        pointRadius: (ctx) => {
          // larger radius for visible anomaly points
          return (anomalies || []).some(a => a.date === (ordersSeries.labels[ctx.dataIndex])) ? 7 : 0;
        },
      }
    ],
  };

  const zoomOptions = {
    plugins: {
      zoom: {
        zoom: {
          wheel: { enabled: zoomEnabled },
          pinch: { enabled: zoomEnabled },
          mode: 'x',
        },
        pan: { enabled: zoomEnabled, mode: 'x' },
      }
    }
  };

  const topProductsData = {
    labels: Object.keys(topProducts || {}),
    datasets: [
      {
        label: 'Top products (count)',
        data: Object.values(topProducts || {}),
        backgroundColor: 'rgba(53, 162, 235, 0.5)'
      }
    ]
  };

  const costPrefData = preferences ? {
    labels: Object.keys(preferences.costPreference || {}),
    datasets: [{ data: Object.values(preferences.costPreference || {}), backgroundColor: ['#4dc9f6','#f67019','#f53794','#537bc4','#acc236'] }]
  } : null;

  // For dietary/allergen chart: prefer per-allergen counts coming from snapshot (allergenCounts)
  const dietPrefData = (() => {
    const source = (allergenCounts && Object.keys(allergenCounts).length) ? allergenCounts : (preferences ? preferences.dietaryRestrictions : {});
    const labels = Object.keys(source || {});
    const data = Object.values(source || {});
    return labels.length ? { labels, datasets: [{ data, backgroundColor: ['#8dd3c7','#ffffb3','#bebada','#fb8072','#80b1d3'] }] } : null;
  })();

  const topCustomersData = engagement ? {
    labels: Object.keys(engagement.topCustomers || {}),
    datasets: [{ label: 'Orders', data: Object.values(engagement.topCustomers || {}), backgroundColor: 'rgba(75,192,192,0.6)' }]
  } : null;

  const exportCsv = (labels, data, filename = 'chart.csv') => {
    const rows = [];
    rows.push(['label', 'value']);
    for (let i = 0; i < labels.length; i++) {
      rows.push([labels[i], data[i]]);
    }
    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPng = (chartRef, filename = 'chart.png') => {
    try {
      const chart = chartRef?.current;
      let url = null;
      if (!chart) return;
      if (chart.toBase64Image) {
        url = chart.toBase64Image();
      } else if (chart.chartInstance && chart.chartInstance.toBase64Image) {
        url = chart.chartInstance.toBase64Image();
      } else if (chart.canvas && chart.canvas.toDataURL) {
        url = chart.canvas.toDataURL('image/png');
      }
      if (!url) return;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    } catch (e) {
      console.error('Export PNG failed', e);
    }
  };

  const getChartBase64 = (chartRef) => {
    try {
      const chart = chartRef?.current;
      if (!chart) return null;
      if (chart.toBase64Image) return chart.toBase64Image();
      if (chart.chartInstance && chart.chartInstance.toBase64Image) return chart.chartInstance.toBase64Image();
      if (chart.canvas && chart.canvas.toDataURL) return chart.canvas.toDataURL('image/png');
    } catch (e) {
      console.error('getChartBase64 failed', e);
    }
    return null;
  };

  const downloadPdfAllCharts = async () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      // Title / overview page
      doc.setFontSize(16);
      doc.text('Analytics Snapshot', 14, 20);
      doc.setFontSize(11);
      doc.text(`Window: last ${daysWindow} days`, 14, 30);
      doc.text(`Total Orders: ${overview.totalOrders}`, 14, 40);
      doc.text(`Fulfilled: ${overview.fulfilledOrders}  Unfulfilled: ${overview.unfulfilledOrders}`, 14, 46);
      doc.text(`Total Revenue: $${overview.totalRevenue}  Avg Order Value: $${Number(overview.avgOrderValue).toFixed(2)}`, 14, 52);

      // helper to add image per page
      const addImagePage = (imgData, title) => {
        if (!imgData) return;
        doc.addPage();
        doc.setFontSize(12);
        doc.text(title, 14, 14);
        // fit image into page area
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 16;
        const w = pageWidth - margin * 2;
        const h = pageHeight - 40;
        doc.addImage(imgData, 'PNG', margin, 20, w, h, undefined, 'FAST');
      };

      // Capture charts
      const ordersImg = getChartBase64(ordersRef);
      addImagePage(ordersImg, `Orders (last ${daysWindow} days)`);

      const topImg = getChartBase64(topRef);
      addImagePage(topImg, 'Top Products');

      const costImg = getChartBase64(costRef);
      addImagePage(costImg, 'Customer Cost Preferences');

      const custImg = getChartBase64(customersRef);
      addImagePage(custImg, `Top Customers (last ${daysWindow} days)`);

      const invImg = getChartBase64(inventoryRef);
      addImagePage(invImg, 'Inventory Levels');

      // Diet/allergies chart might not have a ref, render last: we used costRef for PNG earlier; if diet exists include it using costRef as fallback
      // finalize and save
      const fileName = `analytics-${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(fileName);
    } catch (e) {
      console.error('downloadPdfAllCharts failed', e);
      alert('Failed to create PDF snapshot. See console for details.');
    }
  };

  const downloadCsvBundle = async () => {
    try {
      const zip = new JSZip();
      // Orders CSV
      if (ordersSeries && ordersSeries.labels) {
        const rows = [['date','orders']].concat(ordersSeries.labels.map((l,i)=>[l, ordersSeries.data[i]]));
        zip.file('orders_per_day.csv', rows.map(r=>r.join(',')).join('\n'));
      }
      // Top products
      if (topProducts) {
        const rows = [['product','count']].concat(Object.entries(topProducts).map(([k,v])=>[k,v]));
        zip.file('top_products.csv', rows.map(r=>'"'+r.join('","')+'"').join('\n'));
      }
      // Cost preference
      if (preferences && preferences.costPreference) {
        const rows = [['costPreference','count']].concat(Object.entries(preferences.costPreference));
        zip.file('cost_preferences.csv', rows.map(r=>r.join(',')).join('\n'));
      }
      // Dietary restrictions / allergen counts: prefer tokenized allergenCounts if available
      const allergenSource = (allergenCounts && Object.keys(allergenCounts).length) ? allergenCounts : (preferences && preferences.dietaryRestrictions ? preferences.dietaryRestrictions : null);
      if (allergenSource) {
        const rows = [['allergenOrRestriction','count']].concat(Object.entries(allergenSource));
        zip.file('dietary_restrictions_or_allergens.csv', rows.map(r=>r.join(',')).join('\n'));
      }
      // Top customers
      if (engagement && engagement.topCustomers) {
        const rows = [['customer','orders']].concat(Object.entries(engagement.topCustomers));
        zip.file('top_customers.csv', rows.map(r=>r.join(',')).join('\n'));
      }
      // Inventory
      if (inventory && inventory.length) {
        const rows = [['foodName','amount','price']].concat(inventory.map(f=>[f.foodName, f.amount, f.price || '']));
        zip.file('inventory.csv', rows.map(r=>r.join(',')).join('\n'));
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-csv-${new Date().toISOString().slice(0,10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('downloadCsvBundle failed', e);
      alert('Failed to create CSV bundle. See console.');
    }
  };

  const downloadSnapshot = async () => {
    try {
      const snapshot = await getAnalyticsSnapshot(daysWindow);
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-snapshot-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Snapshot download failed', e);
      alert('Failed to download snapshot. Check console for details.');
    }
  };

  return (
    <div className="analytics-container" role="main" aria-labelledby="analytics-heading">
      <div className="dashboard-header">
        <h1 id="analytics-heading"><span aria-hidden="true">📈</span> Analytics & Insights</h1>
      </div>

  <div className="dashboard-stats" role="region" aria-label="Key statistics overview">
        <div className="stat-card" role="article" tabIndex={0} aria-label={`Total orders: ${overview.totalOrders}`}>
          <h3 id="total-orders-stat">Total Orders</h3>
          <p className="stat-number" aria-labelledby="total-orders-stat">{overview.totalOrders}</p>
        </div>
        <div className="stat-card" role="article" tabIndex={0} aria-label={`Fulfilled orders: ${overview.fulfilledOrders}`}>
          <h3 id="fulfilled-orders-stat">Fulfilled Orders</h3>
          <p className="stat-number" aria-labelledby="fulfilled-orders-stat">{overview.fulfilledOrders}</p>
        </div>
        <div className="stat-card" role="article" tabIndex={0} aria-label={`Unfulfilled orders: ${overview.unfulfilledOrders}`}>
          <h3 id="unfulfilled-orders-stat">Unfulfilled Orders</h3>
          <p className="stat-number" aria-labelledby="unfulfilled-orders-stat">{overview.unfulfilledOrders}</p>
        </div>
        <div className="stat-card" role="article" tabIndex={0} aria-label={`Total revenue: ${overview.totalRevenue} dollars`}>
          <h3 id="total-revenue-stat">Total Revenue</h3>
          <p className="stat-number" aria-labelledby="total-revenue-stat">${overview.totalRevenue}</p>
        </div>
        <div className="stat-card" role="article" tabIndex={0} aria-label={`Average order value: ${overview.avgOrderValue.toFixed(2)} dollars`}>
          <h3 id="avg-order-stat">Avg Order Value</h3>
          <p className="stat-number" aria-labelledby="avg-order-stat">${overview.avgOrderValue.toFixed(2)}</p>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '8px auto' }}>
        <div className="stat-card" style={{ padding: 12 }} role="region" aria-labelledby="anomalies-heading">
          <h4 id="anomalies-heading">Anomalies</h4>
          {anomalies && anomalies.length > 0 ? (
            <div>
              <ul style={{ margin: 0, paddingLeft: 16 }} role="list" aria-label={`${anomalies.length} anomalies detected`}>
                {anomalies.map((a) => (
                  <li key={a.date} role="listitem" aria-label={`Anomaly on ${a.date}: ${a.count} orders, type ${a.type}, z-score ${Number(a.zScore).toFixed(2)}`}>
                    <strong>{a.date}</strong>: {a.count} ({a.type}, z={Number(a.zScore).toFixed(2)})
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div style={{ color: '#666' }} role="status">No anomalies detected in selected window.</div>
          )}
        </div>
      </div>

      <div className="analytics-controls" style={{ maxWidth: 1200, margin: '10px auto' }} role="region" aria-label="Analytics controls and export options">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} role="group" aria-label="Time window selection">
          <span>Window:</span>
          {[7,30,90,365].map(d => (
            <button 
              key={d} 
              className={`nav-button ${daysWindow===d? 'active':''}`} 
              onClick={() => { setDaysWindow(d); setLoading(true); window.requestAnimationFrame(()=> { window.location.reload(); }) }}
              aria-label={`Set time window to ${d} days`}
              aria-pressed={daysWindow===d}
            >
              {d}d
            </button>
          ))}
          <label style={{ marginLeft: 12 }}>
            <input 
              type="checkbox" 
              checked={zoomEnabled} 
              onChange={(e) => setZoomEnabled(e.target.checked)}
              aria-label="Enable zoom on charts"
            /> Enable zoom
          </label>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }} role="group" aria-label="Export options">
          <button className="nav-button" onClick={downloadSnapshot} style={{ marginLeft: 8 }} aria-label="Download analytics snapshot as JSON file">Download snapshot (JSON)</button>
          <button className="nav-button" onClick={downloadPdfAllCharts} style={{ marginLeft: 8 }} aria-label="Download all charts as PDF file">Download snapshot (PDF)</button>
          <button className="nav-button" onClick={downloadCsvBundle} style={{ marginLeft: 8 }} aria-label="Download all data as CSV bundle ZIP file">Download CSV bundle (ZIP)</button>
        </div>
      </div>

      <div className="analytics-charts" role="region" aria-label="Analytics charts">
        <div className="chart-card" role="article" aria-labelledby="orders-chart-heading">
          <div className="chart-header">
            <h3 id="orders-chart-heading">Orders (last {daysWindow} days)</h3>
            <div className="chart-toolbar" role="group" aria-label="Orders chart actions">
              <button className="btn-link" onClick={() => { setModalContent(<Line data={ordersData} options={zoomOptions} />); setModalOpen(true); }} aria-label="Maximize orders chart">Maximize</button>
              <button className="btn-link" onClick={() => exportPng(ordersRef, 'orders.png')} aria-label="Export orders chart as PNG">PNG</button>
              <button className="btn-link" onClick={() => exportCsv(ordersSeries.labels, ordersSeries.data, 'orders.csv')} aria-label="Export orders data as CSV">CSV</button>
            </div>
          </div>
          <div className="chart-body small-chart" role="img" aria-label={`Line chart showing orders per day for the last ${daysWindow} days`}>
            <Line ref={ordersRef} data={ordersData} options={{ maintainAspectRatio: false, ...zoomOptions }} />
          </div>
        </div>

        <div className="chart-card" role="article" aria-labelledby="top-products-chart-heading">
          <div className="chart-header">
            <h3 id="top-products-chart-heading">Top Products</h3>
            <div className="chart-toolbar" role="group" aria-label="Top products chart actions">
              <button className="btn-link" onClick={() => { setModalContent(<Bar data={topProductsData} options={zoomOptions} />); setModalOpen(true); }} aria-label="Maximize top products chart">Maximize</button>
              <button className="btn-link" onClick={() => exportPng(topRef, 'top-products.png')} aria-label="Export top products chart as PNG">PNG</button>
              <button className="btn-link" onClick={() => exportCsv(Object.keys(topProductsData.labels || topProducts || {}), Object.values(topProducts || {}), 'top-products.csv')} aria-label="Export top products data as CSV">CSV</button>
            </div>
          </div>
          <div className="chart-body small-chart" role="img" aria-label="Bar chart showing top products by order count">
            <Bar ref={topRef} data={topProductsData} options={{ maintainAspectRatio: false, ...zoomOptions }} />
          </div>
        </div>

        <div className="chart-card" role="article" aria-labelledby="cost-pref-chart-heading">
          <div className="chart-header">
            <h3 id="cost-pref-chart-heading">Customer Cost Preferences</h3>
            <div className="chart-toolbar" role="group" aria-label="Cost preferences chart actions">
              <button className="btn-link" onClick={() => { setModalContent(costPrefData ? <Pie data={costPrefData} options={zoomOptions} /> : <p>No preference data</p>); setModalOpen(true); }} aria-label="Maximize cost preferences chart">Maximize</button>
              <button className="btn-link" onClick={() => exportPng(costRef, 'cost-pref.png')} aria-label="Export cost preferences chart as PNG">PNG</button>
              <button className="btn-link" onClick={() => costPrefData && exportCsv(Object.keys(costPrefData.labels || {}), Object.values(costPrefData.datasets[0].data || []), 'cost-preferences.csv')} aria-label="Export cost preferences data as CSV">CSV</button>
            </div>
          </div>
          <div className="chart-body small-chart" role="img" aria-label="Pie chart showing customer cost preference distribution">
            {costPrefData ? <Pie ref={costRef} data={costPrefData} options={{ maintainAspectRatio: false, ...zoomOptions }} /> : <p role="status">No preference data</p>}
          </div>
        </div>

        <div className="chart-card" role="article" aria-labelledby="diet-pref-chart-heading">
          <div className="chart-header">
            <h3 id="diet-pref-chart-heading">Dietary Restrictions / Allergies (users)</h3>
            <div className="chart-toolbar" role="group" aria-label="Dietary restrictions chart actions">
              <button className="btn-link" onClick={() => { setModalContent(dietPrefData ? <Pie data={dietPrefData} options={zoomOptions} /> : <p>No data</p>); setModalOpen(true); }} aria-label="Maximize dietary restrictions chart">Maximize</button>
              <button className="btn-link" onClick={() => exportPng(costRef, 'diet-pref.png')} aria-label="Export dietary restrictions chart as PNG">PNG</button>
              <button className="btn-link" onClick={() => dietPrefData && exportCsv(Object.keys(dietPrefData.labels || {}), Object.values(dietPrefData.datasets[0].data || []), 'diet-preferences.csv')} aria-label="Export dietary restrictions data as CSV">CSV</button>
            </div>
          </div>
          <div className="chart-body small-chart" role="img" aria-label="Pie chart showing dietary restrictions and allergen distribution among users">
            {dietPrefData ? <Pie data={dietPrefData} options={{ maintainAspectRatio: false, ...zoomOptions }} /> : <p role="status">No diet preference data</p>}
          </div>
        </div>

        <div className="chart-card" role="article" aria-labelledby="top-customers-chart-heading">
          <div className="chart-header">
            <h3 id="top-customers-chart-heading">Top Customers (last {daysWindow} days)</h3>
            <div className="chart-toolbar" role="group" aria-label="Top customers chart actions">
              <button className="btn-link" onClick={() => { setModalContent(topCustomersData ? <Bar data={topCustomersData} options={zoomOptions} /> : <p>No engagement data</p>); setModalOpen(true); }} aria-label="Maximize top customers chart">Maximize</button>
              <button className="btn-link" onClick={() => exportPng(customersRef, 'top-customers.png')} aria-label="Export top customers chart as PNG">PNG</button>
              <button className="btn-link" onClick={() => topCustomersData && exportCsv(Object.keys(topCustomersData.labels || {}), Object.values(topCustomersData.datasets[0].data || []), 'top-customers.csv')} aria-label="Export top customers data as CSV">CSV</button>
            </div>
          </div>
          <div className="chart-body small-chart" role="img" aria-label={`Bar chart showing top customers by order count for the last ${daysWindow} days`}>
            {topCustomersData ? <Bar ref={customersRef} data={topCustomersData} options={{ maintainAspectRatio: false, ...zoomOptions }} /> : <p role="status">No engagement data</p>}
          </div>
        </div>

        <div className="chart-card" role="article" aria-labelledby="inventory-chart-heading">
          <div className="chart-header">
            <h3 id="inventory-chart-heading">Inventory Levels</h3>
            <div className="chart-toolbar" role="group" aria-label="Inventory chart actions">
              <button className="btn-link" onClick={() => { setModalContent(inventory && inventory.length ? <Bar data={{ labels: inventory.map(f=>f.foodName), datasets:[{data: inventory.map(f=>f.amount), backgroundColor:'rgba(153,102,255,0.6)'}] }} options={zoomOptions} /> : <p>No inventory</p>); setModalOpen(true); }} aria-label="Maximize inventory chart">Maximize</button>
              <button className="btn-link" onClick={() => exportPng(inventoryRef, 'inventory.png')} aria-label="Export inventory chart as PNG">PNG</button>
              <button className="btn-link" onClick={() => inventory && exportCsv(inventory.map(f=>f.foodName), inventory.map(f=>f.amount), 'inventory.csv')} aria-label="Export inventory data as CSV">CSV</button>
            </div>
          </div>
          <div className="chart-body small-chart" role="img" aria-label="Bar chart showing current inventory stock levels for all products">
            {inventory && inventory.length ? <Bar ref={inventoryRef} data={{ labels: inventory.map(f=>f.foodName), datasets:[{label: 'Stock', data: inventory.map(f=>f.amount), backgroundColor:'rgba(153,102,255,0.6)'}] }} options={{ maintainAspectRatio: false, ...zoomOptions }} /> : <p role="status">No inventory data</p>}
          </div>
        </div>
      </div>

      {modalOpen && (
        <ChartModal onClose={() => { setModalOpen(false); setModalContent(null); }}>
          <div style={{ width: '100%', height: '100%' }} role="dialog" aria-label="Maximized chart view">{modalContent}</div>
        </ChartModal>
      )}
    </div>
  );
};

export default AnalyticsOverview;