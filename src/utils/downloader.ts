import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import https from 'node:https';
import config from '../config';

export class Downloader {
    private baseDir: string;
    private enabled: boolean;

    constructor() {
        this.baseDir = path.join(__dirname, '../../downloads');
        this.enabled = config.useDownload;
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        return this.enabled;
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    async downloadImage(url: string, type: string, id: number): Promise<string | null> {
        if (!this.enabled) return null;

        const extension = path.extname(url).toLowerCase() || '.jpg';
        const typeDir = path.join(this.baseDir, type);
        const filePath = path.join(typeDir, `${id}${extension}`);

        await fsPromises.mkdir(typeDir, { recursive: true });

        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download: ${response.statusCode}`));
                    return;
                }

                const fileStream = fs.createWriteStream(filePath);
                response.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve(filePath);
                });
            }).on('error', reject);
        });
    }
}
