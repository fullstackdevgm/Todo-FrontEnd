import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit, AfterViewChecked, HostListener }  from '@angular/core'
import { DatePipe } from '@angular/common'
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap'

import { TCTask } from "../../classes/tc-task"
import { TCList } from "../../classes/tc-list"
import { TCAccount } from "../../classes/tc-account"
import { TCTaskNotification, OffsetTimes } from "../../classes/tc-task-notification"
import { TCComment } from '../../classes/tc-comment'
import { TCTag } from '../../classes/tc-tag'

import { TCTaskService, CompleteTasksResponse } from "../../services/tc-task.service"
import { TCListService } from "../../services/tc-list.service"
import { TCTaskNotificationService } from "../../services/tc-task-notification.service"
import { TCCommentService, CommentWithUser } from "../../services/tc-comment.service"
import { TCLocationService } from "../../services/tc-location.service"
import { TCAccountService } from '../../services/tc-account.service'
import { TCAppSettingsService }    from '../../services/tc-app-settings.service'
import { TCTagService } from '../../services/tc-tag.service'
import { TCSyncService } from '../../services/tc-sync.service'
import { TaskCompletionService } from '../../services/task-completion.service'
import { TaskEditService, EditedTaskUpdatePublisher } from '../../services/task-edit.service'
import { PaywallService } from '../../services/paywall.service'
import { TaskNoteEditPopupComponent } from './task-note-edit-popup/task-note-edit-popup.component'
import { NgbModal }  from '@ng-bootstrap/ng-bootstrap'

import { TaskType, TaskPriority, TaskRecurrenceType, RepeatFromType, AdvancedRecurrenceType, Utils, TaskEditState } from "../../tc-utils"
import { MouseEvent as MapMouseClick } from "@agm/core"
import { AsYouTypeFormatter, PhoneNumberUtil, PhoneNumberFormat } from 'google-libphonenumber'
import { HotkeyEventModel, TCHotkeyService } from '../../services/tc-hotkey.service'
import { Subscription, Observable } from 'rxjs'
import * as moment from 'moment'
import { environment } from 'environments/environment.beta';

enum ActionInputType {
    TextField,
    PhoneNumber,
    ContactSelect,
    LocationSelect,
    None
}

enum TaskCompletionState {
    Initial = 0,
    GracePeriod,
    Saving,
    Complete,
    Error,
    None
}

interface ActionInputModel {
    input : ActionInputType
    placeholder : string
    update : (text : string) => void
    completion : (actionInfo : string) => void,
    keypress? : (event : any) => void
}

interface RecurrenceRow {
    label : string,
    type  : TaskRecurrenceType,
    advancedType? : AdvancedRecurrenceType
}

interface CommentRow {
    commentWithUser : CommentWithUser,
    updating : boolean
}

interface NotificationRow {
    notification : TCTaskNotification
}

@Component({
    selector: 'task-edit',
    templateUrl: 'task-edit.component.html',
    styleUrls: ['../../../assets/css/task-editors.css', 'task-edit.component.css']
})
export class TaskEditComponent implements OnInit {
    account : TCAccount

    @Input() taskEditorIsOpen : boolean = false

    activeGroupOverlay : boolean = false
    openNoteEditor : boolean
    showComments   : boolean = false
    showListSelect : boolean = false
    showRecurrenceSelect : boolean = false
    showLocationAlertSelect : boolean = false
    isLinkInvalid : boolean = false

    _showTagEditor : boolean = false
    get showTagEditor() : boolean {
        return this._showTagEditor
    }
    set showTagEditor(show : boolean) {
        this.paywallService.paywallCheck("Tags require and active subscription",
            () => this._showTagEditor = show,
            () => this._showTagEditor = false
        )
    }

    dueDateInput : Date = new Date()
    startDateInput : Date = new Date()

    private autocompleteSubscription : Subscription = null
    locationSearchInputRef : ElementRef
    @ViewChild('locationSearchInput') set locationSearchInput(ref : ElementRef) {
        if (!ref) return
        
        this.locationSearchInputRef = ref
        ref.nativeElement.focus()
        if (this.autocompleteSubscription) this.autocompleteSubscription.unsubscribe()
        this.autocompleteSubscription = this.locationService.registerForPlacesAutocomplete(ref).subscribe(result => {
            this.latitude = result.coords.lat
            this.longitude = result.coords.lng
            this.currentAddress = result.formattedAddress
        })
    }

    @ViewChild('taskCommentInput') taskCommentInput : ElementRef
    @ViewChild('notificationHoursElement') notificationHoursElement : ElementRef
    @ViewChild('notificationMinutesElement') notificationMinutesElement : ElementRef
    @ViewChild('noteTextarea') noteTextarea : ElementRef

    ActionInputType = ActionInputType
    actionTextInput : string = ''
    currentActionInput : ActionInputModel = {
        input : ActionInputType.None,
        placeholder : 'none',
        update : (text : string) => {},
        completion : (actionInfo : string) => {}
    }

    @ViewChild('circleBar') circleBar
    @ViewChild('actionInput') actionInput
    @ViewChild('actionPhoneInput') actionPhoneInput
    @ViewChild('taskNameInput') taskNameInput
    @ViewChild('dueDateDatePickerDrop') dueDateDatePickerDrop
    @ViewChild('startDateDatePickerDrop') startDateDatePickerDrop
    @ViewChild('dueDateFieldYear') dueDateFieldYear
    @ViewChild('dueDateFieldMonth') dueDateFieldMonth
    @ViewChild('dueDateFieldDay') dueDateFieldDay
    @ViewChild('startDateFieldYear') startDateFieldYear
    @ViewChild('startDateFieldMonth') startDateFieldMonth
    @ViewChild('startDateFieldDay') startDateFieldDay

