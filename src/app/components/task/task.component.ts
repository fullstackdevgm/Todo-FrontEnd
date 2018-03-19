import { Component, Input, Output, HostListener, EventEmitter, ViewChild, OnInit, OnDestroy }  from '@angular/core'
import { ContextMenuService, ContextMenuComponent } from 'ngx-contextmenu'
import { TCTaskService } from '../../services/tc-task.service'
import { TaskCompletionService, TaskCompletionState } from '../../services/task-completion.service'
import { TaskDeleteConfirmationComponent }    from '../../components/task/task-delete-confirmation/task-delete-confirmation.component'
import { TaskEditService, PriorityUpdate } from '../../services/task-edit.service'
import { TCTask } from '../../classes/tc-task'
import { TaskType, Utils, TaskPriority, TaskRecurrenceType } from '../../tc-utils'
import { NgbModal }  from '@ng-bootstrap/ng-bootstrap'
import { TCListService } from "../../services/tc-list.service"
import { TCList } from "../../classes/tc-list"
import { TCAccount } from "../../classes/tc-account"
import { TCListMembershipService } from '../../services/tc-list-membership.service'
import { AppMenuIdentifier, AppMenuService} from '../../services/app-menu.service'
import { PaywallService } from '../../services/paywall.service'
import { HotkeyEventModel, TCHotkeyService } from '../../services/tc-hotkey.service'

import { Subscription } from 'rxjs'
import * as moment from 'moment'
import {utils} from "protractor";
import { environment } from '../../../environments/environment'

export type TypeUpdate = { updatedTask : TCTask, previous :  TaskType, current : TaskType }

@Component({
    selector: 'task-item',
    templateUrl: 'task.component.html',
    styleUrls: ['task.component.css']
})
export class TaskComponent implements OnInit, OnDestroy {
    @Input() task: TCTask
    @Input() parentTask: TCTask = null

    // For working with the delete task functionality
    @Input() selectedTaskCount : number
    @Input() taskIsSelected : boolean

    @Output() taskSelected: EventEmitter<{shift : boolean, ctrl : boolean}> = new EventEmitter<{shift : boolean, ctrl : boolean}>()
    @Output() showEditorSelected: EventEmitter<TCTask> = new EventEmitter<TCTask>()
    @Output() showChildrenSelected: EventEmitter<void> = new EventEmitter<void>()
    @Output() taskCompleted : EventEmitter<TCTask> = new EventEmitter<TCTask>()
    @Output() taskUncompleted : EventEmitter<TCTask> = new EventEmitter<TCTask>()
    @Output() taskDeleted : EventEmitter<TCTask> = new EventEmitter<TCTask>()
    @Output() taskTypeChanged : EventEmitter<TypeUpdate> = new EventEmitter<TypeUpdate>()
    @Output() taskPriorityChanged : EventEmitter<PriorityUpdate> = new EventEmitter<PriorityUpdate>()
    @Output() taskDueDateRemoved : EventEmitter<TCTask> = new EventEmitter<TCTask>()
    @Output() deleteSelected : EventEmitter<void> = new EventEmitter<void>()

    @ViewChild('circleBar') circleBar
    @ViewChild('taskMoreOptionsMenu') public taskMoreOptionsMenu: ContextMenuComponent
    @ViewChild('taskEl') taskEl

    listForTask : TCList = new TCList()
    isOverdueTask : boolean = false

    TaskCompletionState = TaskCompletionState
    environment  = environment
    private _currentCompletionState : TaskCompletionState = TaskCompletionState.None
    get currentCompletionState() : TaskCompletionState {
        if (this.task.identifier == null) return TaskCompletionState.Creating
        return this.task.isCompleted ? TaskCompletionState.Complete : this._currentCompletionState
    }
    set currentCompletionState(state : TaskCompletionState) {
        this._currentCompletionState = state
    }

    @Input() subtaskCount : number = 0
    @Input() showListName : boolean = false

    private countdownIntervalId : any
    private animationTimeoutId : any
    private globalTimeSubscription : Subscription

