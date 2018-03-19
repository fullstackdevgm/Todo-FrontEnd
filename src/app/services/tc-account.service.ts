import {Injectable, OnInit}     from '@angular/core'
import {Http, Headers, RequestOptions, Response}  from '@angular/http'
import { TCHttp } from '../tc-http'
import { environment } from '../../environments/environment'
import { Observable, ReplaySubject, Scheduler } from 'rxjs/Rx'

import 'rxjs/add/operator/map'


import { TCAccount }      from '../classes/tc-account'
import { TCBaseService } from './tc-base.service'
import { TCErrorService } from './tc-error.service'
import { TCSubscription } from '../classes/tc-subscription'
import { TCUserSettings } from '../classes/tc-user-settings'

import { TCAuthenticationService } from './tc-authentication.service'
import { TCUserSettingsService } from './tc-user-settings.service'
import { TCSubscriptionService } from './tc-subscription.service'

import { PasswordUpdate } from '../tc-types'

@Injectable()
export class TCAccountService extends TCBaseService {
    public readonly account : ReplaySubject<TCAccount>

    constructor(
        private http   : Http,
        public tcHttp : TCHttp,
        private authService: TCAuthenticationService,
        private userSettingsService : TCUserSettingsService,
        private subscriptionService : TCSubscriptionService,
        public errService : TCErrorService
    ) {
        super(tcHttp, errService)

        this.account = new ReplaySubject<TCAccount>(1)
        this.getAccountInfo()

        // Subscribe to authentication events so we'll know when to
        // update the account object.
        this.authService.authStateChanged.subscribe({
            next: (authStateChanged) => {
                if (this.authService.isLoggedOut()) {
                    // Blank out the current account information.
                    // This will prevent old account information showing
                    // up momentarily when signing in to a different
                    // account using the same app/browser window.
                    const account = new TCAccount()
                    this.account.next(account)
                } else {
                    this.getAccountInfo()
                }
            }
        })
    }

    private provideNextAccountInfo(result : any, extended? : boolean) {
        const account = new TCAccount()
        account.updateWithJSON(result.account)
        this.account.next(account)
        
        if (extended) {
            const subscription = new TCSubscription(result.subscription)
            const settings     = new TCUserSettings(result.user_settings)

            this.subscriptionService.subscription.next(subscription)
            this.userSettingsService.settings.next(settings)
        }
    }

    getAccountInfo(): Observable<any> {
        let url = `${environment.baseApiUrl}/account?type=extended`
        let headers = new Headers({
            'Content-Type' : 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })

        const retVal = this.tcHttp
            .get(url, { headers : headers }).share()
            .map((response: Response) => {
                let success = response.ok
                if (success) {
                    return response.json()
                } else {
                    return Observable.throw(response.json().error || 'Service error')
                }
            })
            .catch(err => this.handleError(err))

        retVal.subscribe(
            result => this.provideNextAccountInfo(result, true),
            err => this.authService.logout()
        )

        return retVal
    }

    getAccount() : Observable<any> {
         let url = `${environment.baseApiUrl}/account`
         let headers = new Headers({
            'Content-Type' : 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })

        const retVal = this.tcHttp
            .get(url, { headers : headers}).share()
            .map((response: Response) => {
                let success = response.ok
                if (success) {
                    return response.json()
                } else {
                    return Observable.throw(response.json().error || 'Service error')
                }
            })
            .catch(err => this.handleError(err))

        retVal.subscribe(result => this.provideNextAccountInfo(result))

        return retVal
    }

    updateAccount(account : TCAccount) : Observable<TCAccount> {
        const url = `${environment.baseApiUrl}/account`
        const headers = new Headers({ 
            'Content-Type' : 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })

        const retVal = this.tcHttp
            .put(url, JSON.stringify(account), { headers : headers})
            .map((response: Response) => {
                if (response.ok) {
                    const anAccount = new TCAccount()
                    anAccount.updateWithJSON(response.json().account)
                    return anAccount
                }
                else {
                    return Observable.throw(response.json().error || 'Service error')
                }
            })
            .catch(err => {
                return this.handleError(err)
            }).first().share().observeOn(Scheduler.async)

        retVal.subscribe(result => {
            this.account.first().subscribe(old => {
                const purgeEmptyKeys = (obj) => {
                    Object.keys(obj).forEach(key => (obj[key] === null || obj[key] === undefined) && delete obj[key])
                    return obj
                }

                const oldjson = purgeEmptyKeys(old.toJSON())
                const newjson = purgeEmptyKeys(result.toJSON())
                const merged = Object.assign({}, oldjson, newjson)
                const newAccountInfo = new TCAccount(merged)
                this.account.next(newAccountInfo)
            })
        })
        
        return retVal
    }

