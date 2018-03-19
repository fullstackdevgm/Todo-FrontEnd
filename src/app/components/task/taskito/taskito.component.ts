import { Component, Input, Output, EventEmitter, ViewChild, OnInit, OnDestroy } from '@angular/core'
import { ContextMenuService, ContextMenuComponent } from 'ngx-contextmenu'
import { TCTaskito } from '../../../classes/tc-taskito'
import { TCTaskitoService } from '../../../services/tc-taskito.service'
import { TaskCompletionState } from '../../../services/task-completion.service'
import { TaskitoCompletionService, MAX_GLOBAL_TIME } from '../../../services/taskito-completion.service'
import { TaskDeleteConfirmationComponent }    from '../../../components/task/task-delete-confirmation/task-delete-confirmation.component'
import { NgbModal }  from '@ng-bootstrap/ng-bootstrap'
import { TaskType, Utils } from '../../../tc-utils'
import { TCListService } from "../../../services/tc-list.service"
import { TCList } from "../../../classes/tc-list"

import { Subscription, Observable } from 'rxjs'

type TaskitoCompletionStateFunction = () => void

// Animation specifications
const CIRCLE_RADIUS : number = 8
const CIRCLE_CIRCUMFERENCE : number = 2 * Math.PI * CIRCLE_RADIUS
const COUNTDOWN_TIME : number = 4

@Component({
    selector: 'taskito',
    templateUrl: 'taskito.component.html',
    styleUrls: ['taskito.component.css', '../task.component.css']
})
export class TaskitoComponent implements OnInit, OnDestroy {
    TaskCompletionState = TaskCompletionState

    private _currentCompletionState : TaskCompletionState = TaskCompletionState.None
    get currentCompletionState() : TaskCompletionState {
        if (!this._taskito.identifier) return TaskCompletionState.Saving
        return this._taskito.isCompleted ? TaskCompletionState.Complete : this._currentCompletionState
    }
    set currentCompletionState(state : TaskCompletionState) {
        this._currentCompletionState = state
    }
    updating : boolean = false

    listForTask  : TCList = new TCList()
    
    _taskito
    textInputModel : string
    @Input() set taskito(t : TCTaskito) {
        this._taskito = t
        this.textInputModel = t.name
        if (this._taskito.isCompleted) this.currentTaskitoCompletionFunction = this.uncompleteTaskito
    }
    @Input() parentListId : string = null
    @Output() taskitoCompleted : EventEmitter<TCTaskito> = new EventEmitter<TCTaskito>()
    @Output() taskitoUncompleted : EventEmitter<TCTaskito> = new EventEmitter<TCTaskito>()
    @Output() taskitoDeleted : EventEmitter<TCTaskito> = new EventEmitter<TCTaskito>()

    @ViewChild('taskNameInput') nameInput
    @ViewChild('circleBar') circleBar
    @ViewChild('taskitoMoreOptionsMenu') public taskitoMoreOptionsMenu: ContextMenuComponent


    private globalTimeSubscription : Subscription
    private globalTime : number = 0
    private countdownProgress : number = 0
    
    // Maps countdown progress to [0, 1]
    private get countdownProgressPercent() : number {
        return Math.min(Math.max(0, this.countdownProgress) / COUNTDOWN_TIME, 1)
    }

    // Maps countdown progress to integers [0, 100]
    private get countdownProgressPercentInt() : number {
        return this.countdownProgressPercent * 100
    }
    
    constructor(
        private readonly service : TCTaskitoService,
        private readonly listService : TCListService,
        private readonly completionService : TaskitoCompletionService,
        private contextMenuService :  ContextMenuService,
        private modalService     : NgbModal
    ) {}

    ngOnInit() {
        if(!this.parentListId) return

        this.listService.lists.take(1).subscribe(pub => {
            this.listForTask = pub.lists.find(list => this.parentListId == list.identifier)
        })
    }

    ngOnDestroy() {}

    onContextMenu(event : any) {
        this.contextMenuService.show.next({
            contextMenu: this.taskitoMoreOptionsMenu,
            event: event,
            item: this._taskito
        });
        event.preventDefault()
        event.stopPropagation()
    }

    private resetCompleteTaskitoAnimation() {
        this.countdownProgress = 0

        this.circleBar.nativeElement.style.removeProperty('stroke-dashoffset')
        this.circleBar.nativeElement.style.removeProperty('stroke-dasharray')
    }