    private globalTimer : number = 0
    private innerCountdownTimer : number = 0 // 0s
    private currentCountdownProgress : number = 0 // 0%
    private readonly countdownTime  : number = 4 // 4s
    private readonly intervalStep : number = 100 // 100ms
    readonly currentDate : any = new Date()

    readonly circleRadius : number = 8
    readonly circleLine : number = 2 * Math.PI * this.circleRadius

    readonly TaskRecurrenceType = TaskRecurrenceType
    readonly TaskPriority = TaskPriority
    readonly TaskType = TaskType

    selectedMember : TCAccount = null

    private hotkeySubscription: Subscription
    private menuSubscription: Subscription

    constructor(
        private taskService : TCTaskService,
        private readonly listService : TCListService,
        private taskCompletionService : TaskCompletionService,
        private readonly taskEditService : TaskEditService,
        private contextMenuService :  ContextMenuService,
        private readonly listMembershipService : TCListMembershipService,
        private readonly appMenuService : AppMenuService,
        private readonly paywallSerice : PaywallService,
        private readonly hotkeyService: TCHotkeyService,
        private modalService     : NgbModal
    )
    {
        this.hotkeySubscription = hotkeyService.commands.subscribe(hotkeyEvent => this.handleCommand(hotkeyEvent))
    }

    ngOnInit() {
        this.globalTimeSubscription = this.taskCompletionService.globalTime.subscribe(globalTime => {
            this.globalTimer = globalTime
            if (this.currentCountdownProgress > 0 &&
                this.currentCountdownProgress <= 100 &&
                this.globalTimer >= this.currentCountdownProgress && 
                !this.countdownIntervalId) {
                this.gracePeriodTimer()
            } 
        })
        this.listService.lists.take(1).subscribe(pub => {
            this.listForTask = pub.lists.find(list => this.task.listId == list.identifier)
        })

        if(this.task.hasUserAssignment){
            this.listMembershipService.sharedUserAccounts.subscribe(accounts => {
                this.selectedMember = accounts.find(account => account.identifier == this.task.assignedUserId)
            })
        }
        this.checkOverdueTask()

        this.menuSubscription = this.appMenuService.actions.subscribe(action => {
            if (this.taskIsSelected == false) {
                return
            }

            switch (action.menuItemID) {
                case AppMenuIdentifier.TaskComplete: {
                    this.completeTask()
                    break
                }
                case AppMenuIdentifier.TaskRemoveDueDate: {
                    if (this.task.hasDueDate) {
                        this.task.dueDate = null
                        this.task.startDate = null
                        this.updateTask( (task) => {
                            this.taskDueDateRemoved.emit(this.task)
                        })
                    }
                    break
                }
                case AppMenuIdentifier.TaskSetPriorityHigh: {
                    this.changeTaskPriority(TaskPriority.High)
                    break
                }
                case AppMenuIdentifier.TaskSetPriorityMedium: {
                    this.changeTaskPriority(TaskPriority.Medium)
                    break
                }
                case AppMenuIdentifier.TaskSetPriorityLow: {
                    this.changeTaskPriority(TaskPriority.Low)
                    break
                }
                case AppMenuIdentifier.TaskSetPriorityNone: {
                    this.changeTaskPriority(TaskPriority.None)
                    break
                }
                case AppMenuIdentifier.TaskConvertToNormal: {
                    this.changeTaskType(TaskType.Normal)
                    break
                }
                case AppMenuIdentifier.TaskConvertToProject: {
                    this.changeTaskType(TaskType.Project)
                    break
                }
                case AppMenuIdentifier.TaskConvertToChecklist: {
                    this.changeTaskType(TaskType.Checklist)
                    break
                }
            }
        })
    }

    ngOnDestroy() {
        this.globalTimeSubscription.unsubscribe()
        this.hotkeySubscription.unsubscribe()
        this.menuSubscription.unsubscribe()
    }

    onContextMenu(event : any) {
        this.contextMenuService.show.next({
            contextMenu: this.taskMoreOptionsMenu,
            event: event,
            item: this.task,
        });
        event.preventDefault()
        event.stopPropagation()
    }

