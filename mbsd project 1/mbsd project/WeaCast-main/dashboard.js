// Firebase config (your existing)

const firebaseConfig = {
  apiKey: "AIzaSyBGYw9AHqjASr32Coo_YgUx37zgX4HLBO4",
  authDomain: "temphumidity-69f02.firebaseapp.com",
  databaseURL: "https://temphumidity-69f02-default-rtdb.firebaseio.com",
  projectId: "temphumidity-69f02",
  storageBucket: "temphumidity-69f02.appspot.com",
  messagingSenderId: "536202714043",
  appId: "1:536202714043:web:b6d687405b643be695429e",
  measurementId: "G-YSN92XPCST"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// DOM elements
const liveTemp = document.getElementById("live-temp");
const liveHumidity = document.getElementById("live-humidity");
const liveTime = document.getElementById("live-time");
const ctx = document.getElementById('sensorChart').getContext('2d');
const statusMsg = document.getElementById('statusMsg');
const filterButtons = document.querySelectorAll('.filter-button');

let mode = 'live';
// Chart.js line chart
let sensorChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      {
        label: '🌡️ Temperature (°C)',
        borderColor: '#ff006e',
        backgroundColor: 'rgba(255, 0, 110, 0.3)',
        data: [],
        tension: 0.4,
        fill: true
      },
      {
        label: '💧 Humidity (%)',
        borderColor: '#00f5d4',
        backgroundColor: 'rgba(0, 245, 212, 0.3)',
        data: [],
        tension: 0.4,
        fill: true
      }
    ]
  },
  options: {
    scales: {
      x: {
        ticks: { color: '#ffffff' },
        grid: { color: '#444' }
      },
      y: {
        ticks: { color: '#ffffff' },
        grid: { color: '#444' }
      }
    },
    plugins: {
      legend: {
        labels: { color: '#ffffff' }
      }
    }
  }
});
const maxDataPoints = 20;

// Utility to safely add live chart points
function addChartData(label, temp, humidity) {
  if (sensorChart.data.labels.length >= maxDataPoints) {
    sensorChart.data.labels.shift();
    sensorChart.data.datasets[0].data.shift();
    sensorChart.data.datasets[1].data.shift();
  }
  sensorChart.data.labels.push(label);
  sensorChart.data.datasets[0].data.push(temp);
  sensorChart.data.datasets[1].data.push(humidity);
  sensorChart.update();
}

// Gauges
function createGauge(ctx, colorStart, colorEnd) {
  // Create the gradient
  let gradient = ctx.createLinearGradient(0, 0, 0, 150);
  gradient.addColorStop(0, colorStart); // Start color
  gradient.addColorStop(1, colorEnd);   // End color

  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [0, 100],
        backgroundColor: [gradient, "#1f1f1f"], // Use gradient as background color
        borderWidth: 0
      }]
    },
    options: {
      rotation: -90,
      circumference: 180,
      cutout: '75%',
      plugins: {
        tooltip: { enabled: false },
        legend: { display: false }
      }
    }
  });
}


// For Temperature Gauge (Warm Gradient)
const tempGauge = createGauge(
  document.getElementById('tempGauge').getContext('2d'),
  'rgba(255, 0, 110, 0.8)', // Start color (pink)
  'rgba(255, 125, 125, 0.8)' // End color (light red)
);

// For Humidity Gauge (Cool Gradient)
const humidityGauge = createGauge(
  document.getElementById('humidityGauge').getContext('2d'),
  'rgba(0, 245, 212, 0.8)', // Start color (teal)
  'rgba(0, 123, 255, 0.8)' // End color (light blue)
);

function updateGauge(chart, value) {
  chart.data.datasets[0].data[0] = value;
  chart.data.datasets[0].data[1] = 100 - value;
  chart.update();
}

// Status update
let lastUpdate = Date.now();
function updateStatus() {
  const now = Date.now();
  const seconds = Math.floor((now - lastUpdate) / 1000);
  if (seconds < 10) {
    statusMsg.innerHTML = `🟢 <strong style="color:#4caf50">Live</strong> – updated ${seconds}s ago`;
  } else if (seconds < 30) {
    statusMsg.innerHTML = `🟡 <strong style="color:#ffc107">Delayed</strong> – ${seconds}s ago`;
  } else {
    statusMsg.innerHTML = `🔴 <strong style="color:#f44336">Offline</strong> – last update ${seconds}s ago`;
  }
}

// Toast message
function showToast(message, type = 'warning', soundFile = null) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.cssText = `
    padding: 12px 20px;
    margin: 10px 0;
    background: linear-gradient(135deg, #333, #444);
    color: white;
    border-left: 5px solid ${type === 'danger' ? '#ff4d4d' : type === 'warning' ? '#ffc107' : '#4caf50'};
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 8px;
  `;

  const icon = document.createElement('div');
  icon.innerHTML = type === 'danger' ? '🔥' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : '🔔';
  icon.style.marginRight = '10px';

  const msg = document.createElement('span');
  msg.textContent = message;
  msg.style.flex = '1';

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = `background: transparent; color: white; font-size: 16px; border: none; cursor: pointer;`;
  closeBtn.onclick = () => toast.remove();

  toast.appendChild(icon);
  toast.appendChild(msg);
  toast.appendChild(closeBtn);
  document.getElementById('toastContainer').appendChild(toast);

  if (soundFile) new Audio(soundFile).play();
  setTimeout(() => toast.remove(), 6000);
}

