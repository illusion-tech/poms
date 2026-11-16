// Fixed current15 bridge; no duplicated Tax implementation.
import {preImport270,verifySource15Runtime270} from '../period15-270/runtime270.mjs';
export {consumeCallerTax270} from '../period15-270/runtime270.mjs';
export const preImport271=preImport270;
export async function verifySource15Runtime271(ctx,p,h,consumerInput){return verifySource15Runtime270(ctx,p,h,consumerInput,'mixed15-271');}