    changeTaskType(type : TaskType) {
        const finish = () => {
            const oldType = this.task.taskType
            this.task.taskType = type
            this.updateTask( (task) => {
                this.taskTypeChanged.emit({ updatedTask : task, previous : oldType, current : type })
            })
        }

        if (type == TaskType.Project) {
            this.paywallSerice.paywallCheck("Projects are a premium feature.", () => finish())
            return
        }

        finish()
    }

    changeTaskPriority(priority : TaskPriority) {
        const oldPriority = this.task.priority
        this.task.priority = priority
        this.updateTask( () => {
            this.taskPriorityChanged.emit({task : this.task, oldPriority : oldPriority, newPriority : this.task.priority})
        } )
    }

    private updateTask(next : (task : TCTask) => void = () => {}) {
        this.taskService.update(this.task).subscribe(task => {
            // this.task = task
            this.checkOverdueTask()
            next(task)
        })
    }

    selectTask(shiftSelect : boolean, ctrlSelect : boolean) {
        this.taskSelected.emit({shift : shiftSelect, ctrl : ctrlSelect})
        if (this.taskEl) {
            this.taskEl.nativeElement.focus()
        }
    }

    showChildren() {
        this.showChildrenSelected.emit()
    }

    editTaskSelected() {
        if (this.currentCompletionState == TaskCompletionState.Creating || 
            this.currentCompletionState == TaskCompletionState.Saving) {
            return
        }

        this.showEditorSelected.emit(this.task)
        this.taskEditService.editTask(this.task)
    }

    completeTask() {
        if(!this.task.isCompleted) {   
            if (this.currentCompletionState == TaskCompletionState.Saving) return

            this.currentCompletionState = this.currentCompletionState >= TaskCompletionState.Error ? 
                TaskCompletionState.Initial : TaskCompletionState.None

            if (this.currentCompletionState != TaskCompletionState.None) {
                // Set initial animation running
                this.currentCompletionState = TaskCompletionState.Initial

                // Start grace period animation after initial animation time interval
                this.taskCompletionService.beginCompletingTask({
                    task : this.task,
                    getCompletionProgression : () => this.currentCountdownProgress
                })
                this.animationTimeoutId = setTimeout(() => {
                    /*Start grace countdown*/
                    this.circleBar.nativeElement.style.strokeDasharray = this.circleLine
                    this.gracePeriodTimer()
                    this.currentCompletionState = TaskCompletionState.GracePeriod
                }, 400)
            } else {
                clearTimeout(this.animationTimeoutId)
                this.currentCompletionState = TaskCompletionState.None
                this.taskCompletionService.removeCompletingTask(this.task)
                this.resetCompleteTask()
            }
        } else {
            this.currentCompletionState = TaskCompletionState.Saving
            this.taskService.uncompleteTask(this.task).first().subscribe(uncompletedTasks => {
                if (!uncompletedTasks.completedTaskIDs.reduce((accum, curr) => accum || this.task.identifier == curr, false)) return

                this.task.completionDate = null
                this.currentCompletionState = TaskCompletionState.None
                this.taskUncompleted.emit(this.task)
            },
            error => {
                this.currentCompletionState = TaskCompletionState.Error
            })
        }
    }

    completeTaskSave() {
        this.currentCompletionState = TaskCompletionState.Saving

        this.taskCompletionService.completedTasks.first().subscribe(result => {
            const didRepeateTask : boolean = result.repeatedTasks.reduce((accum, task) => {
                return accum || task.identifier == this.task.identifier
            }, false)
            this.currentCompletionState = didRepeateTask ? TaskCompletionState.None :  TaskCompletionState.Complete
            this.taskCompleted.emit(this.task)
        },
        (error: Error) => {
            this.currentCompletionState = TaskCompletionState.Error
        })
        this.taskCompletionService.finishCompletingTask(this.task)
    }

    handleActionLinkClick(event, url) {
        event.preventDefault()
        if (environment.isElectron) {
            Utils.openUrlInDefaultBrowser(url)
        } else {
            window.open(url, '_blank')
        }
    }

