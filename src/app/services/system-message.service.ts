import { Injectable } from '@angular/core'
import { Headers } from '@angular/http'
import { Observable, ReplaySubject } from 'rxjs'
import { TCHttp } from '../tc-http'
import { environment } from '../../environments/environment'
import { Utils } from '../tc-utils'

import { TCBaseService } from './tc-base.service'
import { TCErrorService } from './tc-error.service'

import { TCSystemNotification } from '../classes/tc-system-notification'

const SYSTEM_POLLING_TIME : number = Utils.hoursToMilliseconds(5)

@Injectable()
export class SystemMessageService extends TCBaseService {
    private readonly systemNotificationUrl = `${environment.baseApiUrl}/system/notification`

    private _systemMessage : ReplaySubject<TCSystemNotification>
    public readonly systemMessage : Observable<TCSystemNotification>

    constructor(
        tcHttp : TCHttp,
        errService : TCErrorService
    ) {
        super(tcHttp, errService)

        this._systemMessage = new ReplaySubject<TCSystemNotification>(1)
        this.systemMessage = this._systemMessage

        this.loadMessage()
        this.schedulePolling()
    }

    private schedulePolling() {
        Observable.interval(SYSTEM_POLLING_TIME).subscribe(count => {
            this.loadMessage()
        })
    }

    private loadMessage() {
        const headers = new Headers({
            'Content-Type': 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })
        
        this.tcHttp
            .get(this.systemNotificationUrl, { headers : headers })
            .map(response => {
                if (!response.ok) return Observable.throw(response.json().error || 'Service error') 

                return new TCSystemNotification(response.json())
            })
            .catch(err => this.handleError(err))
            .first()
            .subscribe(message => this._systemMessage.next(message))
    }
}