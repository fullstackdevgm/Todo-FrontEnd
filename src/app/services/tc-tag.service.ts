import { Injectable }     from '@angular/core'
import { Headers, Http, RequestOptions, Response }  from '@angular/http'
import { environment } from '../../environments/environment'
import { Observable, ReplaySubject } from 'rxjs/Rx'
import 'rxjs/add/operator/map'

import { TCBaseService } from './tc-base.service'
import { TCErrorService } from './tc-error.service'
import { TCHttp } from '../tc-http'
import { TCTag, TCTagAssignment } from '../classes/tc-tag'
import { TCTask } from '../classes/tc-task'

@Injectable()
export class TCTagService extends TCBaseService {
    private readonly tagsUrl : string = `${environment.baseApiUrl}/tags`
    private readonly tasksUrl: string = `${environment.baseApiUrl}/tasks`
    private readonly headers : Headers

    constructor(
        public tcHttp : TCHttp,
        public errService : TCErrorService
    ) {
        super(tcHttp, errService)

        this.headers = new Headers({
            'Content-Type': 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })
    }

    tagsForTask(task : TCTask) : Observable<TCTag[]> {
        const url = `${this.tasksUrl}/${task.identifier}/tags`
        const result = this.tcHttp
            .get(url, { headers: this.headers })
            .map(response => {
                if (response.ok) {
                    return response.json().map((tagData : any) => new TCTag(tagData.tagid, tagData.name) )
                }
                else { 
                    return Observable.throw(response.json().error || 'Service error') 
                }
            })
            .catch(err => { 
                console.log(err)
                return this.handleError(err) 
            })

        return result
    }

    tagsForUser() : Observable<{tag : TCTag, count : number}[]>{
        const url = `${this.tagsUrl}`
        const result = this.tcHttp
            .get(url, { headers: this.headers })
            .map(response => {
                if (response.ok) {
                    return response.json().map((tagData : any) => {
                        return {
                            tag : new TCTag(tagData.tagid, tagData.name), 
                            count : tagData.count ? tagData.count : 0
                        }
                    })
                }
                else { 
                    return Observable.throw(response.json().error || 'Service error') 
                }
            })
            .catch(err => { 
                console.log(err)
                return this.handleError(err) 
            })
        return result
    }

    tagForId(identifier : string) : Observable<TCTag> {
        const url = `${this.tagsUrl}/${identifier}`
        const options = new RequestOptions({ headers : this.headers })
        return this.tcHttp
            .get(url, options)
            .map(response => {
                const success = response.ok
                if (success) {
                    const tagData = response.json()
                    return new TCTag(tagData.tagid, tagData.name)
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))
    }

    addTagAssignment(assignment : TCTagAssignment) : Observable<TCTag> {
        const url = `${this.tasksUrl}/${assignment.taskid}/tags/${assignment.tagid}`
        const options = new RequestOptions({ headers : this.headers })
        return this.tcHttp
            .post(url, JSON.stringify({}), options)
            .map(response => {
                const success = response.ok
                if (success) { 
                    const tagData = response.json()
                    return new TCTag(tagData.tagid, tagData.name)
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))
    }

    removeTagAssignment(assignment : TCTagAssignment) : Observable<any> {
        const url = `${this.tasksUrl}/${assignment.taskid}/tags/${assignment.tagid}`
        const options = new RequestOptions({ headers : this.headers })
        return this.tcHttp
            .delete(url, options)
            .map(response => {
                const success = response.ok
                if (success) { 
                    return response.json()
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))
    }

    create(tag : TCTag) : Observable<TCTag> {
        const url = `${this.tagsUrl}`
        const options = new RequestOptions({ headers : this.headers })
        return this.tcHttp
            .post(url, JSON.stringify(tag), options).share().first()
            .map(response => {
                const success = response.ok
                if (success) { 
                    const tagData = response.json()
                    return new TCTag(tagData.tagid, tagData.name)
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))
    }

    update(tag : TCTag) : Observable<TCTag> {
        let url = `${this.tagsUrl}/${tag.identifier}`
        let options = new RequestOptions({ headers : this.headers })
        return this.tcHttp
            .put(url, JSON.stringify(tag), options)
            .map(response => {
                let success = response.ok
                if (success) { 
                    const tagData = response.json()
                    return new TCTag(tagData.tagid, tagData.name)
                }
                else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))
    }

    delete(tag : TCTag) : Observable<{}> {
        let url = `${this.tagsUrl}/${tag.identifier}`
        let options = new RequestOptions({ headers : this.headers })
        return this.tcHttp
            .delete(url, options)
            .map(response => {
            let success = response.ok
            if (success) { 
                return {success : true}
            }
            else { return Observable.throw(response.json().error || 'Service error') }
            })
            .catch(err => this.handleError(err))
    }
}