    TaskCompletionState = TaskCompletionState
    private _currentCompletionState : TaskCompletionState = TaskCompletionState.None
    get currentCompletionState() : TaskCompletionState {
        return (this._task.isCompleted && this._currentCompletionState !== TaskCompletionState.Saving) ? TaskCompletionState.Complete : this._currentCompletionState
    }
    set currentCompletionState(state : TaskCompletionState) {
        this._currentCompletionState = state
    }

    countdownIntervalId : any
    animationTimeoutId : any

    private innerCountdownTimer : number = 0 // 0s
    private currentCountdownProgress : number = 0 // 0%
    private readonly countdownTime  : number = 4 // 4s
    private readonly intervalStep : number = 100 // 100ms

    private readonly circleRadius : number = 8
    private readonly circleLine : number = 2 * Math.PI * this.circleRadius

    private hotkeySubscription: Subscription

    actionInputModels = {
        contact: { input : ActionInputType.ContactSelect, placeholder : 'Contact', update : (text : string) => {}, completion : (info) => { /* Null op until contact stuff is worked out */ } },
        location: { 
            input : ActionInputType.LocationSelect, 
            placeholder : 'Search for location', 
            update : (text : string) => {}, 
            completion : (info) => { this.searchForAddress(info) } },
        phone: { 
            input : ActionInputType.PhoneNumber,
            placeholder : 'Phone Number', 
            update : (text : string ) => {
                const formatter = new AsYouTypeFormatter('US')
                let result = ''
                let count = 0
                for (const character of text) {
                    if (isNaN(parseFloat(character))) {
                        continue
                    }
                    
                    count++
                    result = formatter.inputDigit(character)
                    if (count >= 11) break
                }
                this.actionTextInput = result
                return this.actionTextInput
            }, 
            completion : (info) => { 
                this._task.taskTypePhoneNumber = this.actionTextInput 
                this.currentActionInput = this.actionInputModels.none
                this.actionTextInput = ''
                this.saveTaskUpdate()
            },
            keypress : (e) => {
                if ([46, 8, 9, 27, 13, 190].indexOf(e.keyCode) !== -1 ||
                    // Allow: Ctrl+A
                    (e.charCode === 97 && (e.ctrlKey || e.metaKey)) ||
                    // Allow: Ctrl+C
                    (e.charCode === 99 && (e.ctrlKey || e.metaKey)) ||
                    // Allow: Ctrl+V
                    (e.charCode === 118 && (e.ctrlKey || e.metaKey)) ||
                    // Allow: Ctrl+X
                    (e.charCode === 120 && (e.ctrlKey || e.metaKey)) ||
                    // Allow: home, end, left, right
                    (e.keyCode >= 35 && e.keyCode <= 39)) {
                        // let it happen, don't do anything
                        return
                }
                // Ensure that it is a number and stop the keypress
                if (e.shiftKey || (e.charCode < 48 || e.charCode > 57)) {
                    e.preventDefault()
                }
            }
        },
        url: { 
            input : ActionInputType.TextField, 
            placeholder : 'URL', 
            update : (text : string) => {
                this.actionTextInput = text
                this.isLinkInvalid = false
            }, 
            completion : (info) => { 
                const re = /^(http[s]?:\/\/){0,1}(www\.){0,1}[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,5}[\.]{0,1}/
                if(re.test(info)) {
                    this._task.taskTypeURL = info
                    this.currentActionInput = this.actionInputModels.none
                    this.actionTextInput = ''
                    this.saveTaskUpdate()
                } else {
                    this.isLinkInvalid = true
                }
            } 
        },
        none: { input : ActionInputType.None, placeholder : 'none', update : () => {}, completion : (actionInfo : string) => {} }
    }

    recurrenceRows : RecurrenceRow[] = [
        { label : "None",            type : TaskRecurrenceType.None         },
        { label : "Every Day",       type : TaskRecurrenceType.Daily        },
        { label : "Every Week",      type : TaskRecurrenceType.Weekly       },
        { label : "Every Two Weeks", type : TaskRecurrenceType.Biweekly     },
        { label : "Every Month",     type : TaskRecurrenceType.Monthly      },
        { label : "Quarterly",       type : TaskRecurrenceType.Quarterly    },
        { label : "Semiannually",    type : TaskRecurrenceType.Semiannually },
        { label : "Every Year",      type : TaskRecurrenceType.Yearly       },
        { label : "Every X days", type : TaskRecurrenceType.Advanced, advancedType : AdvancedRecurrenceType.EveryXDaysWeeksMonths },
        { label : "The X day of each month", type : TaskRecurrenceType.Advanced, advancedType : AdvancedRecurrenceType.TheXOfEachMonth },
        { label : "On days of the week", type : TaskRecurrenceType.Advanced, advancedType : AdvancedRecurrenceType.EveryMonTueEtc },
        { label : "Repeat with parent", type : TaskRecurrenceType.WithParent }
    ]
    readonly AdvancedRecurrenceType = AdvancedRecurrenceType
    showAdvancedRecurrence : AdvancedRecurrenceType = AdvancedRecurrenceType.Unknown
    TaskRecurrenceType = TaskRecurrenceType

    _task        : TCTask = new TCTask()
    listForTask  : TCList = new TCList()
    notificationRows   : NotificationRow[] = []
    commentRows        : CommentRow[] = []
    taskTags           : TCTag[] = []
    dueDateModel       : NgbDateStruct
    startDateModel     : NgbDateStruct
    completedDateModel : NgbDateStruct
    taskEditPublisher  : EditedTaskUpdatePublisher
    taskOriginName     : string
    taskName           : string = ""
    saveTaskNameOnBlur : boolean = false
    TaskPriority = TaskPriority
    notificationSubscription : Subscription
    notificationEditorID : string = null
    
