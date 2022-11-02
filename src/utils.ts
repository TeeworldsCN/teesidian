export const urlJoin = (url: string, path: string) => {
  if (!url.endsWith('/')) {
    url += '/';
  }

  return url + path;
};
