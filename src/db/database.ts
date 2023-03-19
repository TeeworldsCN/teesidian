import axios from 'axios';
import { CONFIG } from '../config';

export const checkDatabaseConnection = async () => {
  try {
    await axios(`/`, {
      baseURL: CONFIG.couchdb,
      method: 'GET',
    });
  } catch (e) {
    if (e.response && e.response.status === 401) return;
    throw e;
  }
};

export const checkDatabaseExists = async (db: string) => {
  try {
    await axios(`/${encodeURIComponent(db)}`, {
      baseURL: CONFIG.couchdb,
      method: 'HEAD',
      headers: { Authorization: CONFIG.auth },
    });
  } catch (e) {
    if (e.response && e.response.status === 404) return false;
    throw e;
  }
  return true;
};

export const createDatabase = async (db: string) => {
  return await axios(`/${encodeURIComponent(db)}`, {
    baseURL: CONFIG.couchdb,
    method: 'PUT',
    headers: { Authorization: CONFIG.auth },
  });
};

export const createIndex = async (db: string, index: any) => {
  return await axios(`/${encodeURIComponent(db)}/_index`, {
    baseURL: CONFIG.couchdb,
    method: 'POST',
    headers: { Authorization: CONFIG.auth },
    data: index,
  });
};

export const createDatabaseIfNotExists = async (db: string) => {
  if (await checkDatabaseExists(db)) return;
  return await createDatabase(db);
};

export const permitDatabase = async (db: string, user: string) => {
  const securityUrl = `/${encodeURIComponent(db)}/_security`;
  return await axios(securityUrl, {
    baseURL: CONFIG.couchdb,
    method: 'PUT',
    headers: { Authorization: CONFIG.auth },
    data: {
      admins: {
        names: [user],
        roles: ['_admin'],
      },
      members: {
        names: [user],
        roles: ['_admin'],
      },
    },
  });
};

export const deleteDatabase = async (db: string) => {
  return await axios(`/${encodeURIComponent(db)}`, {
    baseURL: CONFIG.couchdb,
    method: 'DELETE',
    headers: { Authorization: CONFIG.auth },
  });
};

export const createDocument = async (db: string, doc: any) => {
  const response = await axios<{ id: string; ok: boolean; rev: string }>(
    `/${encodeURIComponent(db)}`,
    {
      baseURL: CONFIG.couchdb,
      method: 'POST',
      headers: { Authorization: CONFIG.auth },
      data: doc,
    }
  );

  return response;
};

export const deleteDocument = async (db: string, id: string) => {
  const checkDocuments = await axios(`/${encodeURIComponent(db)}/${encodeURIComponent(id)}`, {
    baseURL: CONFIG.couchdb,
    method: 'HEAD',
    headers: { Authorization: CONFIG.auth },
  });

  const rev = checkDocuments.headers.etag.slice(1, -1);

  const response = await axios(`/${encodeURIComponent(db)}/${encodeURIComponent(id)}`, {
    baseURL: CONFIG.couchdb,
    params: {
      rev,
    },
    method: 'DELETE',
    headers: { Authorization: CONFIG.auth },
  });

  return response;
};

export const findDocuments = async (db: string, options: any) => {
  const response = await axios<{ docs: any[] }>(`/${encodeURIComponent(db)}/_find`, {
    baseURL: CONFIG.couchdb,
    method: 'POST',
    headers: { Authorization: CONFIG.auth },
    data: options,
  });

  return response.data.docs;
};

export const getAllDocs = async (db: string) => {
  const response = await axios<{
    total_rows: number;
    rows: {
      id: string;
      key: string;
      value: {
        rev: string;
      };
    }[];
  }>(`/${encodeURIComponent(db)}/_all_docs`, {
    baseURL: CONFIG.couchdb,
    method: 'GET',
    headers: { Authorization: CONFIG.auth },
  });

  return response.data;
};