    verifyEmail(verificationId : string) : Observable<any> {
        const url = `${environment.baseApiUrl}/account/email/verify`
        const headers = new Headers({ 
            'Content-Type' : 'application/json',
            "x-api-key" : environment.todoCloudAPIKey 
        })
        const body = {
            verificationid  : verificationId
        }

        return this.http
            .put(url, JSON.stringify(body), { headers : headers }).share()
            .map((response : Response) => {
                if (response.ok) {
                    this.getAccountInfo()
                    return response.json()
                }
                else {
                    return Observable.throw(response.json().error || 'Service error')
                }
            })
            .catch(err => this.handleError(err))
    }

    resendVerificationEmail(userid : string) : Observable<any> {
        const url = `${environment.baseApiUrl}/account/email/verify/resend`
        const headers = new Headers({
            "Content-Type" : "application/json",
            "x-api-key" : environment.todoCloudAPIKey
        })
        const body = {
            userid : userid
        }

        return this.tcHttp
            .post(url, JSON.stringify(body), {headers : headers}).share()
            .map((response: Response) => {
                if (response.ok) {
                    return response.json().success
                } else {
                    return Observable.throw(response.json().error || 'Service error')
                }
            })
            .catch(err => this.handleError(err))
    }

    requestPasswordReset(userName : string) : Observable<any> {
        const url = `${environment.baseApiUrl}/account/password/reset`
        const headers = new Headers({ 
            'Content-Type' : 'application/json' ,
            "x-api-key" : environment.todoCloudAPIKey
        })
        const body = JSON.stringify({
            username : userName
        })

        return this.http
            .post(url, body, { headers : headers }).share()
            .map((response : Response) => {
                if (response.ok) {
                    return response.json()
                }
                else {
                    return Observable.throw(response.json().error || 'Service error')
                }
            })
            .catch(err => this.handleError(err))
    }

    resetPassword(resetId : string, password : string) : Observable<any> {
        const url = `${environment.baseApiUrl}/account/password/reset`
        const headers = new Headers({ 
            'Content-Type' : 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })
        const body = JSON.stringify({
            resetid : resetId,
            password: password
        })

        return this.http
            .put(url, body, { headers : headers }).share()
            .map((response : Response) => {
                if (response.ok) {
                    return response.json()
                }
                else {
                    return Observable.throw(response.json().error || 'Service error')
                }
            })
            .catch(err => this.handleError(err))
    }

    updatePassword(update : PasswordUpdate) : Observable<{success : boolean}> {
        let url = `${environment.baseApiUrl}/account/password/update`
        let headers = new Headers({
            'Content-Type' : 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })

        return this.tcHttp
            .put(url, JSON.stringify(update), { headers : headers })
            .share()
            .first()
            .map(response => {
                return response.ok ? response.json() : Observable.throw(response.json().error || 'Service error')
            })
            .catch(err => this.handleError(err))
    }

    getProfileImageUploadURLs() : Observable<any> {
         let url = `${environment.baseApiUrl}/account/profile-image/upload-urls`
         let headers = new Headers({
            'Content-Type' : 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })

        const retVal = this.tcHttp
            .get(url, { headers : headers}).share()
            .map((response: Response) => {
                let success = response.ok
                if (success) {
                    return response.json()
                } else {
                    return Observable.throw(response.json().error || 'Service error')
                }
            })
            .catch(err => this.handleError(err))

        return retVal
    }

    uploadProfileImage(imageBlob : Blob, params : any) : Observable<any> {
        let url = params.url
        let headers = new Headers({
            "Accept": "application/json",
            "x-api-key" : environment.todoCloudAPIKey
        })
        let formData : FormData = new FormData()
        const formFields = params.fields
        Object.keys(formFields).forEach(key => {
            const value = formFields[key]
            formData.append(key, value)
        })
        formData.append("file", imageBlob)

        const options = new RequestOptions({headers: headers})
        const retVal = this.http
            .post(url, formData, options).share()
            .map((response : Response) => {
                if (response.ok) {
                    return response.json()
                }
                else {
                    return Observable.throw(response.json().error || 'Service error')
                }
            })
            .catch(err => this.handleError(err))

        return retVal
    }

    saveProfileImages(bucket : String, largeFileKey : String, smallFileKey : String) : Observable<any> {
         const url = `${environment.baseApiUrl}/account/profile-image/save`
         const headers = new Headers({
            'Content-Type' : 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })

        const body = JSON.stringify({
            bucket : bucket,
            largeSrcKey : largeFileKey,
            smallSrcKey : smallFileKey
        })

        return this.tcHttp
            .post(url, body, { headers : headers }).share()
            .map((response : Response) => {
                if (response.ok) {
                    return response.json()
                }
                else {
                    return Observable.throw(response.json().error || 'Service error')
                }
            })
            .catch(err => this.handleError(err))
    }

    removeLocalAccount() {
        if (!environment.isElectron) return
        this.http
            .delete(`${environment.baseApiUrl}/local-clear`)
            .first()
            .map(response => {
                return response.ok ? response : Observable.throw(response.json() || 'Service error')
            })
            .subscribe(
                response => {}, 
                err => {},
                () => {}
            ) // No-op subscription because I don't really know what should go in there...
    }
}