    private resetUI : boolean = true

    set task(task : TCTask) {
        if (!task) return
        this._task = task
        this.taskOriginName = this._task.name
        this.taskName = this.taskOriginName

        if (this.resetUI) {
            this.notificationRows = []
            this.commentRows = []
            this.saveTaskNameOnBlur = false
            this.openNoteEditor = false
            this.showComments = false
            this.showListSelect = false
            this.showRecurrenceSelect = false
            this._showTagEditor = false
            this.showLocationAlertSelect = false
            this.currentActionInput = this.actionInputModels.none
            this._currentCompletionState = this.completionService.taskIsBeingCompleted(this._task) ? TaskCompletionState.Saving : TaskCompletionState.None
        }
        this.resetUI = true

        this.notificationService.notificationsForTask(task).first().subscribe(notifications => {
            this.notificationRows = notifications
                .sort((a, b) => {
                    return a.triggerOffset - b.triggerOffset
                })
                .map(notification => {
                    return { notification : notification, updating: false }
                })
        })

        this.listService.lists.take(1).subscribe(pub => {
            this.listForTask = pub.lists.find(list => this._task.listId == list.identifier)
        })
        
        this.commentService.commentsForTask(task).first().subscribe(comments => {
            this.commentRows = comments.map((e) : CommentRow => { return { commentWithUser : e, updating : false } } )
        })

        this.taskTags = []
        this.tagService.tagsForTask(this._task).first().subscribe(tags => {
            this.taskTags = tags
        })

        const now = new Date()
        this.dueDateModel       = task.hasDueDate ? this.dateToDateStruct(task.dueDate) : null
        this.startDateModel     = task.hasStartDate ? this.dateToDateStruct(task.startDate) : null
        this.completedDateModel = task.isCompleted ? this.dateToDateStruct(task.completionDate) : null
        this.activeGroupOverlay = false
        this.repeatFrom = task.getRepeatFromType()

        if (this._task.identifier) {
            if (this._task.hasDueDate) 
                this.dueDateInput = new Date(this._task.dueDate)
            else
                this.dueDateInput = new Date()
            if (this._task.hasStartDate) 
                this.startDateInput = new Date(this._task.startDate)
            else
                this.startDateInput = new Date()
        }
    }

    readonly defaultTaskName : string = 'New Task'
    readonly currentDate : any = new Date()

    firstDayOfWeek :number = 7

    assigned:string

    dueDateInputInvalid   : boolean = false
    startDateInputInvalid : boolean = false

    constructor(
        private readonly taskService : TCTaskService,
        private readonly listService : TCListService,
        private readonly notificationService : TCTaskNotificationService,
        private readonly commentService : TCCommentService,
        private readonly locationService: TCLocationService,
        private readonly accountService : TCAccountService,
        private readonly completionService : TaskCompletionService,
        private readonly taskEditService : TaskEditService,
        private readonly paywallService : PaywallService,
        private readonly tagService : TCTagService,
        private readonly syncService: TCSyncService,
        private modalService     : NgbModal,
        private readonly hotkeyService: TCHotkeyService,
        private appSettingsService: TCAppSettingsService
    ) {
        this.openNoteEditor = false

        this.assigned = ''

        this.hotkeySubscription = hotkeyService.commands.subscribe(hotkeyEvent => this.handleCommand(hotkeyEvent))

        this.firstDayOfWeek = parseInt(this.appSettingsService.calendarFirstDayDP)
    }

    ngOnInit() {
        this.accountService.account.take(1).subscribe(account => {
            this.account = account
        })
        this.locationService.currentPosition.first().subscribe(position => {
            this.latitude = position.lat
            this.longitude = position.lng
        },
        err => {
            this.hasCurrentPositionError = true
            this.locationErrorNumber = err
        })
        
        this.taskEditService.editedTask
            .filter(info => info.state == TaskEditState.Beginning)
            .subscribe(info => {
                this.task = info.task
                this.taskEditPublisher = info.publisher
            })

        this.taskEditService.editedTask
            .filter(info => info.state == TaskEditState.Finished)
            .subscribe(info => {
                this._task = new TCTask()
            })

        this.taskEditService.editedTask
            .filter(info => info.state == TaskEditState.AfterSync)
            .subscribe(info => {
                if (!(this._task && this._task.identifier)) {
                    return
                }

                this.resetUI = false
                this.task = info.task
            })

        this.taskService.taskDeleted.subscribe(task => {
            if (task.idEqual(this._task)) {
                this.finishEditTask()
            }
        })

        if (this._task.identifier) {
            if (this._task.hasDueDate) 
                this.dueDateInput = new Date(this._task.dueDate)
            else
                this.dueDateInput = new Date()
            if (this._task.hasStartDate) 
                this.startDateInput = new Date(this._task.startDate)
            else
                this.startDateInput = new Date()
        }
    }

    ngOnDestroy() {
        this.hotkeySubscription.unsubscribe()
    }

    removeActionData() {
        this._task.removeTaskTypeData()
        if (!this._task.isChecklist && !this._task.isProject) {
            this._task.taskType = TaskType.Normal
        }
        this.saveTaskUpdate()
    }

    saveTaskUpdate() : Observable<TCTask> {
        const obs = this.taskService.update(this._task).first()
        obs.subscribe(result => {
            this.taskOriginName = this._task.name
        })
        return obs
    }

    finishEditTask() {
        this.taskEditService.finishEditTask(this._task)
    }

