import { createDocument, deleteDocument, findDocuments } from './database';

export const createVaultInfo = async (user: string, vault: string) => {
  const db = `${user}-${vault}`;
  try {
    return await createDocument('i+vaults', {
      _id: db,
      user,
      createdAt: Date.now(),
    });
  } catch (e) {
    if (!e.response || e.response.status !== 409) throw e;
  }
};

export const deleteVaultInfo = async (user: string, vault: string) => {
  const db = `${user}-${vault}`;

  try {
    return await deleteDocument('i+vaults', db);
  } catch (e) {
    if (!e.response || e.response.status !== 404) throw e;
  }
};

export const getVaultInfos = async (user: string) => {
  return await findDocuments('i+vaults', {
    selector: {
      user,
    },
  });
};
