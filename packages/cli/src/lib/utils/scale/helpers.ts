import http from 'http';
import https from 'https';
import { URL } from 'url';

export const getJsonFromUrl = (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    protocol
      .get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};

export const isUrl = (path: string): boolean => {
  try {
    new URL(path);
    return true;
  } catch {
    return false;
  }
};

export const getBaseURL = (servers: any[]): string =>
  servers && servers.length > 0 ? servers[0].url : '';
