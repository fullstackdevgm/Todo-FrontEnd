import { Injectable }     from '@angular/core'
import { Headers, RequestOptions, Response, URLSearchParams }  from '@angular/http'
import { TCHttp } from  '../tc-http'
import { ListPublishInformation } from '../tc-utils'
import { environment } from '../../environments/environment'

import {Observable, ReplaySubject} from 'rxjs/Rx'
import 'rxjs/add/operator/map'

import { TCList, ListTaskCount } from '../classes/tc-list'
import { TCBaseService } from './tc-base.service'
import { TCAuthenticationService } from './tc-authentication.service'
import { TCErrorService } from './tc-error.service'

export type ListPublication = {lists: TCList[], info: ListPublishInformation[]}

@Injectable()
export class TCListService extends TCBaseService {
    private listUrl: string
    private headers: Headers

    public get lists() : Observable<ListPublication> {
        return this.listsSubject
    }
    private listsSubject : ReplaySubject<ListPublication>
    private _storedLists : TCList[]

    public get selectedList() : Observable<TCList> {
        return this._selectedList
    }
    private _selectedList : ReplaySubject<TCList> = new ReplaySubject<TCList>(1)

    constructor(
        private readonly authService : TCAuthenticationService,
        public tcHttp: TCHttp,
        public errService : TCErrorService
    ) {
        super(tcHttp, errService)
        this.headers = new Headers({
            'Content-Type' : 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })
        this.listUrl = `${environment.baseApiUrl}/lists`

        this.listsSubject = new ReplaySubject<ListPublication>(1)

        this.authService.authStateChanged.subscribe(() => {
            if (this.authService.isLoggedOut()) {
                this.listsSubject.complete()
                this._selectedList.complete()

                this.listsSubject = new ReplaySubject<ListPublication>(1)
                this._storedLists = []
                this._selectedList = new ReplaySubject<TCList>(1)
            }
        })
    }

    private publishLists(info : ListPublishInformation[] = [ListPublishInformation.None]) {
        this._storedLists.sort((a, b) => a.sortOrder - b.sortOrder )
        this.listsSubject.next({lists: this._storedLists, info: info})
    }

    selectList(list : TCList) {
        const listFromStore = this._storedLists.find(e => e.identifier == list.identifier)
        if (listFromStore) {
            this._selectedList.next(listFromStore)
        }
    }

    getLists(includeFiltered : boolean, includeDeleted : boolean, afterSync : boolean = false) : Observable<TCList[]>{
        let url = `${this.listUrl}`
        let params = new URLSearchParams()
        params.set(`includeFiltered`, includeFiltered.toString())
        params.set(`includeDeleted`, includeDeleted.toString())

        let options = new RequestOptions({
            search  : params,
            headers : this.headers
        })

        const result = this.tcHttp
            .get(url, options).share()
            .map(response => {
                if(!response.ok) return Observable.throw(response.json() || 'Service error')

                return response.json().map((listData : any) => new TCList(listData))
            })
            .catch(err => this.handleError(err))
            
        result.first().subscribe((resultLists : TCList[]) => {
            if (includeDeleted || includeFiltered) return
                
            this._storedLists = resultLists
            this.publishLists(afterSync ? [ListPublishInformation.AfterSync] : [ListPublishInformation.None])
        })

        return result
    }

    list(list : TCList) : Observable<TCList> {
        const url = `${this.listUrl}/${list.identifier}`
        const options = new RequestOptions({ headers : this.headers })

        return this.tcHttp
            .get(url, options).share()
            .map(response => {
                let success = response.ok
                if(success) {
                    return new TCList(response.json())
                }
                else {
                    return Observable.throw(response.json() || 'Service error')
                }
            })
            .catch(err => this.handleError(err))
    }

    create(list : TCList) : Observable<TCList> {
        const url = `${this.listUrl}`
        const options = new RequestOptions({ headers : this.headers })
        const body =  list.requestBody()

        const result = this.tcHttp
            .post(url, JSON.stringify(body), options).share()
            .map(response => {
                let success = response.ok
                if(success) {
                    return new TCList(response.json())
                }
                else {
                    return Observable.throw(response.json() || 'Service error')
                }
            })
            .catch(err => this.handleError(err))
        
        result.first().subscribe((savedList : TCList) => {
            this._storedLists.push(savedList)
            this.publishLists()
        })

        return result
    }

    update(list : TCList, info: ListPublishInformation[] = [ListPublishInformation.None]) : Observable<TCList> {
        const url = `${this.listUrl}/${list.identifier}`
        const options = new RequestOptions({ headers : this.headers })
        const body = list.requestBody()

        const result = this.tcHttp
            .put(url, JSON.stringify(body), options).share()
            .map(response => {
                let success = response.ok
                if(success) {
                    return new TCList(response.json())
                }
                else {
                    return Observable.throw(response.json() || 'Service error')
                }
            })
            .catch(err => this.handleError(err))

        result.first().subscribe(
            (updated : TCList) => {
                this._storedLists = this._storedLists.reduce((accum : TCList[], current : TCList) : TCList[] => {
                    accum.push(current.identifier == updated.identifier ? updated : current)
                    return accum
                }, [])
                this.publishLists(info)
            },
            err => {} // here so the error will be passed on to the UI component's subscription error handler
        )

        return result
    }

    delete(list : TCList) : Observable<{}> {
        const url = `${this.listUrl}/${list.identifier}`
        const options = new RequestOptions({ headers : this.headers })

        const result = this.tcHttp
            .delete(url, options)
            .share()
            .map(response => {
                return response.ok ? response.json() : Observable.throw(response.json().error || `Service error`)
            })
            .catch(err => this.handleError(err))
            
        result.first().subscribe(
            (deleted : TCList) => {
                this._storedLists = this._storedLists.filter((current : TCList) => current.identifier != list.identifier )
                this.publishLists([ListPublishInformation.ListDeleted])
            },
            err => {} // here so UI component's err will also get called
        )

        return result
    }
        
    getTaskCountForList(list : TCList) : Observable<ListTaskCount> {
        const url = `${this.listUrl}/${list.identifier}/count`
        const options = new RequestOptions({ headers : this.headers })

        const result = this.tcHttp
            .get(url, options).share().first()
            .map(response => {
                if (response.ok) {
                    return response.json()
                }
                else {
                    return Observable.throw(response.json() || 'Service error')
                }
            })
            .catch(err => this.handleError(err))

        return result
    }
}
