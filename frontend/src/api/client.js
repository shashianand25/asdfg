import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: BASE_URL });

const latestForecastCache = new Map();

export const getCachedLatestForecast = (date) => latestForecastCache.get(date);

export const getLatestForecast = async (date, { force = false } = {}) => {
  const cached = latestForecastCache.get(date);
  if (cached && !force) return cached;

  const { data } = await api.get('/api/forecast/latest', { params: { date } });
  latestForecastCache.set(date, data);
  return data;
};

export const getForecastHistory = () =>
  api.get('/api/forecast/history').then(r => r.data);

export const getAccuracySummary = () =>
  api.get('/api/accuracy/summary').then(r => r.data);

export const getAccuracyByLeadtime = () =>
  api.get('/api/accuracy/by-leadtime').then(r => r.data);

export const getActualsVsForecast = () =>
  api.get('/api/accuracy/actuals-vs-forecast').then(r => r.data);

export const sendChatMessage = (message, history, selectedDate = null) =>
  api.post('/api/chat', { message, history, selected_date: selectedDate }).then(r => r.data);