    updateTaskName(name : string) {
        if (name && name.trim().length > 0) {
            if (this._task.taskType > 0) {
                this.taskName = Utils.capitalizeWord(name.trim())
            } else {
                this.taskName = Utils.capitalizeSentence(name.trim())
            }
        }
    }

    onTaskNameBlur(name : string) {
        if (!this.saveTaskNameOnBlur) return
        this.saveTaskName(name)
    }

    saveTaskName(name : string) {
        if (this.taskNameInput) {
            this.taskNameInput.nativeElement.blur()
        }
        if(name.trim() === this.taskOriginName) return
        this.updateTaskName(name.trim())
        this._task.name = this.taskName
        this.saveTaskUpdate()
    }

    checkEmptyTaskName(name : string){
        if (name.trim().length === 0) {
            this.taskName = this.defaultTaskName
        }
    }
    selectTaskName(){
        if (this.taskNameInput) {
            this.taskNameInput.nativeElement.select()
            this.saveTaskNameOnBlur = true
        }
    }

    starredTask() {
        this._task.starred = !this._task.starred
        this.saveTaskUpdate()
    }

    dateStructToDate(dateStruct : NgbDateStruct) : Date {
        // NgbDateStruct uses a 1 based system for months, ES Date uses a 0 based system.
        return new Date(dateStruct.year, dateStruct.month - 1, dateStruct.day)
    }

    dateToDateStruct(date : Date) : NgbDateStruct {
        return {
            year : date.getFullYear(),
            month: date.getMonth() + 1,
            day  : date.getDate()
        }
    }

    updateDueDate(model : NgbDateStruct) {
        if (!model) return

        this.dueDateModel = model
        const newDate = this.dateStructToDate(this.dueDateModel)
        const oldDate = this._task.dueDate

        if(oldDate && moment(newDate).diff(oldDate, 'minutes') === 0) return

        if (oldDate) {
            newDate.setHours(oldDate.getHours())
            newDate.setMinutes(oldDate.getMinutes())
        }

        const baseNotificationRow = this.notificationRows.find(row => row.notification.triggerOffset == 1)
        const baseNotification = baseNotificationRow ? baseNotificationRow.notification : null
        if (baseNotification) {
            for (const row of this.notificationRows) {
                const notification = row.notification

                notification.triggerDate = new Date(newDate)
                this.notificationService.update(notification).first().subscribe(result => {})
            }
        }

        this._task.dueDate = newDate
        this.dueDateInput = new Date(this._task.dueDate)

        if (this._task.hasStartDate && this._task.startDate > newDate) {
            this._task.startDate = new Date(newDate)
            this.startDateInput = new Date(this._task.startDate)
            this.startDateModel = {
                year : model.year,
                month : model.month,
                day : model.day
            }
        }

        this.saveTaskUpdate().subscribe(() => {
            this.taskEditPublisher.dueDateUpdated({ task: this._task, oldDate : oldDate, newDate : newDate })
        })
        this.dueDateInputInvalid = false
        this.dueDateDatePickerDrop.close()
    }

    dueDatePickerClicked(event, dueDateDropDown) {
        // Build the path of the event
        const buildPath = (target, accumulator : Array<any> = []) : Array<any> => {
            accumulator.push(target)
            return target.parentNode ? buildPath(target.parentNode, accumulator) : accumulator
        }
        const path = buildPath(event.target)

        // Search for the ngb-datepicker-month-view
        const clickedOnMonthView = path.reduce((accum : boolean, current) : boolean => {
            return accum || (current.tagName && current.tagName.toLowerCase() == 'ngb-datepicker-month-view')
        }, false)

        // Close if clicked on month view
        if (!clickedOnMonthView) return
        dueDateDropDown.close()
    }

    removeDueDate() {
        const oldDate = this._task.dueDate
        this.dueDateModel = null
        this.startDateModel = null
        this._task.dueDate = null
        this._task.startDate = null
        this.dueDateInput = new Date()
        this.startDateInput = new Date()

        this.saveTaskUpdate().subscribe(() => {
            this.taskEditPublisher.dueDateUpdated({ task : this._task, oldDate : oldDate, newDate : null })
        })

        if (this.notificationRows.length > 0) {
            const mainNotification = this.notificationRows.find( row => row.notification.triggerOffset == 1 ).notification
            this.removeNotification(mainNotification)
        }
    }

    isInvalidStartDate = (model : NgbDateStruct) : boolean => {
        const date = this.dateStructToDate(model)
        return !this._task.hasDueDate || date > this._task.dueDate
    }

    updateStartDate(model: NgbDateStruct) {
        if (!model || !this._task.hasDueDate) return 

        const oldDate = this._task.startDate
        this.startDateModel = model
        const newDate = this.dateStructToDate(this.startDateModel)

        if(oldDate && moment(newDate).diff(oldDate, 'minutes') === 0) return

        if (newDate > this._task.dueDate) {
            this._task.startDate = new Date(this._task.dueDate)
            this.startDateInput = new Date(this._task.startDate)
            this.startDateModel = this.dateToDateStruct(this._task.dueDate)
        }
        else {
            this._task.startDate = newDate
            this.startDateInput = new Date(this._task.startDate)
        }
        
        this.saveTaskUpdate().subscribe(() => {
            this.taskEditPublisher.startDateUpdated({ task : this._task, oldDate : oldDate, newDate : new Date(newDate) })
        })
        this.startDateDatePickerDrop.close()
        this.startDateInputInvalid = false

    }

    removeStartDate() {
        this.startDateModel = null
        this._task.startDate = null
        this.startDateInput = new Date()
        this.saveTaskUpdate()
    }

