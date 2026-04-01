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

const API_BASE_URL = process.env.REACT_APP_API_URL || '';
const DEBUG_ENDPOINT =
  'http://127.0.0.1:7274/ingest/45028dbe-909d-4ab6-8d54-6aacd37e93f8';
const DEBUG_SESSION_ID = '15e355';
const DEBUG_RUN_ID = 'run_initial';

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

function AppWeb() {
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
      debugLog('H14', 'src/AppWeb.js:fetchData', 'fetchData start', {
        API_BASE_URL,
      });
      const [
        liveResponse,
        peakEventsResponse,
        rawDataResponse,
        statusResponse,
        dropsResponse,
      ] = await Promise.all([
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
      debugLog('H2', 'src/AppWeb.js:fetchData', 'API payload snapshot', {
        liveKeys: Object.keys(liveDataData || {}),
        liveConnected: liveDataData?.connected,
        rawCount: Array.isArray(rawDataData) ? rawDataData.length : -1,
        peakCount: Array.isArray(peakEventsData) ? peakEventsData.length : -1,
      });

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
        // ignore
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
      debugLog('H1', 'src/AppWeb.js:fetchData', 'API fetch failed', {
        name: error?.name,
        message: error?.message,
      });
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const socket = io(API_BASE_URL, {
      transports: ['polling'],
      upgrade: false,
    });
    socketRef.current = socket;

    socket.on('connect_error', (err) => {
      debugLog('H10', 'src/AppWeb.js:socket', 'Socket connect_error', {
        errName: err?.name,
        errMessage: err?.message,
      });
    });

    socket.on('esp_status', (payload) => {
      debugLog('H3', 'src/AppWeb.js:socket', 'esp_status received', {
        connected: payload?.connected,
      });
      if (payload && typeof payload.connected === 'boolean') {
        setEspConnected(payload.connected);
      }
    });

    socket.on('live_data', (payload) => {
      debugLog('H4', 'src/AppWeb.js:socket', 'live_data received', {
        keys: Object.keys(payload || {}),
        temp: payload?.temp,
        humidity: payload?.humidity,
        roll: payload?.roll,
        pitch: payload?.pitch,
        yaw: payload?.yaw,
        g: payload?.g,
      });
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
      if (events && Array.isArray(events)) {
        setPeakEvents(events);
      }
    });

    socket.on('raw_data', (entry) => {
      if (entry && typeof entry === 'object') {
        setRawData((prev) => [...prev, entry].slice(-1000));
      }
    });

    socket.on('raw_data_batch', (entries) => {
      if (entries && Array.isArray(entries)) {
        setRawData(entries);
      }
    });

    socket.on('drop_event', (entry) => {
      if (entry && typeof entry === 'object') {
        setDrops((prev) => [entry, ...prev].slice(0, 1000));
      }
    });

    socket.on('drops_batch', (entries) => {
      if (entries && Array.isArray(entries)) {
        setDrops(entries);
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
    debugLog('H5', 'src/AppWeb.js:render', 'render snapshot', {
      espConnected,
      liveKeys: Object.keys(liveData || {}),
      sample: {
        temp: liveData?.temp,
        humidity: liveData?.humidity,
        roll: liveData?.roll,
        pitch: liveData?.pitch,
        yaw: liveData?.yaw,
        g: liveData?.g,
      },
      rawCount: rawData.length,
      peakCount: peakEvents.length,
    });
  }, [espConnected, liveData, rawData.length, peakEvents.length]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onNavigate = useCallback((id) => {
    setActiveNav(id);
    const elId = SECTION_SCROLL[id];
    if (elId) {
      document
        .getElementById(elId)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        espConnected={espConnected}
      />
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
            <SafetyCard
              liveData={liveData}
              peakEvents={peakEvents}
              espConnected={espConnected}
            />
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

export default AppWeb;
