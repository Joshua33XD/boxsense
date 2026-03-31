import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import './App.css';

import { SECTION_SCROLL } from './dashboard/navConfig';
import Sidebar from './dashboard/Sidebar';
import MobileBottomNav from './dashboard/MobileBottomNav';
import TopBar from './dashboard/TopBar';
import SafetyCard from './dashboard/SafetyCard';
import OrientationCard from './dashboard/OrientationCard';
import EnvironmentCard from './dashboard/EnvironmentCard';
import EmailOtpCard from './dashboard/EmailOtpCard';
import MotionChart from './dashboard/MotionChart';
import TimelineChart from './dashboard/TimelineChart';
import PeaksStrip from './dashboard/PeaksStrip';
import RawPanel from './dashboard/RawPanel';
import './dashboard/Dashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const OTP_STORAGE_KEY = 'boxesense_email_otp';
const DEBUG_ENDPOINT =
  'http://127.0.0.1:7274/ingest/45028dbe-909d-4ab6-8d54-6aacd37e93f8';
const DEBUG_SESSION_ID = '601a3e';
const DEBUG_RUN_ID = 'run_before';

function debugLog(hypothesisId, location, message, data) {
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': DEBUG_SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      runId: DEBUG_RUN_ID,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}

function hasVerifiedOtpSession() {
  try {
    const raw = sessionStorage.getItem(OTP_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!(parsed?.orderId || parsed?.email);
  } catch {
    return false;
  }
}

const DEMO_LIVE_DATA = {
  connected: true,
  g: '3.42',
  height: '0.5',
  roll: '14.8',
  pitch: '-8.6',
  yaw: '27.4',
  temp: '28.4',
  humidity: '61.2',
  ldr: '73',
};

const DEMO_PEAK_EVENTS = [
  { parameter: 'G-Force', value: 4.8, timestamp: '2026-03-29 20:14:08' },
  { parameter: 'Temperature', value: 31.2, timestamp: '2026-03-29 20:10:44' },
  { parameter: 'Humidity', value: 68.4, timestamp: '2026-03-29 20:09:57' },
  { parameter: 'LDR', value: 82.0, timestamp: '2026-03-29 20:08:33' },
  { parameter: 'FLEX', value: 46.5, timestamp: '2026-03-29 20:06:11' },
  { parameter: 'Height', value: 1.7, timestamp: '2026-03-29 20:04:52' },
  { parameter: 'G-Force', value: 3.6, timestamp: '2026-03-29 20:02:25' },
];

const DEMO_RAW_DATA = [
  { timestamp: '20:14:08', data: 'G=4.80g, TEMP=28.4C, HUM=61.2%, LDR=73%, FLEX=39%' },
  { timestamp: '20:13:54', data: 'G=3.42g, ROLL=14.8, PITCH=-8.6, YAW=27.4' },
  { timestamp: '20:13:41', data: 'G=2.18g, TEMP=28.2C, HUM=60.9%, LDR=71%, FLEX=35%' },
  { timestamp: '20:13:28', data: 'G=1.44g, TEMP=28.1C, HUM=60.6%, LDR=70%, FLEX=33%' },
  { timestamp: '20:13:15', data: 'G=0.98g, TEMP=28.0C, HUM=60.4%, LDR=69%, FLEX=31%' },
];

const DEMO_DROPS = [
  { pc_time: '20:14:08', peak_g: '4.8', ldr: '73', flex: '39' },
  { pc_time: '20:11:42', peak_g: '3.9', ldr: '71', flex: '36' },
  { pc_time: '20:08:12', peak_g: '2.8', ldr: '68', flex: '29' },
  { pc_time: '20:05:46', peak_g: '3.3', ldr: '74', flex: '35' },
  { pc_time: '20:02:18', peak_g: '4.2', ldr: '77', flex: '41' },
  { pc_time: '19:58:39', peak_g: '2.6', ldr: '64', flex: '27' },
];

function buildDemoMotionSeries() {
  const now = Date.now();
  const values = [
    0.62, 0.84, 1.08, 0.93, 1.24, 1.46, 1.18, 1.52, 1.74, 1.38,
    1.12, 1.28, 1.66, 2.04, 1.82, 1.36, 1.18, 1.42, 2.12, 2.86,
    3.42, 2.34, 1.96, 1.28, 1.08, 0.94, 1.16, 1.34, 1.22, 1.04,
  ];

  return values.map((g, index) => ({
    t: now - (values.length - index - 1) * 2000,
    g,
    impact: g >= 2.8 ? g : null,
  }));
}

function App() {
  const [liveData, setLiveData] = useState({});
  const [peakEvents, setPeakEvents] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [drops, setDrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [espConnected, setEspConnected] = useState(false);
  const [activeNav, setActiveNav] = useState('overview');
  const [theme, setTheme] = useState(
    () => localStorage.getItem('cargo-theme') || 'dark',
  );
  const [motionSeries, setMotionSeries] = useState([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [otpVerified, setOtpVerified] = useState(() => hasVerifiedOtpSession());
  const motionBufRef = useRef([]);
  const socketRef = useRef(null);
  


  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cargo-theme', theme);
  }, [theme]);

  const loadDemoData = useCallback(() => {
    // #region agent log
    debugLog('H8', 'src/App.js:loadDemoData', 'Loading demo data', {});
    // #endregion
    const demoMotion = buildDemoMotionSeries();
    motionBufRef.current = demoMotion;
    setLiveData(DEMO_LIVE_DATA);
    setPeakEvents(DEMO_PEAK_EVENTS);
    setRawData(DEMO_RAW_DATA);
    setDrops(DEMO_DROPS);
    setMotionSeries(demoMotion);
    setEspConnected(true);
    setIsDemoMode(true);
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      debugLog('H14', 'src/App.js:fetchData', 'fetchData start', {
        API_BASE_URL,
      });
      const [liveResponse, peakEventsResponse, rawDataResponse, statusResponse, dropsResponse] =
        await Promise.all([
          fetch(`${API_BASE_URL}/api/live`),
          fetch(`${API_BASE_URL}/api/peak-events`),
          fetch(`${API_BASE_URL}/api/raw-data`),
          fetch(`${API_BASE_URL}/api/status`),
          fetch(`${API_BASE_URL}/api/drops`),
        ]);

      if (
        !liveResponse.ok ||
        !peakEventsResponse.ok ||
        !rawDataResponse.ok ||
        !statusResponse.ok
      ) {
        throw new Error('Dashboard API is unavailable');
      }

      const liveDataData = await liveResponse.json();
      const peakEventsData = await peakEventsResponse.json();
      const rawDataData = await rawDataResponse.json();
      let dropsData = [];
      try {
        dropsData = dropsResponse.ok ? await dropsResponse.json() : [];
      } catch {
        dropsData = [];
      }
      if (!Array.isArray(dropsData)) dropsData = [];

      try {
        const statusData = statusResponse.ok ? await statusResponse.json() : {};
        if (typeof statusData.connected === 'boolean') {
          setEspConnected(statusData.connected);
        }
      } catch {
        /* ignore */
      }

      if (liveDataData && typeof liveDataData === 'object') {
        setLiveData(liveDataData);
        if (typeof liveDataData.connected === 'boolean') {
          setEspConnected(liveDataData.connected);
        }
      } else {
        setLiveData({});
      }

      setPeakEvents(Array.isArray(peakEventsData) ? peakEventsData : []);
      setRawData(Array.isArray(rawDataData) ? rawDataData : []);
      setDrops(dropsData);
      setIsDemoMode(false);

      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      // #region agent log
      debugLog('H9', 'src/App.js:fetchData', 'Dashboard fetch failed, fallback demo', {
        errorName: error?.name,
        errorMsg: error?.message,
      });
      // #endregion
      console.error('Error fetching data:', error);
      loadDemoData();
    }
  }, [loadDemoData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const socket = io(API_BASE_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    // #region agent log
    socket.on('connect_error', (err) => {
      debugLog('H10', 'src/App.js:socket', 'Socket connect_error', {
        errName: err?.name,
        errMessage: err?.message,
      });
    });
    // #endregion

    socket.on('esp_status', (payload) => {
      if (payload && typeof payload.connected === 'boolean') {
        setEspConnected(payload.connected);
        setIsDemoMode(false);
      }
    });

    socket.on('live_data', (payload) => {
      if (payload && typeof payload === 'object') {
        setLiveData((prev) => ({ ...prev, ...payload }));
        setLastUpdate(new Date());
        if (payload.connected === true) setEspConnected(true);
        setIsDemoMode(false);
      }
    });

    socket.on('peak_event', (event) => {
      if (event && typeof event === 'object') {
        setPeakEvents((prev) => [event, ...prev].slice(0, 1000));
        setIsDemoMode(false);
      }
    });

    socket.on('peak_events_batch', (events) => {
      if (events && Array.isArray(events)) {
        setPeakEvents(events);
        setIsDemoMode(false);
      }
    });

    socket.on('raw_data', (entry) => {
      if (entry && typeof entry === 'object') {
        setRawData((prev) => [...prev, entry].slice(-1000));
        setIsDemoMode(false);
      }
    });

    socket.on('raw_data_batch', (entries) => {
      if (entries && Array.isArray(entries)) {
        setRawData(entries);
        setIsDemoMode(false);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const g = liveData?.g;
    if (g == null || g === '') return;
    const parsed = parseFloat(g);
    if (Number.isNaN(parsed)) return;
    const now = Date.now();
    const windowMs = 62000;
    motionBufRef.current = motionBufRef.current
      .filter((point) => now - point.t < windowMs)
      .concat([
        {
          t: now,
          g: parsed,
          impact: parsed >= 2.8 ? parsed : null,
        },
      ]);
    setMotionSeries(motionBufRef.current.slice(-400));
  }, [liveData?.g]);

  useEffect(() => {
    if (!isDemoMode) return undefined;
    let high = false;
    const id = setInterval(() => {
      high = !high;
      setLiveData((prev) => ({
        ...prev,
        height: high ? '1.8' : '0.5',
      }));
    }, 5000);
    return () => clearInterval(id);
  }, [isDemoMode]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onNavigate = useCallback((id) => {
    setActiveNav(id);
    const elId = SECTION_SCROLL[id];
    if (elId) {
      document.getElementById(elId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <div className="dashboard-root">
      <Sidebar
        activeId={activeNav}
        onNavigate={onNavigate}
        espConnected={espConnected || isDemoMode}
      />
      <div className="dashboard-main-wrap">
        <TopBar
          espConnected={espConnected || isDemoMode}
          lastUpdate={lastUpdate}
          theme={theme}
          loading={loading}
          onToggleTheme={toggleTheme}
          onRefresh={handleRefresh}
        />
        <main className="dashboard-content dashboard-content--scroll">
          {loading && peakEvents.length === 0 && rawData.length === 0 ? (
            <div className="cargo-loading">Loading peak values...</div>
          ) : null}

          {!otpVerified ? (
            <div id="dash-overview" className="dashboard-grid">
              <EmailOtpCard onVerifiedChange={setOtpVerified} />
            </div>
          ) : (
            <>
              <div id="dash-overview" className="dashboard-grid">
                <SafetyCard
                  liveData={liveData}
                  peakEvents={peakEvents}
                  espConnected={espConnected || isDemoMode}
                />
                <OrientationCard liveData={liveData} />
                <EnvironmentCard liveData={liveData} />
                <EmailOtpCard onVerifiedChange={setOtpVerified} />
              </div>

              <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
                <PeaksStrip peakEvents={peakEvents} />
              </div>

              <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
                <MotionChart series={motionSeries} />
              </div>

              <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
                <TimelineChart drops={drops} />
              </div>

              <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
                <RawPanel rawData={rawData} />
              </div>
            </>
          )}
        </main>
        <MobileBottomNav activeId={activeNav} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export default App;