    toggleDueDateCalendar(event) {
        event.stopPropagation()
        this.dueDateInput = this._task.dueDate ? new Date(this._task.dueDate) : new Date()
        this.setViewForDueDate()
        if(this.startDateDatePickerDrop)
            this.startDateDatePickerDrop.close()
        this.dueDateDatePickerDrop.toggle()
    }

    toggleStartDateCalendar(event) {
        event.stopPropagation()
        this.startDateInput = this._task.startDate ? new Date(this._task.startDate) : new Date()
        this.setViewForStartDate()
        if(this.dueDateDatePickerDrop)
            this.dueDateDatePickerDrop.close()
        this.startDateDatePickerDrop.toggle()
    }

    completeTask() {
        if (this.currentCompletionState == TaskCompletionState.Saving) return

        this.currentCompletionState = this.currentCompletionState >= TaskCompletionState.Error ?
            TaskCompletionState.Initial : TaskCompletionState.None

        if (this.currentCompletionState != TaskCompletionState.None) {
            this.currentCompletionState = TaskCompletionState.Initial

            this.animationTimeoutId = setTimeout(() => {
                this.completeTaskSave()
                this.resetCompleteTask()
            }, 400)
        } else {
            clearTimeout(this.animationTimeoutId)
            this.currentCompletionState = TaskCompletionState.None
            this.resetCompleteTask()
        }
    }
    
    completeTaskSave(){
        this.currentCompletionState = TaskCompletionState.Saving

        this.taskService.completeTask(this._task).first().subscribe((response : CompleteTasksResponse) => {
            if (!response.completedTaskIDs.reduce((accum, curr) => accum || this._task.identifier == curr, false)) return

            let completeTasks : TCTask[] = []
            let repeatTasks  : TCTask[] = []

            completeTasks = completeTasks.concat(response.newTasks)
            repeatTasks = repeatTasks.concat(response.repeatedTasks)
            const currentIdentifier = this._task.identifier
            const mainRepeatTask = repeatTasks.find(function(task) { return task.identifier == currentIdentifier })

            if(mainRepeatTask) {
                this.currentCompletionState = TaskCompletionState.None
                this._task = mainRepeatTask
                completeTasks.map(task => this.taskEditPublisher.completedTask(task))
                repeatTasks.map(task => this.taskEditPublisher.repeatedTask(task))
            } else {
                const completionDate = new Date()
                this.completedDateModel = this.dateToDateStruct(completionDate)
                this._task.completionDate = completionDate
                this.taskEditPublisher.completedTask(this._task)
                this.currentCompletionState = TaskCompletionState.None
            }
        })
    }

    resetCompleteTask() {
        clearInterval(this.countdownIntervalId)
        this.countdownIntervalId = null

        this.innerCountdownTimer = 0
        this.currentCountdownProgress = 0

        this.circleBar.nativeElement.style.removeProperty('stroke-dashoffset')
        this.circleBar.nativeElement.style.removeProperty('stroke-dasharray')
    }

    uncompleteTask() {
        this.currentCompletionState = TaskCompletionState.Saving

        this.taskService.uncompleteTask(this._task).first().subscribe((uncompletedTasks : CompleteTasksResponse) => {
            if (!uncompletedTasks.completedTaskIDs.reduce((accum, curr) => accum || this._task.identifier == curr, false)) return

            this.completedDateModel = null
            this._task.completionDate = null
            this.taskEditPublisher.uncompletedTask(this._task)
            this.currentCompletionState = TaskCompletionState.None
        })
    }

    updatePriority(priority : TaskPriority) {
        const oldPriority = this._task.priority
        this._task.priority = priority
        this.taskEditPublisher.priorityUpdated({ task : this._task, oldPriority : oldPriority, newPriority : this._task.priority })
        this.saveTaskUpdate()
    }

    toggleNoteEditor(state? : boolean) {
        if (typeof state !== 'undefined') {
            this.openNoteEditor = state
        } else {
            this.openNoteEditor = !this.openNoteEditor
        }

        if (this.openNoteEditor) {
            this.activeGroupOverlay = true
            this.noteTextarea.nativeElement.value = this._task.note
            this.noteTextarea.nativeElement.focus()
        } else {
            this.activeGroupOverlay = false
            this.noteTextarea.nativeElement.value = this._task.note
        }

    }

    updateNote(text:string) {
        this._task.note = text.trim()
        this.saveTaskUpdate()
        this.toggleNoteEditor(false)
    }

    showNoteEditPopupModal() {
        const modalRef = this.modalService.open(TaskNoteEditPopupComponent)
        const noteEditComponent : TaskNoteEditPopupComponent = modalRef.componentInstance

        noteEditComponent.noteText = this._task.note
        noteEditComponent.saveNoteUpdate.subscribe(noteText => {
            this.updateNote(noteText)
        })
    }

    creatingNotification = false
    addNotification() {
        if (this.creatingNotification) return
            
        this.notificationEditorID = null

        let now = new Date()
        let date = this._task.dueDate ? this._task.dueDate : new Date()
        date.setSeconds(0, 0)
        date.setHours(now.getHours() + 1)
        let triggerOffset = 1
        const baseNotificationRow = this.notificationRows.find(row => row.notification.triggerOffset == 1)

        const finishAddNotification = () => {
            if (triggerOffset < 0) {
                // No more notification options are available, so do nothing
                return
            }
    
            const newNotification = new TCTaskNotification({ 
                taskid        : this._task.identifier,
                sound_name    : 'bell', 
                triggerdate   : Math.floor(date.getTime() / 1000),
                triggeroffset : triggerOffset
            })
    
            this.creatingNotification = true
            this.notificationService.create(newNotification).first().subscribe(response => {
                this.creatingNotification = false
    
                this.notificationRows.push({notification : response})
    
    
                const oldDate = this._task.dueDate ? new Date(this._task.dueDate) : null
                const newDate = new Date(newNotification.triggerDate)
    
                this._task.dueDate = new Date(newNotification.triggerDate)
                this.dueDateInput = new Date(this._task.dueDate)
                this._task.dueDateHasTime = true
                this.saveTaskUpdate()
    
                if (triggerOffset == 1) {
                    this.taskEditPublisher.dueDateUpdated({ task : this._task, oldDate : oldDate, newDate : newDate })
                }
            })
        }

        if (baseNotificationRow) {
            this.paywallService.paywallCheck("Multiple notifications is a premium feature.", 
                () => {
                    triggerOffset = this.nextAvailableNotificationOffset()
                    date = baseNotificationRow.notification.triggerDate
                    finishAddNotification()
                }
            )
        }
        else {
            finishAddNotification()
        }
    }