// Load live dashboard
function loadDashboardData() {
  const sensorRef = db.ref('/sensor_history');
  sensorRef.limitToLast(1).on('value', snapshot => {
    if (mode !== 'live') return;

    const data = snapshot.val();
    if (!data) return;
    const last = Object.values(data)[0];
    const temp = parseFloat(last.temperature) || 0;
    const hum = parseFloat(last.humidity) || 0;

    liveTemp.textContent = temp;
    liveHumidity.textContent = hum;
    // Convert timestamp (seconds) to milliseconds
const date = new Date(last.timestamp * 1000);

// Format in Pakistan time
const pakistanTime = date.toLocaleTimeString('en-GB', {
  timeZone: 'Asia/Karachi',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false // use true if you want AM/PM
});

// Show it
liveTime.textContent = pakistanTime;

    lastUpdate = Date.now();

    if (temp > 40) {
      showToast(
        `High Temperature Alert: ${temp}°C`,
        'danger',
        './sounds/700-hz-beeps-86815.mp3'
      );
    }
    
    if (hum > 80) {
      showToast(
        `💧 High Humidity Alert: ${hum}%`,
        'warning',
        './sounds/chime-alert-demo-309545.mp3'
      );
    }

    addChartData(
      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit',hour12: true,
    timeZone: 'Asia/Karachi' }),
      temp,
      hum
    );

    updateGauge(tempGauge, Math.min(temp, 100));
    updateGauge(humidityGauge, Math.min(hum, 100));
    updateStatus();
    document.getElementById("chartWrapper").classList.remove("hidden");
  });
}

function getTimeRangeSeconds(range) {
  const now = Math.floor(Date.now() / 1000);
  switch (range) {
    case 'live': return now - 60 * 5;
    case '6h': return now - 60 * 60 * 6;
    case '12h': return now - 60 * 60 * 12;
    case '18h': return now - 60 * 60 * 18;
    case '1d': return now - 60 * 60 * 24;
    case '1m': return now - 60 * 60 * 24 * 30;
    default: return now - 60 * 5;
  }
}

function fetchHistoricalData(range) {
  const startTime = getTimeRangeSeconds(range);
  const endTime = Math.floor(Date.now() / 1000); 
  console.log(`Fetching data for range: ${range}, Start Time: ${startTime}, End Time: ${endTime}`); 
  db.ref("/sensor_history").orderByChild("timestamp").startAt(startTime).endAt(endTime).once("value", snapshot => {
    const data = snapshot.val();
console.log("Fetched historical data:", data);

    if (!data) {
      showToast("No data available for this time range.", 'warning');
     
      sensorChart.data.labels = [];
      sensorChart.data.datasets[0].data = [];
      sensorChart.data.datasets[1].data = [];
      sensorChart.update();
      document.getElementById("chartWrapper").classList.add("hidden");
      return;
    }

    const labels = [];
    const temps = [];
    const hums = [];

    Object.entries(data).forEach(([key, entry]) => {
      const time = new Date(entry.timestamp * 1000).toLocaleTimeString(); 
      labels.push(time);
      temps.push(entry.temperature);
      hums.push(entry.humidity);
    });

    sensorChart.data.labels = labels;
    sensorChart.data.datasets[0].data = temps;
    sensorChart.data.datasets[1].data = hums;
    sensorChart.update();
    console.log('Labels:', labels);
    console.log('Temperatures:', temps);
    console.log('Humidities:', hums);
    document.getElementById("chartWrapper").classList.remove("hidden");
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const buttonContainer = document.querySelector('#buttonContainer'); // Target the button container
  console.log('Button container:', buttonContainer);

  if (!buttonContainer) {
    console.error('Error: #buttonContainer not found in the DOM!');
    return;
  }

  console.log('Filter Buttons Initialized');

  buttonContainer.addEventListener('click', (event) => {
  
    const button = event.target.closest('.filter-button'); // Check if a filter button was clicked
    console.log('Closest filter button:', button); // Log the closest filter button
    const range = button.getAttribute('data-range');
    console.log(`Filter clicked: ${range}`);
    if (range === 'live') {
      mode = 'live';
      document.getElementById("chartWrapper").classList.remove("hidden");

      sensorChart.data.labels = [];
      sensorChart.data.datasets[0].data = [];
      sensorChart.data.datasets[1].data = [];
      sensorChart.update();
    } else {
      mode = 'history';
      fetchHistoricalData(range);
    }

    // Highlight active button
    document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('bg-purple-700'));
    button.classList.add('bg-purple-700');
  });
});

// Start
setInterval(updateStatus, 1000);
loadDashboardData();
