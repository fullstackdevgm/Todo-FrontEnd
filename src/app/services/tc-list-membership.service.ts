import { Injectable } from '@angular/core'
import { Headers, RequestOptions, Response }  from '@angular/http'
import { environment } from '../../environments/environment'
import { Observable, Subject, ReplaySubject } from 'rxjs/Rx'
import 'rxjs/add/operator/map'

import { TCBaseService } from './tc-base.service'
import { TCErrorService } from './tc-error.service'
import { TCAuthenticationService } from './tc-authentication.service'
import { TCHttp } from '../tc-http'

import { TCListMembership } from '../classes/tc-list-membership'
import { TCList } from '../classes/tc-list'
import { TCAccount } from '../classes/tc-account'
import { ListMembershipType } from '../tc-utils'
import { ListMemberAccountInfo} from '../tc-types'

@Injectable()
export class TCListMembershipService extends TCBaseService {
    private readonly listMemberURL : string = `${environment.baseApiUrl}/list-member`
    private readonly listUrl: string = `${environment.baseApiUrl}/list`
    private readonly headers : Headers

    private _sharedUserAccounts : ReplaySubject<TCAccount[]> = new ReplaySubject<TCAccount[]>(1)
    get sharedUserAccounts() : Observable<TCAccount[]> {
        return this._sharedUserAccounts
    }

    constructor(
        public tcHttp : TCHttp,
        public errService : TCErrorService,
        private readonly authService : TCAuthenticationService
    ) {
        super(tcHttp, errService)

        this._sharedUserAccounts.next([])

        this.authService.authStateChanged
            .filter(stateChanged => this.authService.isLoggedOut())
            .subscribe(stateChanged => {
                this._sharedUserAccounts.next([])
            })

        this.headers = new Headers({
            'Content-Type': 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })
    }

    getMembersForListID(listid : string) : Observable<ListMemberAccountInfo[]> {
        return this.tcHttp
            .get(`${this.listUrl}/${listid}/members`, { headers : this.headers }).share().first()
            .map(response => {
                if (!response.ok) return Observable.throw(response.json().error || 'Service error') 
                return response.json().map((membershipData : any) => {
                    return {
                        membership : new TCListMembership(membershipData.membership),
                        account : new TCAccount(membershipData.account)
                    }
                })
            })
            .catch(err => this.handleError(err))
    }

    getMembersForList(list : TCList) : Observable<ListMemberAccountInfo[]> {
        return this.getMembersForListID(list.identifier)
    }

    getAllSharedListMembers() : Observable<TCAccount[]> {
        const result = this.tcHttp
            .get(`${this.listMemberURL}`, { headers : this.headers })
            .share().first()
            .map(response => {
                if (!response.ok) return Observable.throw(response.json().error || 'Service error') 
                return response.json().map(account => new TCAccount(account))
            })
            .catch(err => this.handleError(err))

        result.subscribe(accounts => {
            this._sharedUserAccounts.next(accounts)
        })

        return result
    }

    changeRole(membership : TCListMembership, role : ListMembershipType) : Observable<{ success : boolean }> {
        const body = { listid : membership.listId, role : role }
        return this.tcHttp
            .put(`${this.listMemberURL}/${membership.userId}/role`, JSON.stringify(body), { headers : this.headers })
            .share().first()
            .map(response => {
                if (!response.ok) return Observable.throw(response.json().error || 'Service error') 
                return response.json()
            })
            .catch(err => this.handleError(err))
    }

    removeMember(membership : TCListMembership) : Observable<any> {
        return this.tcHttp
            .delete(`${this.listMemberURL}/${membership.userId}/remove/${membership.listId}`, { headers : this.headers })
            .share().first()
            .map(response => {
                if (!response.ok) return Observable.throw(response.json().error || 'Service error')
                return response.json()
            })
            .catch(err => this.handleError(err))
    }

    getlistMemberCounts() : Observable<{ listid : string, count: number }[]> {
        return this.tcHttp
            .get(`${this.listMemberURL}/counts`, { headers : this.headers })
            .share().first()
            .map(response => {
                if (!response.ok) return Observable.throw(response.json().error || 'Service error') 
                return response.json()
            })
            .catch(err => this.handleError(err)) 
    }
}