import { FastifyRequest, FastifyReply } from 'fastify';
import { dbRequest } from '../utils';
import { userAuthed } from '../db/user';
import {
  checkDatabaseExists,
  createDatabase,
  deleteDatabase,
  permitDatabase,
} from '../db/database';
import { createVaultInfo, deleteVaultInfo } from '../db/vaults';

// elevate permission for database management
export const putDB = (prefix: RegExp) => async (request: FastifyRequest, reply: FastifyReply) => {
  let req;
  try {
    req = dbRequest(prefix, request);
  } catch (err) {
    return reply.code(400).send(err.message);
  }

  if (!(await userAuthed(req.auth))) {
    return reply.code(403).send('Invalid credentials');
  }

  try {
    if (await checkDatabaseExists(req.db)) {
      return reply.code(409).send('Database already exists');
    }
    await createVaultInfo(req.username, req.vault);
    const response = await createDatabase(req.db);
    await permitDatabase(req.db, req.username);
    return reply.code(response.status).send(response.data);
  } catch (err) {
    return reply.code(500).send(err.message || 'Unknown error');
  }
};

export const deleteDB =
  (prefix: RegExp) => async (request: FastifyRequest, reply: FastifyReply) => {
    let req;
    try {
      req = dbRequest(prefix, request);
    } catch (err) {
      return reply.code(400).send(err.message);
    }

    if (!(await userAuthed(req.auth))) {
      return reply.code(403).send('Invalid credentials');
    }

    try {
      await deleteVaultInfo(req.username, req.vault);
      const response = await deleteDatabase(req.db);
      return reply.code(response.status).send(response.data);
    } catch (err) {
      return reply.code(500).send(err.message || 'Unknown error');
    }
  };
