import { Injectable }     from '@angular/core'

import { Subject } from 'rxjs/Rx'

// Prevent errors that are identical from being shown more
// than once if they are received within X seconds of each other.
const suppressErrorsIfWithinSeconds : number = 2

export interface TCError {
    title: string
    message: string
}

@Injectable()
export class TCErrorService {
    public readonly errors : Subject<TCError>

    private lastErrorCode : string = null
    private lastErrorMessage : string = null
    private lastErrorTimestamp : number = 0

    constructor() {
        this.errors = new Subject<TCError>()
    }

    public publishError(errorCode : string, errorMessage : string) {
        let newErrorTimestamp = Date.now() / 1000
        // Prevent showing multiple error messages
        // immediately within succession of each other
        let shouldSuppressMessage : boolean = false
        if (errorCode && errorCode == this.lastErrorCode && this.lastErrorMessage && this.lastErrorMessage == errorMessage) {
            let elapsedTimeSinceLastError = newErrorTimestamp - this.lastErrorTimestamp
            if (elapsedTimeSinceLastError < suppressErrorsIfWithinSeconds) {
                shouldSuppressMessage = true
            }
        }

        this.lastErrorCode = errorCode
        this.lastErrorMessage = errorMessage
        this.lastErrorTimestamp = newErrorTimestamp

        console.error(`${errorCode}: ${errorMessage}`)

        if (shouldSuppressMessage) {
            return
        }

        this.errors.next({
            title: errorCode,
            message: errorMessage
        })
    }
}
