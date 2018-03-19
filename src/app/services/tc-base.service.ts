import { Injectable }     from '@angular/core'
import { Headers, RequestOptions, Response, URLSearchParams }  from '@angular/http'

import { TCHttp } from  '../tc-http'
import { TCErrorService } from './tc-error.service'
import { environment } from '../../environments/environment'

import { Observable, Subject } from 'rxjs/Rx'
import 'rxjs/add/operator/map'

@Injectable()
export class TCBaseService {
    constructor(
        protected readonly tcHttp : TCHttp,
        public errService : TCErrorService
    ) {

    }

    protected handleError(error: any): Observable<any> {
        // console.log(`handleError(): ${JSON.stringify(error)}`)
        let errCode : string = 'ServiceError'
        let errMsg : string = 'Error communicating with the service'
        if (error._body) {
            // console.log(`${error._body}`)
            try {
                let data = JSON.parse(error._body)
                if (data && data.code && data.message) {
                    // We've got a real API error back from the server that we can use
                    errCode = data.code
                    errMsg = data.message
                } else if (data && data.message) {
                    // We've likely received some sort of error from API Gateway
                    // but it's not one of our known errors.
                    errMsg = data.message
                }
            }
            catch (parseError) {
                // do nothing.
            }
        }

        // This lets any UI know of the error
        this.errService.publishError(errCode, errMsg)
        
        // Throw an application-level error
        let fullErrMsg = `${errCode}: ${errMsg}`
        return Observable.throw(fullErrMsg)
    }
}
