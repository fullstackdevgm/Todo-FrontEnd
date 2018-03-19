import { Injectable, OnInit }     from '@angular/core'
import { Headers, RequestOptions, Response }  from '@angular/http'
import { TCHttp } from '../tc-http'
import { environment } from '../../environments/environment'

import { Observable, Subject, ReplaySubject, Subscription } from 'rxjs/Rx'
import 'rxjs/add/operator/map'
import * as moment from 'moment'
import 'moment-timezone'
import * as io from 'socket.io-client'

import { TCBaseService } from './tc-base.service'
import { TCErrorService } from './tc-error.service'
import { TCAuthenticationService } from './tc-authentication.service'
import { TCAccountService } from './tc-account.service'
import { TCList } from '../classes/tc-list'

const secondsToMilliseconds = (seconds) => 1000 * seconds
const minutesToMilliseconds = (minutes) => secondsToMilliseconds(minutes * 60)
const hoursToMilliseconds = (hours) => minutesToMilliseconds(hours * 60)

const TC_INITIAL_SYNC_COMPLETE : string = 'TC-SYNC-INITIAL-COMPLETE'
type SyncLoadStatus = {
    message : string,
    taskCounts : {
        activeTasks : number,
        completedTasks : number,
        processedTasks : number
    }
}

@Injectable()
export class TCSyncService extends TCBaseService {
    private readonly syncUrl : string = `${environment.baseApiUrl}/sync`

    private headers : Headers
    private syncEventSocket

    private readonly _syncCompleted : Subject<boolean> = new Subject<boolean>()
    public get syncCompleted() : Observable<boolean> {
        return this._syncCompleted
    }

    private readonly _syncStarted : Subject<boolean> = new Subject<boolean>()
    public get syncStarted() : Observable<boolean> {
        return this._syncStarted
    }

    private readonly _syncMessageReceived : Subject<string> = new Subject<string>()
    public get syncMessageReceived() : Observable<string> {
        return this._syncMessageReceived
    }

    private readonly _syncLoadStatusReceived : Subject<SyncLoadStatus> = new Subject<SyncLoadStatus>()
    public get syncLoadStatusReceived() : Observable<SyncLoadStatus> {
        return this._syncLoadStatusReceived
    }

    private readonly _syncErrorReceived : Subject<Error> = new Subject<Error>() 
    public get syncErrorReceived() : Observable<Error> {
        return this._syncErrorReceived
    }

    private periodicSyncSubscription : Subscription
    private autoSyncSubscription : Subscription

    private performingSync : boolean = false

    get initialSyncComplete() : boolean {
        if (!environment.isElectron) return true
        
        return localStorage.getItem(TC_INITIAL_SYNC_COMPLETE) == 'true'
    }

