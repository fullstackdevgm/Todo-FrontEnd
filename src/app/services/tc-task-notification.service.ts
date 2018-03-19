import { Injectable }     from '@angular/core'
import { Headers, Http, RequestOptions, Response }  from '@angular/http'
import { environment } from '../../environments/environment'
import { Observable, ReplaySubject, Subject } from 'rxjs/Rx'
import 'rxjs/add/operator/map'

import { TCAuthenticationService } from './tc-authentication.service'
import { TCBaseService } from './tc-base.service'
import { TCErrorService } from './tc-error.service'
import { TCHttp } from '../tc-http'
import { TCTask } from '../classes/tc-task'
import { TCTaskNotification, OffsetTimes } from '../classes/tc-task-notification'

@Injectable()
export class TCTaskNotificationService extends TCBaseService {
    private readonly tasksUrl : string = `${environment.baseApiUrl}/tasks`
    private readonly taskNotificationsURL : string = `${environment.baseApiUrl}/notifications`
    private readonly headers : Headers

    private _currentTaskNotifications : ReplaySubject<TCTaskNotification[]>
    public readonly currentTaskNotifications : Observable<TCTaskNotification[]>

    private _updatedNotification : Subject<TCTaskNotification>
    public readonly updatedNotification : Observable<TCTaskNotification>

    private _createdNotification : Subject<TCTaskNotification>
    public readonly createdNotification : Observable<TCTaskNotification>

    private _deletedNotification : Subject<TCTaskNotification>
    public readonly deletedNotification : Observable<TCTaskNotification>

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

        this._currentTaskNotifications = new ReplaySubject<TCTaskNotification[]>(1)
        this._currentTaskNotifications.next([])
        this.currentTaskNotifications = this._currentTaskNotifications

        this._updatedNotification = new Subject<TCTaskNotification>()
        this.updatedNotification = this._updatedNotification

        this._createdNotification = new Subject<TCTaskNotification>()
        this.createdNotification = this._createdNotification

        this._deletedNotification = new Subject<TCTaskNotification>()
        this.deletedNotification = this._deletedNotification
    }

    notificationsForTask(task : TCTask) : Observable<TCTaskNotification[]> {
        const url = `${this.tasksUrl}/${task.identifier}/notifications`
        const options = new RequestOptions({ headers : this.headers })

        const result = this.tcHttp
            .get(url, options)
            .share()
            .map(response => {
                let success = response.ok
                if (success) {
                    return response.json().map((taskData : any) => new TCTaskNotification(taskData) )
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))

        result.first().subscribe(notifications => {
            this._currentTaskNotifications.next(notifications) 
        })

        return result
    }

    allNotifications() : Observable<TCTaskNotification[]> {
        const url = `${this.taskNotificationsURL}`
        const options = new RequestOptions({ headers : this.headers })

        const result = this.tcHttp
            .get(url, options)
            .share()
            .map(response => {
                let success = response.ok
                if (success) { 
                    return response.json().map((taskData : any) => new TCTaskNotification(taskData) )
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))

        return result
    }
    
    create(taskNotification : TCTaskNotification) : Observable<TCTaskNotification> {
        const url = `${this.taskNotificationsURL}`
        const options = new RequestOptions({ headers : this.headers })
        const result = this.tcHttp
            .post(url, JSON.stringify(taskNotification.requestBody()), options)
            .share()
            .map(response => {
                const success = response.ok
                if (success) { 
                    return new TCTaskNotification(response.json())
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))

        result.first().subscribe(notification => {
            this.currentTaskNotifications.first().subscribe(notifications => {
                notifications.push(notification)
                this._currentTaskNotifications.next(notifications)
            })

            this._createdNotification.next(notification)
        }) 

        return result
    }

    update(taskNotification : TCTaskNotification) : Observable<TCTaskNotification> {
        let url = `${this.taskNotificationsURL}/${taskNotification.identifier}`
        let options = new RequestOptions({ headers : this.headers })
        const result = this.tcHttp
            .put(url, JSON.stringify(taskNotification.requestBody()), options)
            .share()
            .map(response => {
                let success = response.ok
                if (success) { 
                    return new TCTaskNotification(response.json())
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))

        result.first().subscribe(notification => {
            this.currentTaskNotifications.first().subscribe(notifications => {
                const noteToUpdate = notifications.find(n => n.identifier == notification.identifier)
                for (const val in notification) Object.assign(noteToUpdate, notification)
                this._currentTaskNotifications.next(notifications)
            })

            this._updatedNotification.next(notification)
        })

        return result
    }

    delete(taskNotification : TCTaskNotification) : Observable<{}> {
        let url = `${this.taskNotificationsURL}/${taskNotification.identifier}`
        let options = new RequestOptions({ headers : this.headers })
        const result = this.tcHttp
            .delete(url, options)
            .share()
            .map(response => {
                let success = response.ok
                if (success) { 
                    return new TCTaskNotification(response.json())
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))

        result.first().subscribe(deleted => {
            this.currentTaskNotifications.first().subscribe(notifications => {
                this._currentTaskNotifications.next(notifications.filter(notification => notification.identifier != taskNotification.identifier ))
            })

            this._deletedNotification.next(taskNotification)
        })

        return result
    }
}

