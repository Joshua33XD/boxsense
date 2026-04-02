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
import MotionChart from './dashboard/MotionChart';
import TimelineChart from './dashboard/TimelineChartV2';
import PeaksStrip from './dashboard/PeaksStrip';
import RawPanel from './dashboard/RawPanel';
import './dashboard/Dashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
  const motionBufRef = useRef([]);
  const socketRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cargo-theme', theme);
  }, [theme]);

  const fetchData = useCallback(async () => {
    try {
      const [liveResponse, peakEventsResponse, rawDataResponse, statusResponse, dropsResponse] =
        await Promise.all([
          fetch(`${API_BASE_URL}/api/live`),
          fetch(`${API_BASE_URL}/api/peak-events`),
          fetch(`${API_BASE_URL}/api/raw-data`),
          fetch(`${API_BASE_URL}/api/status`),
          fetch(`${API_BASE_URL}/api/drops`),
        ]);

      const liveDataData = liveResponse.ok ? await liveResponse.json() : {};
      const peakEventsData = peakEventsResponse.ok ? await peakEventsResponse.json() : [];
      const rawDataData = rawDataResponse.ok ? await rawDataResponse.json() : [];

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
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLiveData({});
      setPeakEvents([]);
      setRawData([]);
      setDrops([]);
      setEspConnected(false);
      setLastUpdate(new Date());
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling every 2s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // WebSocket
  useEffect(() => {
    const socket = io(API_BASE_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('esp_status', (payload) => {
      if (payload && typeof payload.connected === 'boolean') {
        setEspConnected(payload.connected);
      }
    });

    socket.on('live_data', (payload) => {
      if (payload && typeof payload === 'object') {
        setLiveData((prev) => ({ ...prev, ...payload }));
        setLastUpdate(new Date());
        if (payload.connected === true) setEspConnected(true);
      }
    });

    socket.on('peak_event', (event) => {
      if (event && typeof event === 'object') {
        setPeakEvents((prev) => [event, ...prev].slice(0, 1000));
      }
    });

    socket.on('peak_events_batch', (events) => {
      if (events && Array.isArray(events)) setPeakEvents(events);
    });

    socket.on('raw_data', (entry) => {
      if (entry && typeof entry === 'object') {
        setRawData((prev) => [...prev, entry].slice(-1000));
      }
    });

    socket.on('raw_data_batch', (entries) => {
      if (entries && Array.isArray(entries)) setRawData(entries);
    });

    socket.on('drop_event', (entry) => {
      if (entry && typeof entry === 'object') {
        setDrops((prev) => [entry, ...prev].slice(0, 1000));
      }
    });

    socket.on('drops_batch', (entries) => {
      if (entries && Array.isArray(entries)) setDrops(entries);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Motion series buffer
  useEffect(() => {
    const g = liveData?.g;
    if (g == null || g === '') return;
    const parsed = parseFloat(g);
    if (Number.isNaN(parsed)) return;
    const now = Date.now();
    const windowMs = 62000;
    motionBufRef.current = motionBufRef.current
      .filter((point) => now - point.t < windowMs)
      .concat([{ t: now, g: parsed, impact: parsed >= 2.8 ? parsed : null }]);
    setMotionSeries(motionBufRef.current.slice(-400));
  }, [liveData?.g]);

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
      <Sidebar activeId={activeNav} onNavigate={onNavigate} espConnected={espConnected} />
      <div className="dashboard-main-wrap">
        <TopBar
          espConnected={espConnected}
          lastUpdate={lastUpdate}
          theme={theme}
          loading={loading}
          onToggleTheme={toggleTheme}
          onRefresh={handleRefresh}
        />
        <main className="dashboard-content dashboard-content--scroll">
          {loading && peakEvents.length === 0 && rawData.length === 0 ? (
            <div className="cargo-loading" aria-live="polite">
              <span className="cargo-loading-box" aria-hidden>
                <span className="cargo-loading-panel cargo-loading-panel--top" />
                <span className="cargo-loading-panel cargo-loading-panel--left" />
                <span className="cargo-loading-panel cargo-loading-panel--right" />
              </span>
              <span className="cargo-loading-text">Loading peak values...</span>
            </div>
          ) : null}

          <div id="dash-overview" className="dashboard-grid">
            <SafetyCard liveData={liveData} peakEvents={peakEvents} espConnected={espConnected} />
            <OrientationCard liveData={liveData} />
            <EnvironmentCard liveData={liveData} />
          </div>

          <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
            <PeaksStrip peakEvents={peakEvents} />
          </div>

          <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
            <MotionChart series={motionSeries} />
          </div>

          <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
            <TimelineChart drops={drops} peakEvents={peakEvents} />
          </div>

          <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
            <RawPanel rawData={rawData} />
          </div>
        </main>
        <MobileBottomNav activeId={activeNav} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export default App;
