import {Injectable}     from '@angular/core'
import {Http, Headers, Response, RequestOptions}  from '@angular/http'
import { TCHttp } from '../tc-http'
import { Router } from '@angular/router'
import { Observable, ReplaySubject } from 'rxjs/Rx'
import { AuthConfigConsts, tokenNotExpired, JwtHelper } from 'angular2-jwt'
import { environment } from '../../environments/environment'

import 'rxjs/add/operator/map'

import { TCAppSettingsService }  from './tc-app-settings.service'
import { TCErrorService } from './tc-error.service'

@Injectable()
export class TCAuthenticationService {
    
    public token    : string
    private headers : Headers
    private _authStateChanged : ReplaySubject<boolean>
    public get authStateChanged() : Observable<boolean> {
        return this._authStateChanged
    }

    constructor(
        private http: Http,
        private appSettings: TCAppSettingsService,
        private router: Router,
        public errService: TCErrorService
        ) {
        // Set the token if it's saved in local storage
        this.token = localStorage.getItem(AuthConfigConsts.DEFAULT_TOKEN_NAME)

        this.headers = new Headers({
            'Content-Type' : 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })

        this._authStateChanged = new ReplaySubject(1)
        this._authStateChanged.next(!this.isLoggedOut())
    }

    login(username: string, password: string): Observable<any> {
        // TO-DO: Protect against bogus username & password values by stripping whitespace/etc.
        let options = new RequestOptions({ headers : this.headers })
        let url = `${environment.baseApiUrl}/authenticate`
        let json = JSON.stringify({username:username, password:password})

        return this.http
            .post(url, json, options).share()
            .map((response: Response) => {
                let token = response.json() && response.json().token
                if (token) {
                    this.saveToken(token)

                    // Store the username and JWT token in local storage to indicate
                    // that the user is logged in between page refreshes.
                    localStorage.setItem(TCAppSettingsService.currentUserKey, JSON.stringify({'username':username, 'token':token}))

                    // Indicate that the auth state has changed so
                    // external subscribers can update their states.
                    this._authStateChanged.next(true)

                    // Return true to indicate a successful login
                    return true
                }  else {
                    // Return false to indicate a failed login
                    // TO-DO: Figure out how to localize 'Service error'
                    return Observable.throw(response.json().error || 'Service error')
                }
            })
            .catch(err => this.handleError(err))
    }

    logout(disableRedirect ?: boolean): void {
        // Clear the token, remove the user from local storage, and log the user out
        this.token = null
        localStorage.removeItem(TCAppSettingsService.currentUserKey)
        localStorage.removeItem(AuthConfigConsts.DEFAULT_TOKEN_NAME)

        if (environment.isElectron) {
            this.appSettings.clearSelectedListID()
        }

        // Indicate that the auth state has changed so
        // external subscribers can update their states.
        this._authStateChanged.next(true)

        if(!disableRedirect) {
            this.router.navigateByUrl('/welcome/register')
        }
    }

    createUser(username: string, password: string, firstName: string, lastName: string, emailOptIn: boolean): Observable<any> {
        // TO-DO: Protect against bad data in username, password, firstName, etc
        this.appSettings.clearSelectedListID()
        
        const options = new RequestOptions({ headers : this.headers })
        const params = {
            username:username,
            password:password,
            first_name:firstName,
            last_name:lastName,
            email_opt_in:emailOptIn
        }

        return this.http
            .post(`${environment.baseApiUrl}/account`, JSON.stringify(params), options).share()
            .map((response: Response) => {
                let token = response.json() && response.json().token
                if (token) {
                    this.saveToken(token)

                    localStorage.setItem(TCAppSettingsService.currentUserKey, JSON.stringify({'username':username, 'token':token}))

                    // Indicate that the auth state has changed so
                    // external subscribers can update their states.
                    this._authStateChanged.next(true)
                    
                    // Return true to indicate the user was created successfully
                    return true
                } else {
                    // Return false to indicate the user was not created
                    return Observable.throw(response.json().error || 'Service error')
                }
            })
            .catch(err => this.handleError(err))
    }

    needsTokenRefresh() : boolean {
        const helper = new JwtHelper()
        const expirationOffset : number = (((60 * 60) * 24) * 7)
        return this.token != null ? helper.isTokenExpired(this.token, expirationOffset) : true
    }

    tokenExpired() {
        const helper = new JwtHelper()
        return this.token != null ? helper.isTokenExpired(this.token) : true
    }
    
    isLoggedOut() {
        return this.token === null
    }

    saveToken(token: string) {
        this.token = token

        // Save the token here for use with angular2-jwt library.
        // There's a way to customize how this works, but this is the
        // quickest, simplest way to get the library working for us.
        localStorage.setItem(AuthConfigConsts.DEFAULT_TOKEN_NAME, token)
    }

    protected handleError(error: any): Observable<any> {
        // console.log(`handleError(): ${JSON.stringify(error)}`)
        let errCode : string = 'ServiceError'
        let errMsg : string = 'Error communicating with the service'
        if (error._body) {
            // console.log(`${error._body}`)
            let data = JSON.parse(error._body)
            if (data && data.code && data.message) {
                // We've got a real API error back from the server that we can use
                errCode = data.code
                errMsg = data.message
            } else if (data && data.message) {
                // We've likely received some sort of error from API Gateway
                // but it's not one of our known errors.
                errMsg = data.message
            }
        }

        // This lets any UI know of the error
        this.errService.publishError(errCode, errMsg)
        
        // Throw an application-level error
        let fullErrMsg = `${errCode}: ${errMsg}`
        return Observable.throw(fullErrMsg)
    }
}
