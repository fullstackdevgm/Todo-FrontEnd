import { Injectable }     from '@angular/core'
import { Headers, Http, RequestOptions, Response, URLSearchParams }  from '@angular/http'
import { environment } from '../../environments/environment'
import { Observable, ReplaySubject } from 'rxjs/Rx'
import 'rxjs/add/operator/map'

import { TCAuthenticationService } from './tc-authentication.service'
import { TCBaseService } from './tc-base.service'
import { TCErrorService } from './tc-error.service'
import { TCHttp } from '../tc-http'
import { TCTaskito } from '../classes/tc-taskito'
import { TCTask } from '../classes/tc-task'
import { TCList } from '../classes/tc-list'

@Injectable()
export class TCTaskitoService extends TCBaseService {
    private readonly checklistUrl : string = `${environment.baseApiUrl}/checklist`
    private readonly tasksUrl     : string = `${environment.baseApiUrl}/tasks`
    private readonly taskitosUrl  : string = `${this.checklistUrl}/items`
    private readonly headers : Headers

    constructor(
        private auth: TCAuthenticationService,
        public tcHttp : TCHttp,
        public errService : TCErrorService
    ) {
        super(tcHttp, errService)

        this.headers = new Headers({
            'Content-Type': 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })
    }

    itemsForChecklist(checklist : TCTask, page : number = 0, completed : boolean = false) : Observable<TCTaskito[]> {
        const url = `${this.checklistUrl}/${checklist.identifier}/items`
        const params = new URLSearchParams()
        params.set('completed_only', completed.toString())
        const result =  this.tcHttp
            .get(url, { headers: this.headers, search : params })
            .share()
            .map(response => {
                if (response.ok) {
                    return response.json().map((taskitoData : any) => new TCTaskito(taskitoData) )
                }
                else { 
                    return Observable.throw(response.json().error || 'Service error') 
                }
            })
            .catch(err => this.handleError(err))

        return result
    }

    get(taskito : TCTaskito) : Observable<TCTaskito>{
        const url = `${this.tasksUrl}/${taskito.identifier}`
        const options = new RequestOptions({ headers : this.headers })
        return this.tcHttp
            .get(url, options)
            .map(response => {
                const success = response.ok
                if (success) { 
                    return new TCTaskito(response.json())
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))
    }

    create(taskito : TCTaskito) : Observable<TCTaskito> {
        const url = `${this.taskitosUrl}`
        const options = new RequestOptions({ headers : this.headers })
        const result =  this.tcHttp
            .post(url, JSON.stringify(taskito.requestBody()), options)
            .map(response => {
                const success = response.ok
                if (success) { 
                    return new TCTaskito(response.json())
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))

        return result

        // const mock = new ReplaySubject<TCTaskito>(1)
        // const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        //     var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        //     return v.toString(16);
        // });
        // mock.next(new TCTaskito(Object.assign(taskito.requestBody(), { taskitoid : uuid, sort_order : 0 })))
        // return mock
    }

    update(taskito : TCTaskito) : Observable<TCTaskito> {
        let url = `${this.taskitosUrl}/${taskito.identifier}`
        let options = new RequestOptions({ headers : this.headers })
        return this.tcHttp
            .put(url, JSON.stringify(taskito.requestBody()), options)
            .map(response => {
                let success = response.ok
                if (success) { 
                    return new TCTaskito(response.json())
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))
    }

    complete(taskitos : TCTaskito[]) : Observable<string[]> {
        let url = `${this.taskitosUrl}/complete`
        let options = new RequestOptions({ headers : this.headers })
        return this.tcHttp
            .post(url, JSON.stringify({ items : taskitos.map(t => t.identifier) }), options)
            .map(response => {
                let success = response.ok
                if (success) { 
                    return response.json().items
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))
    }

    uncomplete(taskitos : TCTaskito[]) : Observable<string[]> {
        let url = `${this.taskitosUrl}/uncomplete`
        let options = new RequestOptions({ headers : this.headers })
        return this.tcHttp
            .post(url, JSON.stringify({ items : taskitos.map(t => t.identifier) }), options)
            .map(response => {
                let success = response.ok
                if (success) { 
                    return response.json().items
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))
    }

    delete(taskito : TCTaskito) : Observable<{}> {
        let url = `${this.taskitosUrl}/${taskito.identifier}`
        let options = new RequestOptions({ headers : this.headers })
        return this.tcHttp
            .delete(url, options)
            .map(response => {
            let success = response.ok
            if (success) { 
                return new TCTaskito(response.json())
            }
            else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))
    }
}
