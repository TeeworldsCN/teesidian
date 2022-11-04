import { FastifyRequest } from 'fastify';

export const urlJoin = (url: string, path: string) => {
  if (!url.endsWith('/')) {
    url += '/';
  }

  return url + path;
};

export const dbRequest = (prefix: RegExp, request: FastifyRequest) => {
  const urlParts = request.url.replace(prefix, '').split('/');
  const auth = request.headers.authorization;
  const username = Buffer.from(auth.replace(/^Basic /i, ''), 'base64')
    .toString('utf-8')
    .split(':')[0];
  const vault = urlParts[1];
  const op = urlParts.slice(2).join('/');

  if (!auth) throw new Error('Invalid credentials');
  if (!username) throw new Error('Invalid username');

  if (vault) {
    // database operations
    const db = `${username}-${vault}`;

    return {
      url: `/${db}/${op}`,
      db,
      username,
      vault,
      auth,
    };
  } else {
    // root operations
    if (op) throw new Error('Invalid operation');

    return {
      url: `/`,
      db: null,
      username,
      vault: null,
      auth,
    };
  }
};

export const apiRequest = (request: FastifyRequest) => {
  const auth = request.headers.authorization;
  const username = Buffer.from(auth.replace(/^Basic /i, ''), 'base64')
    .toString('utf-8')
    .split(':')[0];

  if (!auth) throw new Error('Invalid credentials');
  if (!username) throw new Error('Invalid username');

  return {
    username,
    auth,
  };
};