    private finishCompletingTaskito() {
        this.currentCompletionState = TaskCompletionState.Saving
        this.currentTaskitoCompletionFunction = () => {}
        
        this.globalTimeSubscription.unsubscribe()

        const sub = this.completionService.taskitoCompleted
            .filter(taskito => taskito.identifier == this._taskito.identifier)
            .subscribe(taskito => {
                this.currentCompletionState = TaskCompletionState.Complete
                this.currentTaskitoCompletionFunction = this.uncompleteTaskito
                this._taskito.completionDate = taskito.completionDate
                this.taskitoCompleted.emit(this._taskito)

                sub.unsubscribe()
            },
            (error : Error) => {
                this.currentCompletionState = TaskCompletionState.Error
                this.currentTaskitoCompletionFunction = this.cancelCompleteTaskito
                sub.unsubscribe()
            })
        this.completionService.finishCompletingTaskito(this._taskito)
    }

    private beginGracePeriod() {
        this.currentCompletionState = TaskCompletionState.GracePeriod

        const updateSubscription = this.completionService.ticker
            .filter(count => this.globalTime >= this.countdownProgressPercentInt )
            .subscribe(count => {
                this.countdownProgress += this.completionService.INTERVAL_STEP / 1000
                this.completionService.updateGlobalTimer(this.countdownProgressPercentInt)
                const currentArcLength = CIRCLE_CIRCUMFERENCE * (1 - this.countdownProgressPercent)
                this.circleBar.nativeElement.style.strokeDashoffset = currentArcLength
            })

        const finishSubscription = this.completionService.ticker
            .filter(interval => this.countdownProgress >= COUNTDOWN_TIME)
            .subscribe(interval => {
                this.finishCompletingTaskito()
                this.resetCompleteTaskitoAnimation()

                updateSubscription.unsubscribe()
                finishSubscription.unsubscribe()
            })
        
        this.currentTaskitoCompletionFunction = () => {
            updateSubscription.unsubscribe()
            finishSubscription.unsubscribe()
            this.cancelCompleteTaskito()
        }
    }

    private startCompleteTaskito : TaskitoCompletionStateFunction = () => {
        this.globalTimeSubscription = this.completionService.globalTime.subscribe(globalTime => {
            this.globalTime = globalTime
        })

        this.currentCompletionState = TaskCompletionState.Initial

        this.completionService.beginCompletingTaskito({
            taskito : this._taskito,
            getCompletionProgression : () => this.countdownProgressPercentInt
        })
        Observable.interval(400).first().subscribe(count => {
            this.circleBar.nativeElement.style.strokeDasharray = CIRCLE_CIRCUMFERENCE
            this.beginGracePeriod()
        })

        this.currentTaskitoCompletionFunction = this.cancelCompleteTaskito
    }

    private cancelCompleteTaskito : TaskitoCompletionStateFunction = () => {
        this.globalTimeSubscription.unsubscribe()
        this.currentCompletionState = TaskCompletionState.None
        this.completionService.removeCompletingTaskito(this._taskito)
        this.resetCompleteTaskitoAnimation()

        this.currentTaskitoCompletionFunction = this.startCompleteTaskito
    }

    private uncompleteTaskito : TaskitoCompletionStateFunction = () => {
        this.currentCompletionState = TaskCompletionState.Saving
        this.currentTaskitoCompletionFunction = () => {}

        this.service.uncomplete([this._taskito]).first().subscribe(uncompleted => {
            if (!uncompleted.reduce((accum, curr) => accum || this._taskito.identifier == curr, false)) return

            this._taskito.completionDate = null
            this.currentCompletionState = TaskCompletionState.None
            this.currentTaskitoCompletionFunction = this.startCompleteTaskito
            this.taskitoUncompleted.emit(this._taskito)
        },
        error => {
            this.currentCompletionState = TaskCompletionState.Error
        })
    }

    private currentTaskitoCompletionFunction : TaskitoCompletionStateFunction = this.startCompleteTaskito

    completeTaskito() {
        if (!this._taskito.identifier) return
        this.currentTaskitoCompletionFunction()
    }

    updateTaskitoName(text : string) {
        if (!text || text.trim().length == 0 || this._taskito.identifier == null) {
            this.textInputModel = this._taskito.name
            return
        }
        this._taskito.name = this.textInputModel.trim()
        this.nameInput.nativeElement.blur()
        this.updating = true
        this.service.update(this._taskito).first().subscribe(updated => { this.updating = false })
    }

    showDeleteTaskitoConfirmationModal() {
        const modalRef = this.modalService.open(TaskDeleteConfirmationComponent)
        const deleteComponent : TaskDeleteConfirmationComponent = modalRef.componentInstance

        deleteComponent.task = this._taskito
        deleteComponent.deletePressed.subscribe(task => {
            this.deleteTaskito()
        })

        return false
    }

    private deleteTaskito() {
        this.service.delete(this._taskito).subscribe(task => {
            this.taskitoDeleted.emit(this._taskito)
        })
    }

    listHasDarkColor() {
        return Utils.isDarkColor(this.listForTask.color)
    }
}