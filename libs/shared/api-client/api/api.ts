export * from './app.service';
import { AppApi } from './app.service';
export * from './auth.service';
import { AuthApi } from './auth.service';
export * from './navigation.service';
import { NavigationApi } from './navigation.service';
export const APIS = [AppApi, AuthApi, NavigationApi];
