import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:8000');
const API_ROOT = BASE_URL.replace(/\/+$/, '').endsWith('/api') ? '' : '/api';

const api = axios.create({ baseURL: BASE_URL });

const latestForecastCache = new Map();

export const getCachedLatestForecast = (date) => latestForecastCache.get(date);

export const getLatestForecast = async (date, { force = false } = {}) => {
  const cached = latestForecastCache.get(date);
  if (cached && !force) return cached;

  const { data } = await api.get(`${API_ROOT}/forecast/latest`, { params: { date } });
  latestForecastCache.set(date, data);
  return data;
};

export const getForecastHistory = () =>
  api.get(`${API_ROOT}/forecast/history`).then(r => r.data);

export const getAccuracySummary = () =>
  api.get(`${API_ROOT}/accuracy/summary`).then(r => r.data);

export const getAccuracyByLeadtime = () =>
  api.get(`${API_ROOT}/accuracy/by-leadtime`).then(r => r.data);

export const getActualsVsForecast = () =>
  api.get(`${API_ROOT}/accuracy/actuals-vs-forecast`).then(r => r.data);

export const sendChatMessage = (message, history, selectedDate = null) =>
  api.post(`${API_ROOT}/chat`, { message, history, selected_date: selectedDate }).then(r => r.data);
