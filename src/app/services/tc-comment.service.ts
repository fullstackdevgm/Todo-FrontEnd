import { Injectable } from '@angular/core'
import { Headers, RequestOptions, Response, URLSearchParams }  from '@angular/http'
import { TCHttp } from  '../tc-http'
import { environment } from '../../environments/environment'

import { Observable, ReplaySubject } from 'rxjs/Rx'
import { TCAccountService } from './tc-account.service'
import 'rxjs/add/operator/map'

import { TCComment } from '../classes/tc-comment'
import { TCAccount } from '../classes/tc-account'
import { TCTask } from '../classes/tc-task'
import { TCList } from '../classes/tc-list'
import { TCBaseService } from './tc-base.service'
import { TCErrorService } from './tc-error.service'

export interface CommentWithUser {
    comment : TCComment,
    user : TCAccount
}

@Injectable()
export class TCCommentService extends TCBaseService {
    private commentUrl: string
    private taskUrl : string
    private headers : Headers
    private account : TCAccount

    constructor(
        tcHttp: TCHttp,
        errService : TCErrorService,
        private accountService : TCAccountService
    ) {
        super(tcHttp, errService)
        this.headers = new Headers({
            'Content-Type' : 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })
        this.commentUrl = `${environment.baseApiUrl}/comments`
        this.taskUrl = `${environment.baseApiUrl}/tasks`

        this.accountService.account.subscribe(account => {
            this.account = account
        })
    }

    commentsForTask(task : TCTask, includeUser : boolean = true) : Observable<CommentWithUser[]> {
        const url = `${this.taskUrl}/${task.identifier}/comments`
        const options = { headers : this.headers }
        return this.tcHttp
            .get(url, options)
            .map(response => {
                let success = response.ok
                if(success) {
                    return response.json().map((commentData : any) => {
                        return {
                            comment : new TCComment(commentData.comment),
                            user : includeUser ? new TCAccount(commentData.user) : undefined
                        }
                    })
                }
                else {
                    return Observable.throw(response.json() || 'Service error')
                }
            }) 
            .catch(err => this.handleError(err))
    }

    create(comment : TCComment) : Observable<TCComment> {
        const url = `${this.commentUrl}`
        const options = { headers : this.headers }
        return this.tcHttp
            .post(url, JSON.stringify(comment.requestBody()), options)
            .map(response => {
                let success = response.ok
                if(success) {
                    return new TCComment(response.json())
                }
                else {
                    return Observable.throw(response.json() || 'Service error')
                }
            }) 
            .catch(err => this.handleError(err))
    }

    get(comment : TCComment) : Observable<TCComment> {
        const url = `${this.commentUrl}/${comment.identifier}`
        const options = { headers : this.headers }
        return this.tcHttp
            .get(url, options)
            .map(response => {
                let success = response.ok
                if(success) {
                    return new TCComment(response.json())
                }
                else {
                    return Observable.throw(response.json() || 'Service error')
                }
            }) 
            .catch(err => this.handleError(err))
    }

    update(comment : TCComment) : Observable<TCComment>{
        const url = `${this.commentUrl}/${comment.identifier}`
        const options = { headers : this.headers }
        return this.tcHttp
            .put(url, JSON.stringify(comment.requestBody()), options)
            .map(response => {
                let success = response.ok
                if(success) {
                    return new TCComment(response.json())
                }
                else {
                    return Observable.throw(response.json() || 'Service error')
                }
            }) 
            .catch(err => this.handleError(err))
    }

    delete(comment : TCComment) : Observable<TCComment>{
        const url = `${this.commentUrl}/${comment.identifier}`
        const options = { headers : this.headers }
        return this.tcHttp
            .delete(url, options)
            .map(response => {
                let success = response.ok
                if(success) {
                    return new TCComment(response.json())
                }
                else {
                    return Observable.throw(response.json() || 'Service error')
                }
            }) 
            .catch(err => this.handleError(err))
    }
}
