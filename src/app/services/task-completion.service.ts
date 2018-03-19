import { Injectable } from '@angular/core'
import { TCTask } from '../classes/tc-task'
import { TCTaskService, CompleteTasksResponse } from './tc-task.service'
import { Observable, ReplaySubject, Subject } from 'rxjs'

interface TaskCompletionModel {
    task : TCTask,
    getCompletionProgression : () => number,
    isComplete? : boolean,
}

export interface CompletedTasksResult {
    // Contains task objects for all completed tasks
    completedTasks : TCTask[],

    // Contains objects for tasks that repeat.
    repeatedTasks  : TCTask[]
}

export enum TaskCompletionState {
    Initial = 0,
    GracePeriod,
    Saving,
    Complete,
    Error,
    None,
    Creating
}

@Injectable()
export class TaskCompletionService {
    completingTasks : TaskCompletionModel[] = []

    private _completedTasks : Subject<CompletedTasksResult> = new Subject<CompletedTasksResult>()
    public readonly completedTasks : Observable<CompletedTasksResult>

    private _globalTime : ReplaySubject<number> = new ReplaySubject(1)
    public readonly globalTime : Observable<number>

    private _globalMaxProgress : number
    private get globalMaxProgress() : number {
        return this._globalMaxProgress
    }
    private set globalMaxProgress(progress : number) {
        this._globalMaxProgress = progress
        this._globalTime.next(this._globalMaxProgress)
    }
    
    private _runTimer : boolean = true
    public get runTimer() : boolean {
        return this._runTimer
    }

    constructor(
        private taskService : TCTaskService
    ) {
        this.globalTime = this._globalTime
        this.globalMaxProgress = 0

        this.completedTasks = this._completedTasks
    }

    taskIsBeingCompleted(task : TCTask) : boolean {
        return this.completingTasks.find(e => e.task.identifier == task.identifier) != null
    }

    beginCompletingTask(taskCompletionModel : TaskCompletionModel) {
        taskCompletionModel.isComplete = false
        this.completingTasks.push(taskCompletionModel)
        this.resetGlobalTime()
    }

    removeCompletingTask(task : TCTask) {
        this.removeCompletingTaskByID(task.identifier)
        this.setGlobalTimeToLeastProgression()
    }

    private removeCompletingTaskByID(taskid : string) {
        this.completingTasks = this.completingTasks.filter(e => e.task.identifier != taskid)   
    }

    finishCompletingTask(task : TCTask) {
        const completionModel = this.completingTasks.find(e => e.task.identifier == task.identifier)
        completionModel.isComplete = true

        if (this.completingTasks.reduce((accum, curr) => accum && curr.isComplete, true)) {
            this.taskService.completeTasks(this.completingTasks.map(e => e.task)).first().subscribe((response : CompleteTasksResponse) => {
                
                let completedTasks : TCTask[] = []
                let repeatedTasks  : TCTask[] = []

                completedTasks = completedTasks.concat(response.newTasks)
                repeatedTasks = repeatedTasks.concat(response.repeatedTasks)

                response.completedTaskIDs.forEach(taskid => {
                    if (repeatedTasks.find(e => e.identifier == taskid) == null) {
                        const fromCompletingTasks = this.completingTasks.find(e => e.task.identifier == taskid)
                        if (fromCompletingTasks) {
                            fromCompletingTasks.task.completionDate = new Date()
                            completedTasks.push(fromCompletingTasks.task)
                        }
                    }
                    this.removeCompletingTaskByID(taskid)
                })

                this._completedTasks.next({ completedTasks : completedTasks, repeatedTasks : repeatedTasks })
            },
            error => {
                this._completedTasks.error(error)
            })
        }
    }

    private setGlobalTimeToLeastProgression() {
        const newGlobalTime = this.completingTasks.reduce((accum, current) => Math.max(accum, current.getCompletionProgression()), 0)
        this.updateGlobalTimer(newGlobalTime)
        this.globalMaxProgress = newGlobalTime
    }

    private resetGlobalTime() {
        this.updateGlobalTimer(1)
        this.globalMaxProgress = 1
    }

    updateGlobalTimer(progress : number) {
        if (progress >= this.globalMaxProgress) {
            /* Save new max progress value */
            this.globalMaxProgress = progress
            this._runTimer = true
        } else {
            /* If current progress less than global - we need to stop timer */
            this._runTimer = false
        }
        /* Reset max progress */
        if (this.globalMaxProgress >= 100) {
            this.globalMaxProgress = 0
        }
    }
}