    // Returns the next available notification offset (in seconds) or
    // -1 if an offset is no longer available.
    nextAvailableNotificationOffset() : number {
        const availableOffset = OffsetTimes.selectableOffsets.find(offset => {
            // Return the first item NOT present in the current
            // notificationRows array.
            const existingNotification = this.notificationRows.find(notificationRow => {
                const notification = notificationRow.notification
                return notification.triggerOffset == offset
            })
            return !existingNotification
        })

        return availableOffset >= 0 ? availableOffset : -1
    }

    updateBaseNotificationTime(notification : TCTaskNotification) {
        if (notification.triggerOffset != 1) return

        const oldDate = new Date(this._task.dueDate)
        const newDate = new Date(notification.triggerDate)
        newDate.setSeconds(0,0)

        this._task.dueDate = new Date(notification.triggerDate)
        this.dueDateInput = new Date(this._task.dueDate)
        this._task.dueDateHasTime = true
        this.saveTaskUpdate()

        for (const row of this.notificationRows) {
            const n = row.notification
            if (n.triggerOffset == 0) continue

            n.triggerDate = new Date(notification.triggerDate)
            this.notificationService.update(n).first().subscribe(result => {
                this.taskEditPublisher.dueDateUpdated({ task : this._task, oldDate : oldDate, newDate : newDate })
            })
        }
    }

    removeNotification(notification : TCTaskNotification) {
        const filter = deletedNotification => e => { 
            return e.notification.identifier != deletedNotification.identifier
        }
        const subscribeFunc = deletedNotification => result => {
            this.notificationRows = this.notificationRows.filter(filter(deletedNotification))
        }
        const deleteFunc = deleteNotification => {
            this.notificationService.delete(deleteNotification).first().subscribe(subscribeFunc(deleteNotification))
        }

        if (notification.triggerOffset == 1) {
            for (const row of this.notificationRows) {
                const deleteNotification = row.notification
                deleteFunc(deleteNotification)
            }

            // Sometimes the notification gets removed at the same time as the due date
            // so we should check.
            if (this._task.hasDueDate) {
                this._task.dueDate.setHours(0)
                this._task.dueDate.setMinutes(0)
                this.dueDateInput = new Date(this._task.dueDate)
            }
            this._task.dueDateHasTime = false
            this.saveTaskUpdate()
        }
        else {
            deleteFunc(notification)
        }
    }

    openNotificationEditor(identifier : string){
        this.notificationEditorID = identifier
    }

    onOffsetPicked(notification: TCTaskNotification) {
        setTimeout(() => {
            this.notificationEditorID = null
        }, 0)
    }

    taskListMembershipChange(list : TCList) {
        this.taskEditPublisher.changedList({ task : this._task, newList : list })
        this.listForTask = list
        this.saveTaskUpdate()
    }

    removeComment(commentRow : CommentRow) {
        const comment = commentRow.commentWithUser.comment
        commentRow.updating = true
        this.commentService.delete(comment).first().subscribe(res => {
            this.commentRows = this.commentRows.filter(element => comment.identifier != element.commentWithUser.comment.identifier)
        })
    }

    commentInputModel : string = ''

    addComment(text : string) {
        text = text.trim()
        if (!text || !(text.length > 0)) return

        const commentText = new String(text)
        this.accountService.account.first().subscribe(account => {
            const comment = new TCComment({
                itemid : this._task.identifier,
                userid : account.userID,
                text : commentText,
                item_name : this._task.name
            })
            
            const row = { commentWithUser : { comment : comment, user : account }, updating : true }
            this.commentRows.push(row)
            this.commentService.create(comment).first().subscribe(res => {
                this.commentRows = this.commentRows.map((e : CommentRow) : CommentRow => {
                    if (e === row) {
                        return { commentWithUser: { comment : res, user : account }, updating : false }
                    }
                    return e
                })
            })
        })  

        this.commentInputModel = ''      
    }


    hasCurrentPositionError : boolean = false
    locationErrorNumber : number = 0
    latitude  : number = 0
    longitude : number = 0
    currentAddress : string = ''
    mapZoomLevel = 8

    mapClick(event : MapMouseClick) {
        this.latitude = event.coords.lat
        this.longitude = event.coords.lng

        this.locationService.getAddressFromMapCoords(this.latitude, this.longitude).first().subscribe(address => {
            this.currentAddress = address
        })
    }

    searchForAddress(address : string) {
        this.locationService.getMapCoordsFromAddress(address).first().subscribe((info : { coords : any, formattedAddress : string }) => {
            this.mapZoomLevel = 16
            this.latitude = info.coords.lat
            this.longitude = info.coords.lng
            this.currentAddress = info.formattedAddress
        })
    }

    mapOKClicked() {
        this._task.taskTypeLocation = this.currentAddress
        this.currentActionInput = this.actionInputModels.none
        this.saveTaskUpdate()
    }