    constructor(
        public readonly tcHttp : TCHttp,
        public readonly errService : TCErrorService,
        private readonly authService : TCAuthenticationService,
        private readonly accountService : TCAccountService
    ) {
        super(tcHttp, errService)
        
        this.headers = new Headers({
            'Content-Type' : 'application/json',
            "x-api-key" : environment.todoCloudAPIKey
        })

        let autoSyncTimerSubscription : Subscription = null
        let accountSubscription : Subscription = null
        this.authService.authStateChanged.subscribe(() => {
            if (!environment.isElectron) return
            if (this.authService.isLoggedOut()) {
                if (accountSubscription) accountSubscription.unsubscribe()
                this.performingSync = false
                this.stopPeriodicSync()
                this.setInitialSyncCompleted(false)
                if (autoSyncTimerSubscription) {
                    autoSyncTimerSubscription.unsubscribe()
                }
                return
            }

            // Only sync once the account information has been retrieved.
            accountSubscription = this.accountService.account
                .filter(account => account.userID != null)
                .first().subscribe(account => {
                    this.performSync().subscribe(() => {})
                    this.beginPeriodicSync()
                })
        })

        this.autoSyncSubscription = this.tcHttp.autoSyncSignal.subscribe(() => {
            if (!environment.isElectron) return
            const duration = secondsToMilliseconds(environment.electronSyncAfterChangeSeconds)

            if (autoSyncTimerSubscription) autoSyncTimerSubscription.unsubscribe()
            autoSyncTimerSubscription = Observable.interval(duration).take(1).subscribe(() => {
                this.performSync().subscribe(() => {})
            })
        })

        const syncCallReturned = () => {
            this.accountService.getAccountInfo()
            
            console.log('Sync done')
            this.performingSync = false
        }
        this.syncCompleted.subscribe({
            next : syncCallReturned,
            error : syncCallReturned
        })

        if (!environment.isElectron) return
        // Set up the web socket to listen for server sync events
        // const serverURL = url(environment.baseApiUrl)
        // const socketAddress = `${serverURL.protocol}//${serverURL.host}`
        const socketAddress = `http://127.0.0.1:4747`
        // console.log(`Connecting to server sync event socket: ${socketAddress}`)
        // this.syncEventSocket = io(socketAddress)
        // this.syncEventSocket.open()
        this.syncEventSocket = io.connect(socketAddress, {'forceNew': true})

        this.syncEventSocket.on('connect', () => {
            // console.log(`Sync event socket connected: ${this.syncEventSocket.id}`)
        })
        this.syncEventSocket.on('connect_error', (error) => {
            console.error(`Sync event socket connect error: ${error}`)
        })
        this.syncEventSocket.on('connect_timeout', (timeout) => {
            console.error(`Sync event connection timed out.`)
        })
        this.syncEventSocket.on('error', (error) => {
            console.error(`Sync event error: ${error}`)
        })
        this.syncEventSocket.on('disconnect', (reason) => {
            console.error(`Sync event socket disconnected: ${reason}`)
            this.syncEventSocket.open() // automatically reconnect
        })
        this.syncEventSocket.on('sync-message', (data) => {
            // console.log(`\n\n## SYNC EVENT ## ${JSON.stringify(data)}`)
            if (data.taskCounts) {
                this._syncLoadStatusReceived.next(data as SyncLoadStatus)
            }
            else if (data.message) {
                this._syncMessageReceived.next(data.message as string)
            }
        })
    }

    beginPeriodicSync() {
        if (!environment.isElectron) return
        const intervalMilliseconds = hoursToMilliseconds(1)

        this.periodicSyncSubscription = Observable.interval(intervalMilliseconds).subscribe(() => {
            this.performSync().subscribe(() => {})
        })
    }

    stopPeriodicSync() {
        if (!this.periodicSyncSubscription) return

        this.periodicSyncSubscription.unsubscribe()
    }

    performSync() : Observable<boolean> {
        if (!environment.isElectron || this.performingSync) {
            const result = new ReplaySubject<boolean>(1)
            result.complete()
            return result
        }

        this.performingSync = true
        this._syncStarted.next()


        const result = this.tcHttp.post(this.syncUrl, null, { headers : this.headers })
            .do(() => {
                this.setInitialSyncCompleted(true)
            })
            .catch(err => {
                return this.handleError(err)
            })
            .finally(() => {
                this._syncCompleted.next()
            }).first().share()
        
        result.subscribe({
            error : (err) => {
                this._syncErrorReceived.next(err)
            }
        })

        return result
    }

    syncIdForList(list : TCList) : Observable<{hasSyncId : boolean, syncId : string}> {
        const result = this.tcHttp
            .get(`${this.syncUrl}/id/list/${list.identifier}`, { headers : this.headers })
            .share().first()
            .map(response => {
                if (response.ok) {
                    return response.json() as { hasSyncId : boolean, syncId : string } 
                }
                else {
                    return Observable.throw(response.json() || 'Service error')
                }
            })
            .catch(err => {
                return this.handleError(err)
            })
        return result
    }

    private setInitialSyncCompleted(initial : boolean) {
        localStorage.setItem(TC_INITIAL_SYNC_COMPLETE, String(initial))
    }
}
