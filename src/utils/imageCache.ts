import fs from 'node:fs/promises';
import path from 'node:path';
import config from '../config';
import { Downloader } from './downloader';

interface ImageData {
    id: number;
    type: string;
    url: string;
}

interface CacheData {
    sentImages: ImageData[];
}

export class ImageCache {
    private cachePath: string;
    private cache: CacheData;
    private enabled: boolean;
    public downloader: Downloader;

    constructor() {
        this.cachePath = path.join(__dirname, '../../cache/images.json');
        this.cache = { sentImages: [] };
        this.enabled = config.useCache;
        this.downloader = new Downloader();
    }

    async init() {
        try {
            await fs.mkdir(path.dirname(this.cachePath), { recursive: true });
            const data = await fs.readFile(this.cachePath, 'utf-8');
            this.cache = JSON.parse(data);
        } catch {
            await this.saveCache();
        }
    }

    private async saveCache() {
        await fs.writeFile(this.cachePath, JSON.stringify(this.cache, null, 2));
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        return this.enabled;
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    async addImage(image: ImageData) {
        if (!this.enabled) return true;
        
        if (!this.hasImage(image)) {
            if (this.downloader.isEnabled()) {
                try {
                    const filePath = await this.downloader.downloadImage(
                        image.url,
                        image.type,
                        image.id
                    );
                    if (filePath) console.log(`Downloaded: ${filePath}`);
                } catch (error) {
                    console.error(`Failed to download image: ${error}`);
                }
            }
            this.cache.sentImages.push(image);
            if (this.cache.sentImages.length > config.maxCacheSize) {
                this.cache.sentImages.shift(); // Remove oldest entry
            }
            await this.saveCache();
            return true;
        }
        return false;
    }

    hasImage(image: ImageData): boolean {
        if (!this.enabled) return false;
        return this.cache.sentImages.some(img => 
            img.id === image.id && img.type === image.type
        );
    }

    clearCache() {
        this.cache.sentImages = [];
        return this.saveCache();
    }
}
