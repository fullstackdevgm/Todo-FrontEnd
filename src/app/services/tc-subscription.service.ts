import { Injectable, OnInit }     from '@angular/core'
import { Http, Headers, RequestOptions, Response }  from '@angular/http'
import { TCHttp } from '../tc-http'
import { environment } from '../../environments/environment'

import { Observable, ReplaySubject } from 'rxjs/Rx'
import 'rxjs/add/operator/map'

import { TCBaseService } from './tc-base.service'
import { TCErrorService } from './tc-error.service'
import { TCSubscription, SubscriptionPurchase, SubscriptionPurchaseHistoryItem } from '../classes/tc-subscription'

@Injectable()
export class TCSubscriptionService extends TCBaseService {
    public readonly subscription : ReplaySubject<TCSubscription>
    private headers : Headers
    private subscriptionUrl : string = `${environment.baseApiUrl}/subscription`

    constructor(
        public tcHttp : TCHttp,
        public errService : TCErrorService
    ){
        super(tcHttp, errService)
        this.subscription = new ReplaySubject<TCSubscription>(1)
        this.headers = new Headers({
            'Content-Type' : 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })
    }

    getSubscription() : Observable<TCSubscription> {
        const retVal = this.tcHttp
            .get(this.subscriptionUrl, { headers : this.headers }).share()
            .map(response => {
                if(response.ok) {
                    const result = new TCSubscription(response.json())
                    return result
                }
                else {
                    return Observable.throw(response.json().error || 'Service error')
                }
            })
            .catch(err => this.handleError(err))

        retVal.first().subscribe(result => this.subscription.next(result))

        return retVal
    }

    purchaseSubscription(purchase : SubscriptionPurchase) : Observable<any> {
        return this.tcHttp
            .post(`${this.subscriptionUrl}/purchase`, JSON.stringify(purchase), { headers : this.headers }).share()
            .map(response => {
                if(response.ok) {
                    const result = {} // Whatever it is this API call will return
                    return 'It worked! WOOO'
                }
                else {
                    return Observable.throw(response.json().error || 'Service error')
                }
            })
            .catch(err => this.handleError(err))
    }

    getPurchaseHistory() : Observable<SubscriptionPurchaseHistoryItem[]> {
        return this.tcHttp
            .get(`${this.subscriptionUrl}/purchases`, { headers : this.headers })
            .share()
            .first()
            .map(response => {
                if (response.ok) {
                    return (response.json() as any[]).map(obj => new SubscriptionPurchaseHistoryItem(obj))
                }
                else {
                    return Observable.throw(response.json().error || 'Service error')
                }
            })
            .catch(err => this.handleError(err))
    }

    downgrade() : Observable<boolean> {
        return this.tcHttp
            .post(`${this.subscriptionUrl}/downgrade`, JSON.stringify({}), { headers : this.headers })
            .share()
            .first()
            .map(response => response.ok && response.json())
            .catch(err => this.handleError(err))
    }

    sendPaymentReceipt(item : SubscriptionPurchaseHistoryItem) {
        return this.tcHttp
            .post(`${this.subscriptionUrl}/purchases/${item.date.getTime() / 1000}/resend_receipt`, JSON.stringify({}), { headers : this.headers })
            .share()
            .first()
            .map(response => response.ok && response.json())
            .catch(err => this.handleError(err))
    }
}
