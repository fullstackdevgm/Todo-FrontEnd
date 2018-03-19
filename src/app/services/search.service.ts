import { Injectable }     from '@angular/core'
import { Headers, RequestOptions, Response, URLSearchParams }  from '@angular/http'
import { TCHttp } from  '../tc-http'
import { environment } from '../../environments/environment'

import {Observable, Subject} from 'rxjs/Rx'
import 'rxjs/add/operator/map'

import { TCTaskService } from './tc-task.service'
import { TCTask } from '../classes/tc-task'

@Injectable()
export class SearchService  {

    private readonly _searchBegan : Subject<string> = new Subject<string>()
    public get searchBegan() : Observable<string> {
        return this._searchBegan
    }

    constructor(
        private readonly taskService : TCTaskService
    ) {}

    search(term : string) {
        this._searchBegan.next(term)
    }
}
