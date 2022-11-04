import axios from 'axios';
import { CONFIG } from '../config';

export const userAuthed = async (auth: string) => {
  // authenicate user
  try {
    await axios('/', {
      baseURL: CONFIG.couchdb,
      method: 'HEAD',
      headers: {
        Authorization: auth,
      },
    });
    return true;
  } catch (err) {
    if (err.response.status === 403) return false;
    else throw err;
  }
};