    RepeatFromType = RepeatFromType
    repeatFrom : RepeatFromType = RepeatFromType.DueDate

    recurrenceRowSelected(recurrenceRow : RecurrenceRow) {
        this._task.determineRecurrenceType(recurrenceRow.type, this.repeatFrom)
        this.showRecurrenceSelect = recurrenceRow.type == TaskRecurrenceType.Advanced

        if (recurrenceRow.type == TaskRecurrenceType.Advanced) {
            this.showAdvancedRecurrence = recurrenceRow.advancedType
            return
        }
        this.saveTaskUpdate()
    }

    selectRepeatFromType(repeatFrom : RepeatFromType) {
        this.repeatFrom = repeatFrom
        const recurrenceValue = this._task.recurrenceType > 100 ? this._task.recurrenceType - 100 : this._task.recurrenceType
        this._task.determineRecurrenceType(recurrenceValue, this.repeatFrom)
        this.saveTaskUpdate()
    }

    onAdvancedRecurrenceStringReceived(recurrence : string) {
        if (!recurrence) this._task.recurrenceType = TaskRecurrenceType.None
        this._task.advancedRecurrenceType = recurrence
        this.showAdvancedRecurrence = AdvancedRecurrenceType.Unknown
        this.showRecurrenceSelect = false
        this.saveTaskUpdate()
    }

    determineRecurrenceRowMessage() : string {
        const recurrenceValue = this._task.recurrenceType > 100 ? this._task.recurrenceType - 100 : this._task.recurrenceType
        if (recurrenceValue == TaskRecurrenceType.Advanced) {
            return this._task.advancedRecurrenceType
        }
        return this.recurrenceRows.find( val => val.type == recurrenceValue ).label
    }
    
    openComments() {
        this.showComments = !this.showComments
        if (this.showComments) {
            this.commentInputModel = ''
            this.taskCommentInput.nativeElement.focus()
        }
    }

    removeLocationAlertInformation() {
        this._task.locationAlert = ''
        this.saveTaskUpdate()
    }

    toggleLocationAlert() {
        this.showLocationAlertSelect = !this.showLocationAlertSelect
        if (!this.showLocationAlertSelect) {
            return // select screen closed
        }

        this.showLocationAlertSelect = false // Hide it until we check with paywall
        this.paywallService.paywallCheck('Premium accounts can set location alerts on tasks', () => {
            this.showLocationAlertSelect = true // Paywall check passed
        })
    }

    onTagSelected(tag : TCTag) {
        this.taskTags.push(tag)
    }

    onTagDeselected(tag : TCTag) {
        this.taskTags = this.taskTags.filter(t => t.identifier != tag.identifier)
    }

    chooseDate(dayOffset : number = 0){
        let date = moment()
        if (dayOffset > 0) date.add(dayOffset, 'days')
        return this.dateToDateStruct(date.toDate())
    }
    dateStructsAreEqual(firstDate: NgbDateStruct, secondDate: NgbDateStruct) {
        if (!firstDate || !secondDate) return false

        return firstDate.day == secondDate.day &&
            firstDate.month == secondDate.month &&
            firstDate.year == secondDate.year
    }

    updateDueDateViaField(dueDate : Date) {
        const date = moment(dueDate)
        if (this.dueDateFieldDay.nativeElement.value && this.dueDateFieldMonth.nativeElement.value && this.dueDateFieldYear.nativeElement.value && date.isValid() && date.year() >= 1900 && date.year() < 3000) {
            this.updateDueDate(this.dateToDateStruct(date.toDate()))
        } else {
            this.dueDateInputInvalid = true
        }
    }

    updateStartDateViaField(startDate : Date) {
        const date = moment(startDate)
        if (this.startDateFieldDay.nativeElement.value && this.startDateFieldMonth.nativeElement.value && this.startDateFieldYear.nativeElement.value && date.isValid() && date.year() > 1900 && date.year() < 3000 ) {
            this.updateStartDate(this.dateToDateStruct(date.toDate()))
        } else {
            this.startDateInputInvalid = true
        }
    }
    
    validateDateInput(event : any, dateString : string){
        if ([46, 8, 9, 27, 13, 190].indexOf(event.keyCode) !== -1 ||
            // Allow: Ctrl+A
            (event.charCode === 97 && (event.ctrlKey || event.metaKey)) ||
            // Allow: Ctrl+C
            (event.charCode === 99 && (event.ctrlKey || event.metaKey)) ||
            // Allow: Ctrl+V
            (event.charCode === 118 && (event.ctrlKey || event.metaKey)) ||
            // Allow: Ctrl+X
            (event.charCode === 120 && (event.ctrlKey || event.metaKey)) ||
            // Allow: home, end, left, right
            (event.keyCode >= 35 && event.keyCode <= 39)) {
                // let it happen, don't do anything
                return
        }
        // Ensure that it is a number and stop the keypress
        if (event.shiftKey || event.charCode < 48 || event.charCode > 57) {
            return false
        }
    }

    changedDueDateInput(dateString : string, type : number) {
        var maxlength = 2
        var minValue = 1
        var maxValue = 31
        if(dateString.length > 0) {
            if(type == 2) {
                maxlength = 4
                minValue = 1900
                maxValue = 2999
                if (dateString.length < maxlength || (+dateString <= maxValue && +dateString >= minValue)) {
                    this.dueDateInput.setFullYear(+dateString)
                }
            } else if (type == 1) {
                maxlength = 2
                minValue = 1
                maxValue = 12
                if (dateString.length < maxlength || (+dateString <= maxValue && +dateString >= minValue)) {
                    this.dueDateInput.setMonth(+dateString - 1)
                }
            } else {
                if (dateString.length < maxlength || (+dateString <= maxValue && +dateString >= minValue)) {
                    this.dueDateInput.setDate(+dateString)
                }
            }
            this.setViewForDueDate()
        }
    }

