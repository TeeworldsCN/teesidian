import { FastifyRequest, FastifyReply } from 'fastify';
import { Authorization, CONFIG } from '../config';
import axios, { AxiosError } from 'axios';
import { urlJoin } from '../utils';

// elevate permission for database management
export const elevated =
  (prefix: RegExp) => async (request: FastifyRequest, reply: FastifyReply) => {
    const url = request.url.replace(prefix, '');
    const username = Buffer.from(request.headers.authorization.replace(/^Basic /i, ''), 'base64')
      .toString('utf-8')
      .split(':')[0];

    // check if accessing this user's database
    if (!url.startsWith(`/${username}`)) {
      return reply.code(403).send({ message: 'invalid access' });
    }

    // check if user can auth
    try {
      await axios.head('/', {
        baseURL: CONFIG.couchdb,
        headers: {
          'Authorization': Authorization,
          'User-Agent': request.headers['user-agent'],
        },
      });
    } catch (err) {
      if (err.isAxiosError) {
        const e = err as AxiosError;
        if (e.response) {
          return reply.code(e.response.status).send(e.response.data);
        }
      }

      return reply.code(500).send(err.message || err || 'Unknown error');
    }

    try {
      const response = await axios(url, {
        baseURL: CONFIG.couchdb,
        method: request.method,
        headers: { Authorization: Authorization },
        data: request.body,
      });

      const securityUrl = urlJoin(url, '_security');

      if (request.method === 'PUT') {
        // try setting permissions if creating a new database
        try {
          await axios(securityUrl, {
            baseURL: CONFIG.couchdb,
            method: 'PUT',
            headers: { Authorization: Authorization },
            data: {
              admins: {
                names: [username],
                roles: ['_admin'],
              },
              members: {
                names: [username],
                roles: ['_admin'],
              },
            },
          });
        } catch (err) {
          return reply.code(500).send({ message: 'security error' });
        }
      }

      return reply.code(response.status).send(response.data);
    } catch (err) {
      if (err.isAxiosError) {
        const e = err as AxiosError;
        if (e.response) {
          return reply.code(e.response.status).send(e.response.data);
        }
      }

      return reply.code(500).send(err.message || err || 'Unknown error');
    }
  };
