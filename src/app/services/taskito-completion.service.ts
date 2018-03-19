import { Injectable } from '@angular/core'
import { TCTaskito } from '../classes/tc-taskito'
import { TCTaskitoService } from './tc-taskito.service'
import { Observable, ReplaySubject, Subject } from 'rxjs'

interface TaskitoCompletionModel {
    taskito : TCTaskito,
    getCompletionProgression : () => number,
    isComplete? : boolean,
}

export interface CompletedTasksResult {
    // Contains task objects for all completed tasks
    completedTasks : TCTaskito[],

    // Contains objects for tasks that repeat.
    repeatedTasks  : TCTaskito[]
}

export const MAX_GLOBAL_TIME = 100

@Injectable()
export class TaskitoCompletionService {
    completingTaskitos : TaskitoCompletionModel[] = []

    private _taskitoCompleted : Subject<TCTaskito> = new Subject<TCTaskito>()
    public readonly taskitoCompleted : Observable<TCTaskito>

    private _globalTime : ReplaySubject<number> = new ReplaySubject(1)
    public readonly globalTime : Observable<number>

    public readonly INTERVAL_STEP : number = 100
    public readonly ticker : Observable<number>

    private _globalMaxProgress : number
    private get globalMaxProgress() : number {
        return this._globalMaxProgress
    }
    private set globalMaxProgress(progress : number) {
        this._globalMaxProgress = progress
        this._globalTime.next(this._globalMaxProgress)
    }
    public get globalTimeProgress() : number {
        return this.globalMaxProgress
    }
    
    private _runTimer : boolean = true
    public get runTimer() : boolean {
        return this._runTimer
    }

    constructor(
        private taskitoService : TCTaskitoService
    ) {
        this.globalTime = this._globalTime
        this.globalMaxProgress = 0

        this.taskitoCompleted = this._taskitoCompleted

        this.ticker = Observable.interval(this.INTERVAL_STEP)
    }

    taskitoIsBeingCompleted(taskito : TCTaskito) : boolean {
        return this.completingTaskitos.find(e => e.taskito.identifier == taskito.identifier) != null
    }

    beginCompletingTaskito(taskCompletionModel : TaskitoCompletionModel) {
        taskCompletionModel.isComplete = false
        this.completingTaskitos.push(taskCompletionModel)
        this.resetGlobalTime()
    }

    removeCompletingTaskito(taskito : TCTaskito) {
        this.removeCompletingTaskitoByID(taskito.identifier)
        this.setGlobalTimeToLeastProgression()
    }

    private removeCompletingTaskitoByID(taskid : string) {
        this.completingTaskitos = this.completingTaskitos.filter(e => e.taskito.identifier != taskid)   
    }

    finishCompletingTaskito(taskito : TCTaskito) {
        const completionModel = this.completingTaskitos.find(e => e.taskito.identifier == taskito.identifier)
        completionModel.isComplete = true

        if (this.completingTaskitos.reduce((accum, curr) => accum && curr.isComplete, true)) {
            this.resetGlobalTime()

            this.taskitoService.complete(this.completingTaskitos.map(e => e.taskito)).first().subscribe((response : string[]) => {
                const completedTaskitos : TCTaskito[] = []

                response.forEach((taskitodId : string) => {
                    const fromCompleting = this.completingTaskitos.find(e => e.taskito.identifier == taskitodId)
                    if (fromCompleting) {
                        fromCompleting.taskito.completionDate = new Date()
                        completedTaskitos.push(fromCompleting.taskito)

                        this.removeCompletingTaskitoByID(taskitodId)
                        this._taskitoCompleted.next(fromCompleting.taskito)
                    }
                })
            },
            error => {
                this._taskitoCompleted.error(error)
            })
        }
    }

    private setGlobalTimeToLeastProgression() {
        const newGlobalTime = this.completingTaskitos.reduce((accum, current) => Math.max(accum, current.getCompletionProgression()), 0)
        this.updateGlobalTimer(newGlobalTime)
        this.globalMaxProgress = newGlobalTime
    }

    private resetGlobalTime() {
        this.globalMaxProgress = 0
    }

    updateGlobalTimer(progress : number) {
        if (progress >= this.globalMaxProgress) {
            // Set global max progress, prevent it from being more than 100
            this.globalMaxProgress = Math.min(progress, MAX_GLOBAL_TIME)
        } 
    }
}