import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getAnalyticsOverview, getOrdersPerDay, getTopProducts, getPreferencesDistribution, getEngagement, getAllFoods, getAnalyticsSnapshot, getRecommendationRatingsAnalytics } from '../services/api';
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
  const [recommendationRatings, setRecommendationRatings] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [daysWindow, setDaysWindow] = useState(30);
  const [zoomEnabled, setZoomEnabled] = useState(false);
  const ordersRef = React.useRef();
  const topRef = React.useRef();
  const costRef = React.useRef();
  const customersRef = React.useRef();
  const inventoryRef = React.useRef();
  const topRatedFoodsRef = React.useRef();
  const ratingDistributionRef = React.useRef();
  const lowestRatedFoodsRef = React.useRef();
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

        // Fetch recommendation ratings separately (it doesn't depend on daysWindow)
        let recRatings = null;
        try {
          recRatings = await getRecommendationRatingsAnalytics();
          console.log('Recommendation Ratings Data:', recRatings);
        } catch (e) {
          console.warn('Recommendation ratings analytics not available:', e);
        }

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
        // recommendation ratings
        setRecommendationRatings(recRatings);
      } catch (error) {
        console.error('Error loading analytics:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  if (loading) return <div className="analytics-container"><div className="loading">Loading analytics...</div></div>;
  if (!overview) return <div className="analytics-container">No analytics available.</div>;

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
    datasets: [{ data: Object.values(preferences.costPreference || {}), backgroundColor: ['#4dc9f6', '#f67019', '#f53794', '#537bc4', '#acc236'] }]
  } : null;

  // For dietary/allergen chart: prefer per-allergen counts coming from snapshot (allergenCounts)
  const dietPrefData = (() => {
    const source = (allergenCounts && Object.keys(allergenCounts).length) ? allergenCounts : (preferences ? preferences.dietaryRestrictions : {});
    const labels = Object.keys(source || {});
    const data = Object.values(source || {});
    return labels.length ? { labels, datasets: [{ data, backgroundColor: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3'] }] } : null;
  })();

  const topCustomersData = engagement ? {
    labels: Object.keys(engagement.topCustomers || {}),
    datasets: [{ label: 'Orders', data: Object.values(engagement.topCustomers || {}), backgroundColor: 'rgba(75,192,192,0.6)' }]
  } : null;

  // Recommendation ratings charts
  const topRatedFoodsData = recommendationRatings && recommendationRatings.topRatedFoods ? {
    labels: Object.keys(recommendationRatings.topRatedFoods || {}),
    datasets: [{
      label: 'Average Rating',
      data: Object.values(recommendationRatings.topRatedFoods || {}),
      backgroundColor: 'rgba(75, 192, 75, 0.6)',
      borderColor: 'rgba(75, 192, 75, 1)',
      borderWidth: 1
    }]
  } : null;

  const ratingDistributionData = recommendationRatings && recommendationRatings.ratingDistribution ? {
    labels: Object.keys(recommendationRatings.ratingDistribution || {}).map(k => `${k}★`),
    datasets: [{
      data: Object.values(recommendationRatings.ratingDistribution || {}),
      backgroundColor: ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#5f27cd']
    }]
  } : null;

  const lowestRatedFoodsData = recommendationRatings && recommendationRatings.lowestRatedFoods ? {
    labels: Object.keys(recommendationRatings.lowestRatedFoods || {}),
    datasets: [{
      label: 'Average Rating',
      data: Object.values(recommendationRatings.lowestRatedFoods || {}),
      backgroundColor: 'rgba(255, 99, 99, 0.6)',
      borderColor: 'rgba(255, 99, 99, 1)',
      borderWidth: 1
    }]
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
      const fileName = `analytics-${new Date().toISOString().slice(0, 10)}.pdf`;
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
        const rows = [['date', 'orders']].concat(ordersSeries.labels.map((l, i) => [l, ordersSeries.data[i]]));
        zip.file('orders_per_day.csv', rows.map(r => r.join(',')).join('\n'));
      }
      // Top products
      if (topProducts) {
        const rows = [['product', 'count']].concat(Object.entries(topProducts).map(([k, v]) => [k, v]));
        zip.file('top_products.csv', rows.map(r => '"' + r.join('","') + '"').join('\n'));
      }
      // Cost preference
      if (preferences && preferences.costPreference) {
        const rows = [['costPreference', 'count']].concat(Object.entries(preferences.costPreference));
        zip.file('cost_preferences.csv', rows.map(r => r.join(',')).join('\n'));
      }
      // Dietary restrictions / allergen counts: prefer tokenized allergenCounts if available
      const allergenSource = (allergenCounts && Object.keys(allergenCounts).length) ? allergenCounts : (preferences && preferences.dietaryRestrictions ? preferences.dietaryRestrictions : null);
      if (allergenSource) {
        const rows = [['allergenOrRestriction', 'count']].concat(Object.entries(allergenSource));
        zip.file('dietary_restrictions_or_allergens.csv', rows.map(r => r.join(',')).join('\n'));
      }
      // Top customers
      if (engagement && engagement.topCustomers) {
        const rows = [['customer', 'orders']].concat(Object.entries(engagement.topCustomers));
        zip.file('top_customers.csv', rows.map(r => r.join(',')).join('\n'));
      }
      // Inventory
      if (inventory && inventory.length) {
        const rows = [['foodName', 'amount', 'price']].concat(inventory.map(f => [f.foodName, f.amount, f.price || '']));
        zip.file('inventory.csv', rows.map(r => r.join(',')).join('\n'));
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-csv-${new Date().toISOString().slice(0, 10)}.zip`;
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
      a.download = `analytics-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Snapshot download failed', e);
      alert('Failed to download snapshot. Check console for details.');
    }
  };

  return (
    <div className="analytics-container">
      <div className="dashboard-header">
        <h1>📈 Analytics & Insights</h1>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Orders</h3>
          <p className="stat-number">{overview.totalOrders}</p>
        </div>
        <div className="stat-card">
          <h3>Fulfilled Orders</h3>
          <p className="stat-number">{overview.fulfilledOrders}</p>
        </div>
        <div className="stat-card">
          <h3>Unfulfilled Orders</h3>
          <p className="stat-number">{overview.unfulfilledOrders}</p>
        </div>
        <div className="stat-card">
          <h3>Total Revenue</h3>
          <p className="stat-number">${overview.totalRevenue}</p>
        </div>
        <div className="stat-card">
          <h3>Avg Order Value</h3>
          <p className="stat-number">${overview.avgOrderValue.toFixed(2)}</p>
        </div>
        {recommendationRatings && (
          <>
            <div className="stat-card">
              <h3>⭐ Avg Rating</h3>
              <p className="stat-number">{recommendationRatings.overallAverageRating}/5.0</p>
            </div>
            <div className="stat-card">
              <h3>📝 Total Reviews</h3>
              <p className="stat-number">{recommendationRatings.totalFeedbackCount}</p>
            </div>
          </>
        )}
      </div>
      <div style={{ maxWidth: 1200, margin: '8px auto' }}>
        <div className="stat-card" style={{ padding: 12 }}>
          <h4>Anomalies</h4>
          {anomalies && anomalies.length > 0 ? (
            <div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {anomalies.map((a) => (
                  <li key={a.date}><strong>{a.date}</strong>: {a.count} ({a.type}, z={Number(a.zScore).toFixed(2)})</li>
                ))}
              </ul>
            </div>
          ) : (
            <div style={{ color: '#666' }}>No anomalies detected in selected window.</div>
          )}
        </div>
      </div>

      <div className="analytics-controls" style={{ maxWidth: 1200, margin: '10px auto' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>Window:</span>
          {[7, 30, 90, 365].map(d => (
            <button key={d} className={`nav-button ${daysWindow === d ? 'active' : ''}`} onClick={() => { setDaysWindow(d); setLoading(true); /** refetch */ window.requestAnimationFrame(() => { window.location.reload(); }) }}>
              {d}d
            </button>
          ))}
          <label style={{ marginLeft: 12 }}>
            <input type="checkbox" checked={zoomEnabled} onChange={(e) => setZoomEnabled(e.target.checked)} /> Enable zoom
          </label>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="nav-button" onClick={downloadSnapshot} style={{ marginLeft: 8 }}>Download snapshot (JSON)</button>
          <button className="nav-button" onClick={downloadPdfAllCharts} style={{ marginLeft: 8 }}>Download snapshot (PDF)</button>
          <button className="nav-button" onClick={downloadCsvBundle} style={{ marginLeft: 8 }}>Download CSV bundle (ZIP)</button>
        </div>
      </div>

      <div className="analytics-charts">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Orders (last {daysWindow} days)</h3>
            <div className="chart-toolbar">
              <button className="btn-link" onClick={() => { setModalContent(<Line data={ordersData} options={zoomOptions} />); setModalOpen(true); }}>Maximize</button>
              <button className="btn-link" onClick={() => exportPng(ordersRef, 'orders.png')}>PNG</button>
              <button className="btn-link" onClick={() => exportCsv(ordersSeries.labels, ordersSeries.data, 'orders.csv')}>CSV</button>
            </div>
          </div>
          <div className="chart-body small-chart">
            <Line ref={ordersRef} data={ordersData} options={{ maintainAspectRatio: false, ...zoomOptions }} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Top Products</h3>
            <div className="chart-toolbar">
              <button className="btn-link" onClick={() => { setModalContent(<Bar data={topProductsData} options={zoomOptions} />); setModalOpen(true); }}>Maximize</button>
              <button className="btn-link" onClick={() => exportPng(topRef, 'top-products.png')}>PNG</button>
              <button className="btn-link" onClick={() => exportCsv(Object.keys(topProductsData.labels || topProducts || {}), Object.values(topProducts || {}), 'top-products.csv')}>CSV</button>
            </div>
          </div>
          <div className="chart-body small-chart">
            <Bar ref={topRef} data={topProductsData} options={{ maintainAspectRatio: false, ...zoomOptions }} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Customer Cost Preferences</h3>
            <div className="chart-toolbar">
              <button className="btn-link" onClick={() => { setModalContent(costPrefData ? <Pie data={costPrefData} options={zoomOptions} /> : <p>No preference data</p>); setModalOpen(true); }}>Maximize</button>
              <button className="btn-link" onClick={() => exportPng(costRef, 'cost-pref.png')}>PNG</button>
              <button className="btn-link" onClick={() => costPrefData && exportCsv(Object.keys(costPrefData.labels || {}), Object.values(costPrefData.datasets[0].data || []), 'cost-preferences.csv')}>CSV</button>
            </div>
          </div>
          <div className="chart-body small-chart">
            {costPrefData ? <Pie ref={costRef} data={costPrefData} options={{ maintainAspectRatio: false, ...zoomOptions }} /> : <p>No preference data</p>}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Dietary Restrictions / Allergies (users)</h3>
            <div className="chart-toolbar">
              <button className="btn-link" onClick={() => { setModalContent(dietPrefData ? <Pie data={dietPrefData} options={zoomOptions} /> : <p>No data</p>); setModalOpen(true); }}>Maximize</button>
              <button className="btn-link" onClick={() => exportPng(costRef, 'diet-pref.png')}>PNG</button>
              <button className="btn-link" onClick={() => dietPrefData && exportCsv(Object.keys(dietPrefData.labels || {}), Object.values(dietPrefData.datasets[0].data || []), 'diet-preferences.csv')}>CSV</button>
            </div>
          </div>
          <div className="chart-body small-chart">
            {dietPrefData ? <Pie data={dietPrefData} options={{ maintainAspectRatio: false, ...zoomOptions }} /> : <p>No diet preference data</p>}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Top Customers (last {daysWindow} days)</h3>
            <div className="chart-toolbar">
              <button className="btn-link" onClick={() => { setModalContent(topCustomersData ? <Bar data={topCustomersData} options={zoomOptions} /> : <p>No engagement data</p>); setModalOpen(true); }}>Maximize</button>
              <button className="btn-link" onClick={() => exportPng(customersRef, 'top-customers.png')}>PNG</button>
              <button className="btn-link" onClick={() => topCustomersData && exportCsv(Object.keys(topCustomersData.labels || {}), Object.values(topCustomersData.datasets[0].data || []), 'top-customers.csv')}>CSV</button>
            </div>
          </div>
          <div className="chart-body small-chart">
            {topCustomersData ? <Bar ref={customersRef} data={topCustomersData} options={{ maintainAspectRatio: false, ...zoomOptions }} /> : <p>No engagement data</p>}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Inventory Levels</h3>
            <div className="chart-toolbar">
              <button className="btn-link" onClick={() => { setModalContent(inventory && inventory.length ? <Bar data={{ labels: inventory.map(f => f.foodName), datasets: [{ data: inventory.map(f => f.amount), backgroundColor: 'rgba(153,102,255,0.6)' }] }} options={zoomOptions} /> : <p>No inventory</p>); setModalOpen(true); }}>Maximize</button>
              <button className="btn-link" onClick={() => exportPng(inventoryRef, 'inventory.png')}>PNG</button>
              <button className="btn-link" onClick={() => inventory && exportCsv(inventory.map(f => f.foodName), inventory.map(f => f.amount), 'inventory.csv')}>CSV</button>
            </div>
          </div>
          <div className="chart-body small-chart">
            {inventory && inventory.length ? <Bar ref={inventoryRef} data={{ labels: inventory.map(f => f.foodName), datasets: [{ label: 'Stock', data: inventory.map(f => f.amount), backgroundColor: 'rgba(153,102,255,0.6)' }] }} options={{ maintainAspectRatio: false, ...zoomOptions }} /> : <p>No inventory data</p>}
          </div>
        </div>

        {recommendationRatings && (
          <>
            <div className="chart-card">
              <div className="chart-header">
                <h3>⭐ Top Rated Foods</h3>
                <div className="chart-toolbar">
                  <button className="btn-link" onClick={() => { setModalContent(topRatedFoodsData ? <Bar data={topRatedFoodsData} options={zoomOptions} /> : <p>No data</p>); setModalOpen(true); }}>Maximize</button>
                  <button className="btn-link" onClick={() => exportPng(topRatedFoodsRef, 'top-rated-foods.png')}>PNG</button>
                  <button className="btn-link" onClick={() => topRatedFoodsData && exportCsv(topRatedFoodsData.labels, topRatedFoodsData.datasets[0].data, 'top-rated-foods.csv')}>CSV</button>
                </div>
              </div>
              <div className="chart-body small-chart">
                {topRatedFoodsData ? <Bar ref={topRatedFoodsRef} data={topRatedFoodsData} options={{ maintainAspectRatio: false, indexAxis: 'y', ...zoomOptions }} /> : <p>No rating data</p>}
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h3>📊 Rating Distribution</h3>
                <div className="chart-toolbar">
                  <button className="btn-link" onClick={() => { setModalContent(ratingDistributionData ? <Pie data={ratingDistributionData} options={zoomOptions} /> : <p>No data</p>); setModalOpen(true); }}>Maximize</button>
                  <button className="btn-link" onClick={() => exportPng(ratingDistributionRef, 'rating-distribution.png')}>PNG</button>
                  <button className="btn-link" onClick={() => ratingDistributionData && exportCsv(ratingDistributionData.labels, ratingDistributionData.datasets[0].data, 'rating-distribution.csv')}>CSV</button>
                </div>
              </div>
              <div className="chart-body small-chart">
                {ratingDistributionData ? <Pie ref={ratingDistributionRef} data={ratingDistributionData} options={{ maintainAspectRatio: false, ...zoomOptions }} /> : <p>No distribution data</p>}
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h3>⚠️ Lowest Rated Foods</h3>
                <div className="chart-toolbar">
                  <button className="btn-link" onClick={() => { setModalContent(lowestRatedFoodsData ? <Bar data={lowestRatedFoodsData} options={zoomOptions} /> : <p>No data</p>); setModalOpen(true); }}>Maximize</button>
                  <button className="btn-link" onClick={() => exportPng(lowestRatedFoodsRef, 'lowest-rated-foods.png')}>PNG</button>
                  <button className="btn-link" onClick={() => lowestRatedFoodsData && exportCsv(lowestRatedFoodsData.labels, lowestRatedFoodsData.datasets[0].data, 'lowest-rated-foods.csv')}>CSV</button>
                </div>
              </div>
              <div className="chart-body small-chart">
                {lowestRatedFoodsData ? <Bar ref={lowestRatedFoodsRef} data={lowestRatedFoodsData} options={{ maintainAspectRatio: false, indexAxis: 'y', ...zoomOptions }} /> : <p>No rating data</p>}
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h3>📈 Feedback Count per Food</h3>
                <div className="chart-toolbar">
                  <button className="btn-link" onClick={() => { setModalContent(recommendationRatings.feedbackCountPerFood ? <Bar data={{ labels: Object.keys(recommendationRatings.feedbackCountPerFood || {}), datasets: [{ data: Object.values(recommendationRatings.feedbackCountPerFood || {}), backgroundColor: 'rgba(100,200,200,0.6)' }] }} options={zoomOptions} /> : <p>No data</p>); setModalOpen(true); }}>Maximize</button>
                  <button className="btn-link" onClick={() => exportCsv(Object.keys(recommendationRatings.feedbackCountPerFood || {}), Object.values(recommendationRatings.feedbackCountPerFood || {}), 'feedback-count.csv')}>CSV</button>
                </div>
              </div>
              <div className="chart-body small-chart">
                {recommendationRatings.feedbackCountPerFood ? <Bar data={{ labels: Object.keys(recommendationRatings.feedbackCountPerFood || {}), datasets: [{ label: 'Reviews', data: Object.values(recommendationRatings.feedbackCountPerFood || {}), backgroundColor: 'rgba(100,200,200,0.6)' }] }} options={{ maintainAspectRatio: false, indexAxis: 'y', ...zoomOptions }} /> : <p>No feedback count data</p>}
              </div>
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <ChartModal onClose={() => { setModalOpen(false); setModalContent(null); }}>
          <div style={{ width: '100%', height: '100%' }}>{modalContent}</div>
        </ChartModal>
      )}
    </div>
  );
};

export default AnalyticsOverview;
