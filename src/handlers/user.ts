import { FastifyRequest, FastifyReply } from 'fastify';
import { CONFIG } from '../config';
import axios, { AxiosError } from 'axios';
import { dbRequest } from '../utils';

export const userRequest =
  (prefix: RegExp) => async (request: FastifyRequest, reply: FastifyReply) => {
    let req;
    try {
      req = dbRequest(prefix, request);
    } catch (err) {
      return reply.code(400).send(err.message);
    }

    return await passthrough(request, reply, req);
  };

export const passthrough = async (request: FastifyRequest, reply: FastifyReply, req: any) => {
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
    const response = await axios(req.url, options);
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
