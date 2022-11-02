import { FastifyRequest, FastifyReply } from 'fastify';
import { CONFIG } from '../config';
import axios, { AxiosError } from 'axios';

export const passthrough =
  (prefix: RegExp) => async (request: FastifyRequest, reply: FastifyReply) => {
    const url = request.url.replace(prefix, '');

    try {
      const options = {
        baseURL: CONFIG.couchdb,
        method: request.method,
        headers: {
          'Authorization': request.headers.authorization,
          'User-Agent': request.headers['user-agent'],
        },
        data: request.body,
      };
      const response = await axios(url, options);
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
