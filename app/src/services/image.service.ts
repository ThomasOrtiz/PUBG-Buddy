import Jimp = require('jimp');
import { CacheService } from './';
import { TimeInSeconds } from '../shared/constants';

const cache = new CacheService();


export class ImageService {

    public static async loadImage(imageLocation: string): Promise<Jimp> {
        const cacheKey: string = `loadImage-${imageLocation}`;
        const ttl: number = TimeInSeconds.THIRTY_MINUTES;
        const storeFunction: Function = async (): Promise<Jimp> => {
            return await Jimp.read(imageLocation);
        };

        return await cache.get<Jimp>(cacheKey, storeFunction, ttl);
    }

    public static async loadFont(font: string): Promise<Jimp.Font> {
        const cacheKey: string = `loadFont-${font}`;
        const ttl: number = TimeInSeconds.THIRTY_MINUTES;
        const storeFunction: Function = async (): Promise<Jimp.Font> => {
            return await Jimp.loadFont(font)
        };

        return await cache.get<Jimp.Font>(cacheKey, storeFunction, ttl);
    }

    public static combineImagesVertically(imgOne: Jimp, imgTwo: Jimp): Jimp {
        const newWidth: number = this.getBiggerWidth(imgOne, imgTwo);
        const newHeight: number = imgOne.getHeight() + imgTwo.getHeight();

        let newImage: Jimp = new Jimp(newWidth, newHeight);
        newImage.composite(imgOne, 0, 0);
        newImage.composite(imgTwo, 0, imgOne.getHeight());

        return newImage;
    }

    public static combineImagesHorizontally(imgOne: Jimp, imgTwo: Jimp): Jimp {
        const newWidth: number = imgOne.getWidth() + imgTwo.getWidth();
        const newHeight: number = this.getBiggerHeight(imgOne, imgTwo);

        let newImage: Jimp = new Jimp(newWidth, newHeight);
        newImage.composite(imgOne, 0, 0);
        newImage.composite(imgTwo, imgOne.getWidth(), 0);

        return newImage;
    }

    private static getBiggerWidth(imgOne: Jimp, imgTwo: Jimp): number {
        return (imgOne.getWidth() > imgTwo.getWidth()) ? imgOne.getWidth() : imgTwo.getWidth();
    }

    private static getBiggerHeight(imgOne: Jimp, imgTwo: Jimp): number {
        return (imgOne.getHeight() > imgTwo.getHeight()) ? imgOne.getHeight() : imgTwo.getHeight();
    }

}
