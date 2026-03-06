import { NgModule, ModuleWithProviders, SkipSelf, Optional } from '@angular/core';
import { PomsApiConfiguration } from './configuration';
import { HttpClient } from '@angular/common/http';


@NgModule({
  imports:      [],
  declarations: [],
  exports:      [],
  providers: []
})
export class PomsApiApiModule {
    public static forRoot(configurationFactory: () => PomsApiConfiguration): ModuleWithProviders<PomsApiApiModule> {
        return {
            ngModule: PomsApiApiModule,
            providers: [ { provide: PomsApiConfiguration, useFactory: configurationFactory } ]
        };
    }

    constructor( @Optional() @SkipSelf() parentModule: PomsApiApiModule,
                 @Optional() http: HttpClient) {
        if (parentModule) {
            throw new Error('PomsApiApiModule is already loaded. Import in your base AppModule only.');
        }
        if (!http) {
            throw new Error('You need to import the HttpClientModule in your AppModule! \n' +
            'See also https://github.com/angular/angular/issues/20575');
        }
    }
}
