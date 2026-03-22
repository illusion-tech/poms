import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
    const appService = new AppService();
    const appController = new AppController(appService);

    describe('getData', () => {
        it('should return "Hello API"', () => {
            expect(appController.getData()).toEqual({ message: 'Hello API' });
        });
    });
});
