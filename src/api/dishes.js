import http from './http';

export const listDishes = async (q = '', status) => {
  const params = {};
  if (q) params.q = q;
  if (status !== undefined) params.status = status;
  const { data } = await http.get('/api/dishes', { params });
  return data;
};

export const createDish = async (payload) => {
  const { data } = await http.post('/api/dishes', payload);
  return data;
};

export const updateDish = async (idOrUuid, payload) => {
  const { data } = await http.put(`/api/dishes/${idOrUuid}`, payload);
  return data;
};

export const deleteDish = async (idOrUuid) => {
  const { data } = await http.delete(`/api/dishes/${idOrUuid}`);
  return data;
};

export const patchDishStatus = async (idOrUuid, status) => {
  const { data } = await http.patch(`/api/dishes/${idOrUuid}/status`, { status });
  return data;
};