    private gracePeriodTimer(){
        this.countdownIntervalId = setInterval(() => {
            /* Stop Interval in case if */
            if (!(this.taskCompletionService.runTimer || this.globalTimer > this.currentCountdownProgress)) {
                clearInterval(this.countdownIntervalId)
                this.countdownIntervalId = null
                return
            }

            // Millseconds to seconds
            this.innerCountdownTimer += this.intervalStep / 1000
            // Inner countdown timer as a percent of the total countdown time
            this.currentCountdownProgress = Math.floor(100 * (this.innerCountdownTimer / this.countdownTime))
            this.taskCompletionService.updateGlobalTimer(this.currentCountdownProgress)

            // Change percent back to decimal 0.## representation
            let progress = this.currentCountdownProgress / 100
            let dashoffset = this.circleLine * (2 - progress)
            this.circleBar.nativeElement.style.strokeDashoffset = dashoffset

            if (this.innerCountdownTimer >= this.countdownTime) {
                this.completeTaskSave()
                this.resetCompleteTask()
            }
        }, this.intervalStep)
    }

    private resetCompleteTask() {
        clearInterval(this.countdownIntervalId)
        this.countdownIntervalId = null

        this.innerCountdownTimer = 0
        this.currentCountdownProgress = 0

        this.circleBar.nativeElement.style.removeProperty('stroke-dashoffset')
        this.circleBar.nativeElement.style.removeProperty('stroke-dasharray')
    }

    private showDeleteTaskConfirmationModal() {
        const modalRef = this.modalService.open(TaskDeleteConfirmationComponent)
        const deleteComponent : TaskDeleteConfirmationComponent = modalRef.componentInstance

        deleteComponent.task = this.task
        deleteComponent.deletePressed.subscribe(task => {
            this.deleteTask()
        })
    }

    private deleteTask() {
        this.taskService.delete(this.task).subscribe(task => {
            this.taskDeleted.emit(this.task)
        })
    }

    private showDeleteSelectedConfirmationModal() {
        const modalRef = this.modalService.open(TaskDeleteConfirmationComponent)
        const deleteComponent : TaskDeleteConfirmationComponent = modalRef.componentInstance

        deleteComponent.task = this.task
        deleteComponent.selectedTaskCount = this.selectedTaskCount
        deleteComponent.deletePressed.subscribe(task => {
            this.deleteSelected.emit()
        })
    }

    listHasDarkColor() {
        return this.listForTask ? Utils.isDarkColor(this.listForTask.color) : false
    }

    checkOverdueTask(){
        if (this.task.shouldShowDueDate) {
            let time = moment().toDate().getTime()
            let taskTime = this.task.shownDueDate.getTime()
            if (!this.task.dueDateHasTime) {
                time = moment().endOf('day').toDate().getTime()
                taskTime = moment(this.task.shownDueDate).endOf('day').toDate().getTime()
            }
            this.isOverdueTask = taskTime < time
        }
    }

    private handleCommand(hotkeyEvent : HotkeyEventModel) {
        if (Utils.isMacOS && this.taskIsSelected) {
            switch (hotkeyEvent.name) {
                case "MacOS.Task.complete":
                    this.completeTask()
                    break;
                case "MacOS.Task.priorityNone":
                    this.changeTaskPriority(TaskPriority.None)
                    break;
                case "MacOS.Task.priorityLow":
                    this.changeTaskPriority(TaskPriority.Low)
                    break;
                case "MacOS.Task.priorityMedium":
                    this.changeTaskPriority(TaskPriority.Medium)
                    break;
                case "MacOS.Task.priorityHigh":
                    this.changeTaskPriority(TaskPriority.High)
                    break;
            }
        } else if (this.taskIsSelected) {
            switch (hotkeyEvent.name) {
                case "Other.Task.complete":
                    this.completeTask()
                    break;
                case "Other.Task.priorityNone":
                    this.changeTaskPriority(TaskPriority.None)
                    break;
                case "Other.Task.priorityLow":
                    this.changeTaskPriority(TaskPriority.Low)
                    break;
                case "Other.Task.priorityMedium":
                    this.changeTaskPriority(TaskPriority.Medium)
                    break;
                case "Other.Task.priorityHigh":
                    this.changeTaskPriority(TaskPriority.High)
                    break;
            }
        }
    }
}
