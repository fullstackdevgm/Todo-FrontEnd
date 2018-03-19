import { Injectable }     from '@angular/core'
import { Headers, Http, RequestOptions, Response, URLSearchParams }  from '@angular/http'
import { environment } from '../../environments/environment'
import { Observable, ReplaySubject, Subject } from 'rxjs/Rx'
import 'rxjs/add/operator/map'
import * as moment from 'moment'

import { TCAuthenticationService } from './tc-authentication.service'
import { TCBaseService } from './tc-base.service'
import { TCErrorService } from './tc-error.service'
import { CalendarService } from './calendar.service'
import { TCHttp } from '../tc-http'
import { TCTask } from '../classes/tc-task'
import { TCList } from '../classes/tc-list'
import { TCSmartList } from '../classes/tc-smart-list'

import { Utils } from '../tc-utils'

export interface CompleteTasksResponse {
    // Ids of tasks that were completed by this call.
    completedTaskIDs : string[],

    // New task objects created to indicate the completed repeating tasks.
    newTasks : TCTask[],

    // Repeating task objects, returned with updated due dates
    repeatedTasks : TCTask[]
}

export interface TaskParsingResults {
    parsed_tags? : string[],
    parsed_subtasks : string[],
    parsed_taskitos : string[]
}

type TaskCount = {
    listid: string,
    active: number,
    completed: number,
    overdue: number
}

export type AllListsTaskCount = {
    listTaskCounts : TaskCount[],
    smartListTaskCounts : TaskCount[]
}

@Injectable()
export class TCTaskService extends TCBaseService {
    
    private readonly tasksUrl     : string = `${environment.baseApiUrl}/tasks`
    private readonly taskitosUrl  : string = `${environment.baseApiUrl}/taskitos`
    private readonly listUrl      : string = `${environment.baseApiUrl}/lists`
    private readonly smartListUrl : string = `${environment.baseApiUrl}/smart-lists`
    private readonly headers : Headers
    private selectedDates : Date[] = []

    public readonly willLoadTasksForList : Observable<{list : TCList | TCSmartList, page : number }>
    private _willLoadTasksForList : Subject<{list : TCList | TCSmartList, page : number }>

    public readonly taskSelected : Observable<TCTask>
    private _taskSelected : Subject<TCTask>

    private _taskCounts : Subject<AllListsTaskCount>
    public get taskCounts() : Observable<AllListsTaskCount> {
        return this._taskCounts
    }

    private _taskDeleted : Subject<TCTask>
    public get taskDeleted() : Observable<TCTask> {
        return this._taskDeleted
    }

    constructor(
        private auth: TCAuthenticationService,
        public tcHttp : TCHttp,
        public errService : TCErrorService,
        private readonly calendarService : CalendarService
    ) {
        super(tcHttp, errService)

        this._willLoadTasksForList = new Subject<{list : TCList, page : number }>()
        this.willLoadTasksForList = this._willLoadTasksForList

        this._taskSelected = new Subject<TCTask>()
        this.taskSelected = this._taskSelected
        this._taskDeleted = new Subject<TCTask>()

        this._taskCounts = new ReplaySubject<AllListsTaskCount>(1)

        this.calendarService.selectedDates.subscribe(dates => {
            this.selectedDates = dates
            this.getTaskCounts()
        })

        this.headers = new Headers({
            'Content-Type': 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })
    }

    selectTask(task : TCTask) {
        this._taskSelected.next(task)
    }

