import { 
  Http,
  Headers,
  Request, 
  Response, 
  RequestOptions, 
  RequestOptionsArgs
} from '@angular/http'

import { Injectable, Provider } from '@angular/core'
import { AuthHttp, AuthConfig } from 'angular2-jwt'
import { Observable, Subject } from 'rxjs/Rx'

import { TCAuthenticationService } from './services/tc-authentication.service'
import { environment } from '../environments/environment'

@Injectable()
export class TCHttp extends AuthHttp {

  private readonly _autoSyncSignal = new Subject<any>()
  public get autoSyncSignal() : Observable<any> {
    return this._autoSyncSignal
  }

  constructor(
    private authService : TCAuthenticationService,
    options : AuthConfig, 
    http : Http, 
    optDefs?: RequestOptions
  ) {
    super(options, http, optDefs)
  }

  private refreshing : boolean = false

  public request(url: string | Request, options?: RequestOptionsArgs): Observable<Response> {
    if(this.authService.tokenExpired()) {
      if (!this.authService.isLoggedOut()) {
          this.authService.logout()
      }

      const nullResult = new Subject<Response>()
      nullResult.complete()

      return nullResult
    }
    else if (!this.refreshing && this.authService.needsTokenRefresh()) {
      this.refreshing = true
      const headers = new Headers({ 
        'Content-Type' : 'application/json',
        "x-api-key" : environment.todoCloudAPIKey
      })
      const url = `${environment.baseApiUrl}/authenticate/refresh`

      this.get(url, { headers : headers })
          .subscribe((response : Response) => {
            let token : string = response.json() && response.json().token
            if (token) {
              this.authService.saveToken(token)
            }
            this.refreshing = false
          })
    }

    return super.request(url, options)
  }

  put(url: string, body: any, options?: RequestOptionsArgs) : Observable<Response> {
    if (environment.isElectron) {
      this.signalAutoSync(url)
    }

    return super.put(url, body, options)
  }

  post(url: string, body: any, options?: RequestOptionsArgs): Observable<Response> {
    if (environment.isElectron) {
      this.signalAutoSync(url)
    }

    return super.post(url, body, options)
  }

  delete(url: string, options?: RequestOptionsArgs): Observable<Response> {
    if (environment.isElectron) {
      this.signalAutoSync(url)
    }

    return super.delete(url, options)
  }

  private signalAutoSync(url : string) {
    if (url.split('/').findIndex((val) => val =='sync') >= 0) return
    this._autoSyncSignal.next(null)
  }
}

export const TC_HTTP_PROVIDERS: Provider[] = [
  {
    provide: TCHttp,
    deps: [Http, RequestOptions, TCAuthenticationService],
    useFactory: (http: Http, options: RequestOptions, authService: TCAuthenticationService) => {
      return new TCHttp(authService, new AuthConfig(), http, options);
    }
  }
]
