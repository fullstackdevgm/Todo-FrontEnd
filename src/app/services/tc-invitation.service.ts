import { Injectable } from '@angular/core'
import { Headers, RequestOptions, Response, Http }  from '@angular/http'
import { environment } from '../../environments/environment'
import { Observable, ReplaySubject } from 'rxjs/Rx'
import 'rxjs/add/operator/map'

import { TCBaseService } from './tc-base.service'
import { TCErrorService } from './tc-error.service'
import { TCHttp } from '../tc-http'

import { TCInvitation } from '../classes/tc-invitation'
import { TCList } from '../classes/tc-list'
import { ListMembershipType } from '../tc-utils'
import { InvitationInfo } from '../tc-types'
import { TCAccount } from "../classes/tc-account";

@Injectable()
export class TCInvitationService extends TCBaseService {
    private readonly invitationUrl : string = `${environment.baseApiUrl}/invitations`
    private readonly listsUrl : string = `${environment.baseApiUrl}/lists`
    private readonly headers : Headers

    constructor(
        public http : Http,
        public tcHttp : TCHttp,
        public errService : TCErrorService
    ) {
        super(tcHttp, errService)

        this.headers = new Headers({
            'Content-Type': 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })
    }

    sendInvitation(invitation : TCInvitation) : Observable<TCInvitation> {
        return this.tcHttp
            .post(`${this.invitationUrl}`, JSON.stringify(invitation), { headers : this.headers})
            .share().first()
            .map(response => {
                if(!response.ok) return Observable.throw(response.json().error || 'Service error') 
                return new TCInvitation(response.json())
            })
            .catch(err => this.handleError(err))
    }

    resendInvitation(invitation : TCInvitation) : Observable<{success : boolean}> {
        if (!invitation.identifier) {
            const missingIdSubject = new ReplaySubject<{success : boolean}>(1)
            missingIdSubject.error(new Error('Invitation does not have an identifier'))
            return missingIdSubject
        }

        return this.tcHttp
            .put(`${this.invitationUrl}/${invitation.identifier}/resend`, JSON.stringify({}), { headers : this.headers })
            .share().first()
            .map(response => {
                if (!response.ok) return Observable.throw(response.json().error || 'Service error') 
                return response.json()
            })
            .catch(err => this.handleError(err))
    }

    acceptInvitation(invitation : TCInvitation) : Observable<{success : boolean}> {
        if (!invitation.identifier) {
            const missingIdSubject = new ReplaySubject<{success : boolean}>(1)
            missingIdSubject.error(new Error('Invitation does not have an identifier'))
            return missingIdSubject
        }

        return this.tcHttp
            .post(`${this.invitationUrl}/${invitation.identifier}`, JSON.stringify({}), { headers : this.headers })
            .share().first()
            .map(response => {
                if (!response.ok) return Observable.throw(response.json().error || 'Service error') 
                return response.json()
            })
            .catch(err => this.handleError(err))
    }

    deleteInvitation(invitation : TCInvitation) : Observable<any> {
        if (!invitation.identifier) {
            const missingIdSubject = new ReplaySubject<{success : boolean}>(1)
            missingIdSubject.error(new Error('Invitation does not have an identifier'))
            return missingIdSubject
        }

        return this.tcHttp
            .delete(`${this.invitationUrl}/${invitation.identifier}`, { headers : this.headers })
            .share().first()
            .map(response => {
                if (!response.ok) return Observable.throw(response.json().error || 'Service error') 
                return response.json()
            })
            .catch(err => this.handleError(err))
    }

    getInvitationInfoForID(invitationId : string) : Observable<InvitationInfo> {
        return this.http
            .get(`${this.invitationUrl}/${invitationId}`, { headers : this.headers })
            .share().first()
            .map(response => {
                if (!response.ok) return Observable.throw(response.json().error || 'Service error') 
                const obj = response.json()
                return {
                    invitation : new TCInvitation(obj.invitation),
                    account    : new TCAccount(obj.account),
                    list       : new TCList({list: obj.list})
                }
            })
            .catch(err => this.handleError(err))
    }

    getInvitationInfo(invitation : TCInvitation) : Observable<InvitationInfo> {
        return this.getInvitationInfoForID(invitation.identifier)
    }

    getInvitations() : Observable<InvitationInfo[]>{
        return this.tcHttp
            .get(`${this.invitationUrl}`, { headers : this.headers })
            .share().first()
            .map(response => {
                if (!response.ok) return Observable.throw(response.json().error || 'Service error') 
                const data = response.json()
                return data.infos.map(info => { 
                    return {
                        invitation : new TCInvitation(info.invitation),
                        account    : new TCAccount(info.account),
                        list       : new TCList({list: info.list})
                    }
                })
            })
            .catch(err => this.handleError(err))
    }

    getInvitationsForList(list : TCList) : Observable<TCInvitation[]>{
        return this.tcHttp
            .get(`${this.listsUrl}/${list.identifier}/invitations`, { headers : this.headers })
            .share().first()
            .map(response => {
                if (!response.ok) return Observable.throw(response.json().error || 'Service error') 
                return response.json().map(invitation => new TCInvitation(invitation))
            })
            .catch(err => this.handleError(err))
    }

    updateInvitationRole(invitation : TCInvitation, role : ListMembershipType) : Observable<TCInvitation> {
        if (!invitation.identifier) {
            const missingIdSubject = new ReplaySubject<TCInvitation>(1)
            missingIdSubject.error(new Error('Invitation does not have an identifier'))
            return missingIdSubject
        }

        const body = { invitationid : invitation.identifier, membership_type : role }

        return this.tcHttp
            .put(`${this.invitationUrl}/${invitation.identifier}`, JSON.stringify(body), {headers : this.headers})
            .share().first()
            .map(response => {
                if (!response.ok) return Observable.throw(response.json().err || 'Service error')
                return new TCInvitation(response.json())
            })
            .catch(err => this.handleError(err))
    }
}