    private loadTasksForList(list : TCList, page : number, pageSize : number, completed : boolean) : Observable<TCTask[]> {
        this._willLoadTasksForList.next({list : list, page : page})

        const url = `${this.listUrl}/${list.identifier}/tasks`
        
        let params = new URLSearchParams()
        params.set(`page`, page.toString())
        params.set(`completed_only`, completed.toString())
        params.set(`page_size`, pageSize.toString())
        const options = new RequestOptions({ 
            headers : this.headers,
            search  : params
         })

        const result = this.tcHttp
            .get(url, options)
            .share()
            .map(response => {
                let success = response.ok
                if (success) { 
                    return response.json().tasks.map((taskData : any) => new TCTask(taskData) )
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))

        return result
    }

    tasksForList(list : TCList, page : number = 0, pageSize : number = 20) : Observable<TCTask[]> {
        return this.loadTasksForList(list, page, pageSize, false)
    }

    completedTasksForList(list : TCList, page : number = 0, pageSize : number = 20) : Observable<TCTask[]> {
        return this.loadTasksForList(list, page, pageSize, true)
    }
    
    private loadTasksForSmartList(smartList : TCSmartList, page : number, pageSize : number, completed : boolean) : Observable<TCTask[]> {
        this._willLoadTasksForList.next({list : smartList, page : page})

        const url = `${this.smartListUrl}/${smartList.identifier}/tasks`
        
        let params = new URLSearchParams()
        params.set(`page`, page.toString())
        params.set(`completed_only`, completed.toString())
        params.set(`page_size`, pageSize.toString())
        const options = new RequestOptions({ 
            headers : this.headers,
            search  : params
         })

        const result = this.tcHttp
            .get(url, options)
            .share()
            .map(response => {
                let success = response.ok
                if (success) { 
                    return response.json().tasks.map((taskData : any) => new TCTask(taskData) )
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))

        return result
    }

    tasksForSmartList(smartList : TCSmartList, page : number = 0, pageSize : number = 20) : Observable<TCTask[]> {
        return this.loadTasksForSmartList(smartList, page, pageSize, false)
    }

    completedTasksForSmartList(smartList : TCSmartList, page : number = 0, pageSize : number = 20) : Observable<TCTask[]> {
        return this.loadTasksForSmartList(smartList, page, pageSize, true)
    }

    private loadSubtasksForProject(parentTask : TCTask, page : number, pageSize : number, completed : boolean) : Observable<TCTask[]> {
        const url = `${this.tasksUrl}/${parentTask.identifier}/subtasks`
        
        let params = new URLSearchParams()
        params.set(`page`, page.toString())
        params.set(`completed_only`, completed.toString())
        params.set(`page_size`, pageSize.toString())
        const options = new RequestOptions({ 
            headers : this.headers,
            search  : params
         })

        const result = this.tcHttp
            .get(url, options)
            .share()
            .map(response => {
                let success = response.ok
                if (success) { 
                    return response.json().tasks.map((taskData : any) => new TCTask(taskData) )
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))
        
        return result
    }

    subtasksForProject(parentTask : TCTask, page : number = 0, pageSize : number = 20) : Observable<TCTask[]> {
        return this.loadSubtasksForProject(parentTask, page, pageSize, false)
    }

    completedSubtasksForProject(parentTask : TCTask, page : number = 0, pageSize : number = 20) : Observable<TCTask[]> {
        return this.loadSubtasksForProject(parentTask, page, pageSize, true)
    }

    completeTask(task : TCTask) : Observable<CompleteTasksResponse> {
        return this.completeTasks([task])
    }

    completeTasks(tasks : TCTask[]) : Observable<CompleteTasksResponse> {
        const url = `${this.tasksUrl}/complete`
        const options = new RequestOptions({ headers : this.headers })
        const result = this.tcHttp
            .post(url, JSON.stringify({ tasks : tasks.map(e => e.identifier) }), options).share().first()
            .map(response => {
                if (response.ok) {
                    const responseObject = response.json()
                    return {
                        newTasks        : responseObject.newTasks.map(taskData => new TCTask(taskData)),
                        repeatedTasks   : responseObject.repeatedTasks.map(taskData => new TCTask(taskData)),
                        completedTaskIDs : responseObject.completedTaskIDs
                    }
                }
                else {
                    return Observable.throw(response.json().error || 'Service error')
                }
            })
            .catch(err => this.handleError(err))

        result.subscribe(response => {
            this.getTaskCounts()
            this.calendarService.loadCalendarDates()
        })

        return result
    }

    uncompleteTask(task : TCTask) : Observable<CompleteTasksResponse> {
        const url = `${this.tasksUrl}/uncomplete`
        const options = new RequestOptions({ headers : this.headers })
        const result = this.tcHttp
            .post(url, JSON.stringify({ tasks : [task.identifier] }), options).share().first()
            .map(response => {
                if (response.ok) {
                    const responseObject = response.json()
                    return {
                        newTasks        : responseObject.newTasks.map(taskData => new TCTask(taskData)),
                        repeatedTasks   : responseObject.repeatedTasks.map(taskData => new TCTask(taskData)),
                        completedTaskIDs : responseObject.completedTaskIDs
                    }
                }
                else {
                    return Observable.throw(response.json().error || 'Service error')
                }
            })
            .catch(err => this.handleError(err))

        result.subscribe(response => {
            this.getTaskCounts()
            this.calendarService.loadCalendarDates()
        })

        return result
    }

    taskForId(identifier : string) : Observable<TCTask>{
        const url = `${this.tasksUrl}/${identifier}`
        const options = new RequestOptions({ headers : this.headers })
        return this.tcHttp
            .get(url, options)
            .map(response => {
                const success = response.ok
                if (success) { 
                    return new TCTask(response.json())
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))
    }
    
    create(task : TCTask, parsingResults? : TaskParsingResults) : Observable<TCTask> {
        const url = `${this.tasksUrl}`
        
        let requestBody = task.requestBody()
        if (parsingResults) {
            // Add on the extra parameters that may have been
            // found by task parsing. The three different things
            // we'll send (as String arrays) are:
            // parsed_tags, parsed_taskitos, and/or parsed_subtasks
            Object.keys(parsingResults).forEach(key => {
                requestBody[key] = parsingResults[key]
            })
        }
        const options = new RequestOptions({ headers : this.headers })
        const result = this.tcHttp
            .post(url, JSON.stringify(requestBody), options).share().first()
            .map(response => {
                const success = response.ok
                if (success) { 
                    return new TCTask(response.json())
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))

        result.subscribe(newTask => {
            this.getTaskCounts()
            this.calendarService.loadCalendarDates()
        })

        return result
    }

    update(task : TCTask) : Observable<TCTask> {
        let url = `${this.tasksUrl}/${task.identifier}`
        let options = new RequestOptions({ headers : this.headers })
        const requestBody = task.requestBody()
        delete requestBody.completiondate

        const result = this.tcHttp
            .put(url, JSON.stringify(requestBody), options).share().first()
            .map(response => {
                let success = response.ok
                if (success) { 
                    return new TCTask(response.json())
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))

        result.subscribe(updated => {
            this.getTaskCounts()
            this.calendarService.loadCalendarDates()
        })

        return result
    }

    delete(task : TCTask) : Observable<{}> {
        let url = `${this.tasksUrl}/${task.identifier}`
        let options = new RequestOptions({ headers : this.headers })
        const result = this.tcHttp
            .delete(url, options).share().first()
            .map(response => {
            let success = response.ok
            if (success) { 
                return new TCTask(response.json())
            }
            else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))

        result.subscribe(result => {
            this._taskDeleted.next(task)
            this.calendarService.loadCalendarDates()
        })

        return result
    }

    getTaskCounts() : Observable<AllListsTaskCount> {
        const url = `${this.tasksUrl}/count`
        const searchParams : URLSearchParams = new URLSearchParams()
        if (this.selectedDates.length > 0) {
            searchParams.set(
                'selected_dates', 
                this.selectedDates
                    .map(date => moment(date).format('YYYY-MM-DD'))
                    .reduce((accum, current) => accum ? `${accum},${current}` : current)
            )
        }
        const options = new RequestOptions({ headers : this.headers, search : searchParams })

        const result = this.tcHttp
            .get(url, options).share().first()
            .map(response => {
                if(response.ok) {
                    const obj = response.json()
                    return {
                        listTaskCounts : obj.lists,
                        smartListTaskCounts : obj.smart_lists
                    }
                }
                else {
                    return Observable.throw(response.json() || 'Service error')
                }
            })
            .catch(err => this.handleError(err))

        result.subscribe(counts => {
            this._taskCounts.next(counts)
        })

        return result
    }

    getSubtaskCount(parent : TCTask) : Observable<{count : number}> {
        const url = `${this.tasksUrl}/${parent.identifier}/count`
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

    searchTasks(searchTerm : string, page : number = 0, pageSize : number = 20, completed : boolean = false) : Observable<TCTask[]> {
        const url = `${this.tasksUrl}/search`
        
        let params = new URLSearchParams()
        params.set(`page`, page.toString())
        params.set(`completed_only`, completed.toString())
        params.set(`page_size`, pageSize.toString())
        params.set(`search_text`, searchTerm)
        const options = new RequestOptions({ 
            headers : this.headers,
            search  : params
         })

        const result = this.tcHttp
            .get(url, options)
            .share()
            .map(response => {
                let success = response.ok
                if (success) { 
                    return response.json().tasks.map((taskData : any) => new TCTask(taskData) )
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))

        return result
    }
}
