import {
  IconOverview,
  IconLive,
  IconHistory,
  IconChart,
  IconAlert,
  IconReport,
} from './icons';

/** Section ids must match scroll targets in the page. */
export const SECTION_SCROLL = {
  overview: 'dash-overview',
  live: 'dash-live',
  history: 'dash-history',
  analytics: 'dash-analytics',
  alerts: 'dash-safety',
  reports: 'dash-reports',
};

export const DASHBOARD_NAV = [
  { id: 'overview', label: 'Dashboard', shortLabel: 'Home', Icon: IconOverview },
  { id: 'live', label: 'Live data', shortLabel: 'Live', Icon: IconLive },
  { id: 'history', label: 'Drop history', shortLabel: 'Drops', Icon: IconHistory },
  { id: 'analytics', label: 'Peak values', shortLabel: 'Peaks', Icon: IconChart },
  { id: 'alerts', label: 'Safety', shortLabel: 'Safe', Icon: IconAlert },
  { id: 'reports', label: 'Raw data', shortLabel: 'Raw', Icon: IconReport },
];
