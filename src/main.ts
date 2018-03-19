import './polyfills.ts';

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { crashReporter } from 'electron'
import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';
import { AppModule } from './app/app.module';
import { Http } from '@angular/http'


// // Start a crash reporter that will log crashes
// crashReporter.start({
//   productName: `TodoCloud`,
//   companyName: `Appigo, Inc.`,
//   submitURL: `none`,
//   uploadToServer: false
// })

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule);
