import { Injectable, OnInit }     from '@angular/core'
import { Headers, RequestOptions, Response }  from '@angular/http'
import { TCHttp } from '../tc-http'
import { environment } from '../../environments/environment'

import { Observable, ReplaySubject } from 'rxjs/Rx'
import 'rxjs/add/operator/map'
import * as moment from 'moment'
import 'moment-timezone'

import { TCBaseService } from './tc-base.service'
import { TCErrorService } from './tc-error.service'
import { TCUserSettings, TCUserSettingsUpdate } from '../classes/tc-user-settings'
import { TCAppSettingsService } from './tc-app-settings.service'
import { TCAuthenticationService } from './tc-authentication.service'

@Injectable()
export class TCUserSettingsService extends TCBaseService {

    private _settings : ReplaySubject<TCUserSettings> = new ReplaySubject<TCUserSettings>(1)
    public get settings() : ReplaySubject<TCUserSettings> {
        return this._settings
    }

    private headers : Headers

    private currentSettings : TCUserSettings

    constructor(
        private readonly authService : TCAuthenticationService,
        public tcHttp : TCHttp,
        public errService : TCErrorService,
        private appSettings : TCAppSettingsService
    ) {
        super(tcHttp, errService)
        
        this.headers = new Headers({
            'Content-Type' : 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })

        this.setupSettingsSubscriber()

        this.authService.authStateChanged.subscribe(() => {
            if (this.authService.isLoggedOut()) {
                this.resetSettingSubject()
                this.setupSettingsSubscriber()
            }
        })
    }

    set defaultListID(identifier : string) {
        this.appSettings.storedDefaultListID = identifier
    }

    get defaultListID() : string {
        const storedID = this.appSettings.storedDefaultListID
        return storedID ? storedID : this.currentSettings.userInbox
    }

    private resetSettingSubject() {
        this.settings.complete()
        this._settings = new ReplaySubject<TCUserSettings>(1)
    }

    private setupSettingsSubscriber() {
        this.settings.subscribe(s => {
            this.currentSettings = s
            this.appSettings.userSettings = s
        })
    }

    getUserSettings() : Observable<TCUserSettings> {
        const url = `${environment.baseApiUrl}/user-settings`

        const retVal = this.tcHttp
            .get(url, { headers : this.headers }).share()
            .map((response : Response) => {
                if (response.ok) {
                    const settings = new TCUserSettings(response.json())
                    return settings
                }
                else {
                    return Observable.throw(response.json().error || 'Service error')
                }
            })
            .catch(err => this.handleError(err))

        retVal.first().subscribe(result => {
            this.settings.next(result)
        })

        return retVal
    }

    update(userSettings : TCUserSettings) : Observable<TCUserSettingsUpdate> {
        const url = `${environment.baseApiUrl}/user-settings`
        const retVal = this.tcHttp
            .put(url, JSON.stringify(userSettings), { headers : this.headers }).share()
            .map((response : Response) => {
                if (response.ok) {
                    const settings = new TCUserSettingsUpdate(response.json().user_settings)
                    return settings
                }
                else {
                    return Observable.throw(response.json().error || 'Service error')
                }
            })
            .catch(err => this.handleError(err))

        retVal.first().subscribe(result => {
            this.settings.first().subscribe(current => {
                const updated = Object.assign(new TCUserSettings(), current, result)
                this.settings.next(updated)
            })
        })

        return retVal
    }

    updateTimeZone() {
        const sub = this.settings.first().subscribe(settings => {
            settings.timezone = moment.tz.guess()
            this.update(settings)
        })
    }
}

