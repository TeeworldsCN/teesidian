import { FastifyReply, FastifyRequest } from 'fastify';
import { userAuthed } from '../db/user';
import { getVaultInfos } from '../db/vaults';
import { apiRequest } from '../utils';

export const getVaults = async (request: FastifyRequest, reply: FastifyReply) => {
  const req = apiRequest(request);
  if (!(await userAuthed(req.auth))) {
    return reply.code(403).send('Invalid credentials');
  }

  reply.send(await getVaultInfos(req.username));
};