    setViewForDueDate() {
        this.dueDateFieldDay.nativeElement.value = moment(this.dueDateInput).format('D')
        this.dueDateFieldMonth.nativeElement.value = moment(this.dueDateInput).format('M')
        this.dueDateFieldYear.nativeElement.value = moment(this.dueDateInput).format('Y')
    }

    changedStartDateInput(dateString : string, type : number) {
        var maxlength = 2
        var minValue = 1
        var maxValue = 31
        if(dateString.length > 0) {
            if(type == 2) {
                maxlength = 4
                minValue = 1900
                maxValue = 2999
                if (dateString.length < maxlength || (+dateString <= maxValue && +dateString >= minValue)) {
                    this.startDateInput.setFullYear(+dateString)
                }
            } else if (type == 1) {
                maxlength = 2
                minValue = 1
                maxValue = 12
                if (dateString.length < maxlength || (+dateString <= maxValue && +dateString >= minValue)) {
                    this.startDateInput.setMonth(+dateString - 1)
                }
            } else {
                if (dateString.length < maxlength || (+dateString <= maxValue && +dateString >= minValue)) {
                    this.startDateInput.setDate(+dateString)
                }
            }
            this.setViewForStartDate()
        }
    }

    setViewForStartDate() {
        this.startDateFieldDay.nativeElement.value = moment(this.startDateInput).format('D')
        this.startDateFieldMonth.nativeElement.value = moment(this.startDateInput).format('M')
        this.startDateFieldYear.nativeElement.value = moment(this.startDateInput).format('Y')
    }

    moveCursor(field1, field2, direction) {
        if(field1.selectionStart || field1.selectionStart == '0') {
            if(direction == 0 && field1.value.length == field1.selectionStart){
                field1.blur()
                field2.selectionStart = 0
                field2.selectionEnd = 0
                field2.focus()
                return false
            }
            if(direction == 1 && field1.selectionStart == '0') {
                field1.blur()
                field2.selectionStart = field2.value.length
                field2.selectionEnd = field2.value.length
                field2.focus()
                return false
            }
        }
    }

    setNotificationhours(e : any, notification : TCTaskNotification, input : string) {
        let hour = parseInt(input)
        if (hour == NaN) return

        const isOriginalPM = notification.triggerDate.getHours() > 12

        const time = moment(notification.triggerDate)
        if (isOriginalPM && hour < 12) { hour += 12 } // keep in the PM: https://github.com/Appigo/todo-issues/issues/3205
        time.hour(hour)
        this.updateRootNotificationTime(time)
        this.updateBaseNotificationTime(notification)
    }
    setNotificationMinutes(e : any, notification : TCTaskNotification, input : string) {
        const minute = parseInt(input)
        if (minute == NaN) return

        const time = moment(notification.triggerDate)
        time.minutes(minute)
        this.updateRootNotificationTime(time)
        this.updateBaseNotificationTime(notification)
    }

    changeNotificationHours(e : any, notification : TCTaskNotification){
        e.preventDefault()
        if(e.keyCode !== 38 && e.keyCode !== 40) return

        let time = moment(notification.triggerDate)
        if (e.keyCode === 38) {
            time.add(1, 'hours')
        } else if (e.keyCode === 40) {
            time.subtract(1, 'hours')
        }

        this.updateRootNotificationTime(time)
        this.updateBaseNotificationTime(notification)
        setTimeout(() => {
            this.notificationHoursElement.nativeElement.focus()
        }, 0)
    }
    changeNotificationMinutes(e : any, notification : TCTaskNotification){
        e.preventDefault()
        if(e.keyCode !== 38 && e.keyCode !== 40) return
        let time = moment(notification.triggerDate)
        if (e.keyCode === 38) {
            time.add(5, 'minutes')
        } else if (e.keyCode === 40) {
            time.subtract(5, 'minutes')
        }

        this.updateRootNotificationTime(time)
        this.updateBaseNotificationTime(notification)
        setTimeout(() => {
            this.notificationMinutesElement.nativeElement.focus()
        }, 0)
    }

    notificationUpdateMeridiem(meridiem: string, notification: TCTaskNotification) {
        let time = moment(notification.triggerDate)

        if (meridiem == 'AM') {
            time.add(12, 'hours')
        } else {
            time.subtract(12, 'hours')
        }

        this.updateRootNotificationTime(time)
        this.updateBaseNotificationTime(notification)
    }
    updateRootNotificationTime(time : any){
        time.year(this._task.dueDate.getFullYear()).month(this._task.dueDate.getMonth()).date(this._task.dueDate.getDate())
        this.notificationRows[0].notification.triggerDate = time.toDate()
    }
    updateAction(action) {
        this.currentActionInput = action
        if(action.input == 1) {
            this.actionPhoneInput.nativeElement.focus()
        }else{
            this.actionInput.nativeElement.focus()
        }
    }
    handleActionLinkClick(event, url) {
        event.preventDefault()
        if (environment.isElectron) {
            Utils.openUrlInDefaultBrowser(url)
        } else {
            window.open(url, '_blank')
        }
    }
    recurranceRowsForEditedTasks = () => {
        return this.recurrenceRows.filter(row => row.type != TaskRecurrenceType.WithParent || ( row.type == TaskRecurrenceType.WithParent && this._task.isSubtask ))
    }
    private handleCommand(hotkeyEvent : HotkeyEventModel) {
        if (hotkeyEvent.name == 'Modal.cancel' && this.taskEditorIsOpen && this._task.identifier) {
            this.finishEditTask()
        }
    }
}
