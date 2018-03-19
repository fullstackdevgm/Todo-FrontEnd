import {ViewChild, Component, OnInit, OnDestroy, Input, Output, EventEmitter, HostListener, ElementRef }  from '@angular/core'
import { PerfectScrollbarComponent, PerfectScrollbarDirective } from 'ngx-perfect-scrollbar'
import { AppMenuIdentifier, AppMenuService} from '../../services/app-menu.service'
import { TCTaskService } from '../../services/tc-task.service'
import { TCTaskitoService } from '../../services/tc-taskito.service'
import { TaskCompletionService } from '../../services/task-completion.service'
import { TCListService } from '../../services/tc-list.service'
import { TCSmartListService } from '../../services/tc-smart-list.service'
import { TCUserSettingsService } from '../../services/tc-user-settings.service'
import { TCSyncService } from '../../services/tc-sync.service'
import { TaskEditService, TaskUpdate } from '../../services/task-edit.service'
import { CalendarService } from '../../services/calendar.service'
import { PaywallService } from '../../services/paywall.service'
import { SearchService } from '../../services/search.service'
import { NgbModal }  from '@ng-bootstrap/ng-bootstrap'
import { TaskDeleteConfirmationComponent }    from '../../components/task/task-delete-confirmation/task-delete-confirmation.component'
import { TCUserSettings } from '../../classes/tc-user-settings'
import { TCObject } from '../../classes/tc-object'
import { TCList } from '../../classes/tc-list'
import { TCSmartList } from '../../classes/tc-smart-list'
import { TCTask } from '../../classes/tc-task'
import { TCTaskito } from '../../classes/tc-taskito'
import { environment } from '../../../environments/environment'
import { TCTaskNotificationService } from "../../services/tc-task-notification.service"
import { TCTaskNotification, OffsetTimes } from "../../classes/tc-task-notification"
import { TaskPriority, TaskType, DefaultDueDate, TaskEditState, ListPublishInformation } from '../../tc-utils'
import { TaskCreatedEvent, TaskitoCreatedEvent } from '../../tc-types'
import { HotkeyEventModel, TCHotkeyService } from '../../services/tc-hotkey.service'
import { DragulaService } from 'ng2-dragula'

import { 
    TaskSource, 
    ListTaskSource, 
    SmartListTaskSource,
    SearchTaskSource
} from './task-source-modules'
import { TaskPager, PagerServices } from './task-pager'
import { TaskCell, TaskCellImpl, TaskSortFunctions, TaskitoSortFunctions } from './task-cell'
import { TaskCreationInformation } from './task-create.component'
import { TypeUpdate } from '../task/task.component'
import { Subscription, Observable } from 'rxjs'
import { 
    DragAndDropAction, 
    DetermineDragAndDropAction, 
    GetDragAndDropConditions ,
    HeaderDropFunctions
} from './task-drag-and-drop-action'
import { TaskSectionDefinition } from '../../tc-types'
import * as moment from 'moment'

interface SelectedTaskInformation {
    cell    : TaskCell,
    section : TaskSectionDefinition,
    parent? : TaskCell
}

@Component({
    selector: 'tasks',
    templateUrl: 'tasks.component.html',
    styleUrls: ['tasks.component.css',
        './../../../../node_modules/dragula/dist/dragula.css'
    ]
})
export class TasksComponent implements OnDestroy {
    sourceModule : TaskSource
    selectedDates : Date[] = []
    keyTracking   : boolean = true
    loadingCompletedTasks : boolean = false
    isDeleteDialogOpen : boolean = false

    get primarySelectedTask() : SelectedTaskInformation {
        if (this.selectedTasks.length > 1) {
            return null
        }

        return this.selectedTasks[0]
    }
    selectedTasks : SelectedTaskInformation[] = []
    private clearSelectedTasks() {
        this.selectedTasks = []
        if (environment.isElectron) {
            this.updateMenuActions()
        }
    }
    private setSelectedTask(info : SelectedTaskInformation) {
        this.selectedTasks = [info]
        if (environment.isElectron) {
            this.updateMenuActions()
        }
    }
    private addSelectedTask(info : SelectedTaskInformation) {
        this.selectedTasks.push(info)
        if (environment.isElectron) {
            this.updateMenuActions()
        }
    }
    private removeSelectedTask(task : TCTask) {
        this.selectedTasks = this.selectedTasks.filter(i => i.cell.task.identifier != task.identifier)
        if (environment.isElectron) {
            this.updateMenuActions()
        }
    }
    private isTaskSelected(task : TCTask) : boolean {
        return this.selectedTasks.reduce((accum, curr) => {
            return accum || curr.cell.task.identifier == task.identifier
        }, false)
    }
    private canMultiselectTask(task : TCTask) : boolean {
        const last = this.selectedTasks[this.selectedTasks.length - 1]
        const parentId = last && last.parent ? last.parent.task.identifier : null
        const result = last && ((!task.parentId && ! parentId) || (parentId == task.parentId))
        return result
    }

    private updateMenuActions() {
        // In order to only make at most 2 calls over IPC to Electron's main, keep track of
        // which items to disable & enable.
        let itemsToDisable : Array<string> = [
            AppMenuIdentifier.TaskComplete,
            AppMenuIdentifier.TaskConvertToProject,
            AppMenuIdentifier.TaskConvertToNormal,
            AppMenuIdentifier.TaskConvertToChecklist,
            AppMenuIdentifier.TaskRemoveDueDate,
            AppMenuIdentifier.TaskSetPriorityHigh,
            AppMenuIdentifier.TaskSetPriorityMedium,
            AppMenuIdentifier.TaskSetPriorityLow,
            AppMenuIdentifier.TaskSetPriorityNone
        ]
        let itemsToEnable : Array<string> = []

        if (this.selectedTasks.length > 0) {
            // Allow the priority items as long as there's something selected.
            // Remove them from the itemsToDisable array and add them to the
            // itemsToEnable array.
            let priorityItems = itemsToDisable.splice(itemsToDisable.indexOf(AppMenuIdentifier.TaskSetPriorityHigh), 4)
            Array.prototype.push.apply(itemsToEnable, priorityItems)

            if (this.selectedTasks.find(taskInfo => {
                // Return true if a task is completed
                let task = taskInfo.cell.task
                return task && task.isCompleted
            }) == null) {
                // None of the selected tasks are completed, so we can
                // enable the TaskComplete action.
                Array.prototype.push.apply(itemsToEnable, itemsToDisable.splice(itemsToDisable.indexOf(AppMenuIdentifier.TaskComplete), 1))
            }

            // Convert to Normal | Project | Checklist are only available
            // when only ONE item is selected
            const primaryTask = this.primarySelectedTask
            if (primaryTask) {
                const task = primaryTask.cell.task
                if (task) {
                    if (!task.isChecklist && !task.isProject) {
                        Array.prototype.push.apply(itemsToEnable, itemsToDisable.splice(itemsToDisable.indexOf(AppMenuIdentifier.TaskConvertToProject), 1))
                        Array.prototype.push.apply(itemsToEnable, itemsToDisable.splice(itemsToDisable.indexOf(AppMenuIdentifier.TaskConvertToChecklist), 1))
                    } else if (task.isProject) {
                        Array.prototype.push.apply(itemsToEnable, itemsToDisable.splice(itemsToDisable.indexOf(AppMenuIdentifier.TaskConvertToNormal), 1))
                        Array.prototype.push.apply(itemsToEnable, itemsToDisable.splice(itemsToDisable.indexOf(AppMenuIdentifier.TaskConvertToChecklist), 1))
                    } else if (task.isChecklist) {
                        Array.prototype.push.apply(itemsToEnable, itemsToDisable.splice(itemsToDisable.indexOf(AppMenuIdentifier.TaskConvertToNormal), 1))
                        Array.prototype.push.apply(itemsToEnable, itemsToDisable.splice(itemsToDisable.indexOf(AppMenuIdentifier.TaskConvertToProject), 1))
                    }
                }
            }

            // Allow the Remove Due Date action if at least one of the selected
            // tasks HAS a due date
            if (this.selectedTasks.find(taskInfo => {
                const task = taskInfo.cell.task
                return task && task.hasDueDate
            }) != null) {
                Array.prototype.push.apply(itemsToEnable, itemsToDisable.splice(itemsToDisable.indexOf(AppMenuIdentifier.TaskRemoveDueDate), 1))
            }
        }

        if (itemsToDisable.length > 0) {
            this.appMenuService.disableMenuItems(itemsToDisable)
        }

        if (itemsToEnable.length > 0) {
            this.appMenuService.enableMenuItems(itemsToEnable)
        }
    }

    private syncCompletedSubscription : Subscription
    private _settingsSubscription : Subscription
    private set settingsSubscription(sub : Subscription) {
        if (this._settingsSubscription) this._settingsSubscription.unsubscribe()
        this._settingsSubscription = sub
    }

    @ViewChild(PerfectScrollbarComponent) componentScroll: PerfectScrollbarComponent
    @ViewChild(PerfectScrollbarDirective) directiveScroll: PerfectScrollbarDirective

    get taskCreationInformation() : TaskCreationInformation {
        const info = this.sourceModule ? this.sourceModule.taskCreationInformation : null
        if (!info) return null

        const selectedTask = this.primarySelectedTask ? this.primarySelectedTask.cell.task : null
        if (!selectedTask) return info

        if (selectedTask.isParent) {
            info.parentTask = selectedTask
            info.parentIsChecklist = selectedTask.isChecklist
            info.listId = selectedTask.listId
        }

        if (this.primarySelectedTask.parent && !selectedTask.isChecklist) {
            info.parentTask = this.primarySelectedTask.parent.task
            info.parentIsChecklist = info.parentTask.isChecklist
        }

        return info
    }

    get shouldShowSpinner() : boolean {
        return !this.sourceModule || (
            this.sourceModule.pager.hasNextPage &&
            !this.sourceModule.pager.loadingCompletedTasks &&
            this.sourceModule.pager.pageBeingLoaded == 0 &&
            this.numberOfTasks == 0)
    }

    readonly labelsForSections = {
        new         : 'New',
        overdue     : 'Overdue',
        today       : 'Today',
        tomorrow    : 'Tomorrow',
        nextSevenDays: 'Next Seven Days',
        future      : 'Future',
        noDueDate   : 'Someday',
        high        : 'High',
        medium      : 'Medium',
        low         : 'Low',
        none        : 'None',
        incomplete  : 'Incomplete',
        completed   : 'Completed'
    }

    readonly sectionDefinitions = {
        newTask         : { label : this.labelsForSections.new,           taskCells : [], onDrop : (movedCell : TaskCell) => {} },
        noDueDate       : { label : this.labelsForSections.noDueDate,     taskCells : [], onDrop : HeaderDropFunctions.noDueDate },
        overdue         : { label : this.labelsForSections.overdue,       taskCells : [], onDrop : HeaderDropFunctions.overdue },
        dueToday        : { label : this.labelsForSections.today,         taskCells : [], onDrop : HeaderDropFunctions.dueToday },
        dueTomorrow     : { label : this.labelsForSections.tomorrow,      taskCells : [], onDrop : HeaderDropFunctions.dueTomorrow },
        dueNextSevenDays: { label : this.labelsForSections.nextSevenDays, taskCells : [], onDrop : HeaderDropFunctions.dueNextSevenDays },
        dueFuture       : { label : this.labelsForSections.future,        taskCells : [], onDrop : HeaderDropFunctions.dueFuture },
        noPriority      : { label : this.labelsForSections.none,          taskCells : [], onDrop : HeaderDropFunctions.noPriority },
        lowPriority     : { label : this.labelsForSections.low,           taskCells : [], onDrop : HeaderDropFunctions.lowPriority },
        mediumPriority  : { label : this.labelsForSections.medium,        taskCells : [], onDrop : HeaderDropFunctions.mediumPriority },
        highPriority    : { label : this.labelsForSections.high,          taskCells : [], onDrop : HeaderDropFunctions.highPriority },
        alphabetical    : { label : this.labelsForSections.incomplete,    taskCells : [], onDrop : (movedCell : TaskCell) => {} },
        completed       : { label : this.labelsForSections.completed,     taskCells : [], onDrop : (movedCell : TaskCell) => {} }
    }

    currentSections : TaskSectionDefinition[] = []

    // Arranged to be indexed by the sort order value on lists:
    // 0 > DueDate/Priority
    // 1 > Priority/DueDate
    // 2 > Alphetically
    readonly sortTypeSections : TaskSectionDefinition[][] = [
        [
            this.sectionDefinitions.overdue,
            this.sectionDefinitions.dueToday,
            this.sectionDefinitions.dueTomorrow,
            this.sectionDefinitions.dueNextSevenDays,
            this.sectionDefinitions.dueFuture,
            this.sectionDefinitions.noDueDate,
            this.sectionDefinitions.completed
        ],
        [
            this.sectionDefinitions.highPriority,
            this.sectionDefinitions.mediumPriority,
            this.sectionDefinitions.lowPriority,
            this.sectionDefinitions.noPriority,
            this.sectionDefinitions.completed
        ],
        [
            this.sectionDefinitions.alphabetical,
            this.sectionDefinitions.completed
        ]
    ]

    // Sort functions that sort tasks into specific sections, as noted above, the array
    // index of these functions is related to the sort order value from the list being displayed.
    readonly sortTaskSectionFunctions : ((task : TCTask) => TaskSectionDefinition)[] = [
        (task : TCTask) => {
            // Each of these dates is actually set to midnight of the next day, but 
            // it makes the logic fairly simple.
            const yesterday= new Date(new Date().setHours(0, 0, 0, 0))
            const today    = new Date(new Date().setHours(24, 0, 0, 0))
            const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
            const nextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)

            if (task.isCompleted) return this.sectionDefinitions.completed
            if (!task.shouldShowDueDate) return this.sectionDefinitions.noDueDate
            else if (task.shownDueDate >= nextWeek) return this.sectionDefinitions.dueFuture
            else if (task.shownDueDate >= tomorrow) return this.sectionDefinitions.dueNextSevenDays
            else if (task.shownDueDate >= today) return this.sectionDefinitions.dueTomorrow
            else if (task.shownDueDate >= yesterday) return this.sectionDefinitions.dueToday
            else if (task.shownDueDate < yesterday) return this.sectionDefinitions.overdue
            else return this.sectionDefinitions.noDueDate // Something weird happened, assume no due date
        },
        (task : TCTask) => {
            if (task.isCompleted) return this.sectionDefinitions.completed
            switch(task.priority){
                case TaskPriority.Low   : return this.sectionDefinitions.lowPriority
                case TaskPriority.Medium: return this.sectionDefinitions.mediumPriority
                case TaskPriority.High  : return this.sectionDefinitions.highPriority
                default : return this.sectionDefinitions.noPriority
            }
        },
        (task : TCTask) => {
            if (task.isCompleted) return this.sectionDefinitions.completed
            return this.sectionDefinitions.alphabetical
        }
    ]

	  private static readonly secondarySortHierarchies = [
        [
            TaskSortFunctions.sortByDueDate,
            TaskSortFunctions.sortByPriority,
            TaskSortFunctions.sortBySortOrder,
            TaskSortFunctions.sortAlphabetically
        ],
        [
            TaskSortFunctions.sortByPriority,
            TaskSortFunctions.sortByDueDate,
            TaskSortFunctions.sortBySortOrder,
            TaskSortFunctions.sortAlphabetically
        ],
        [
            TaskSortFunctions.sortAlphabetically,
            TaskSortFunctions.sortByPriority,
            TaskSortFunctions.sortByDueDate
        ]
    ]

    private readonly secondarySortFunction = (a : TaskCell, b : TaskCell) : number =>  {
        const sortFunctions = TasksComponent.secondarySortHierarchies[this.sourceModule.sortType]

        for (const sortFunction of sortFunctions) {
            const result = sortFunction(a.task, b.task)
            if (result != 0) return result
        }

        return 0
    }

    get numberOfTasks() : number{
        if (!this.sourceModule || !this.currentSections) return 0
        return this.currentSections
            .map(section => this.getSectionFilteredBySelectedDates(section))
            .reduce((accum, current) =>  accum + current.taskCells.length, 0)
    }

    private get pagerServices() : PagerServices {
        return {
            taskitoService: this.taskitoService, 
            taskService: this.taskService,
            paywallService : this.paywallService
        }
    }

    private createSubtaskPager(task : TCTask) : TaskPager {
        if (task.isProject) {
            return TaskPager.PagerForProject(task, this.pagerServices)
        }
        if (task.isChecklist) {
            return TaskPager.PagerForChecklist(task, this.pagerServices)
        }
        return null
    }

    private createCell(task: TCTask) : TaskCell {
        const cell = new TaskCellImpl(
            task, 
            this.createSubtaskPager(task), 
            this.taskEditService,
            task.isParent ? this.taskService : null, 
            task.isProject ? this.taskitoService : null,
        )

        cell.setSortType(this.sourceModule.sortType)
        return cell
    }

    private hotkeySubscription: Subscription
    private currentEditedTask : TCTask = null

    @Input() taskEditorIsOpen : boolean = false

    @HostListener('keydown', ['$event'])
    KeyboardEvent(event: KeyboardEvent) {
        if (!this.keyTracking) return
        if (event.keyCode == 13 && this.primarySelectedTask) {
            this.taskEditService.editTask(this.primarySelectedTask.cell.task)
            event.preventDefault()
            event.stopPropagation()
        }
    }

    constructor(
        private readonly listService : TCListService,
        private readonly taskService : TCTaskService,
        private readonly taskitoService : TCTaskitoService,
        private readonly smartListService : TCSmartListService,
        private readonly userSettingsService : TCUserSettingsService,
        private readonly syncService : TCSyncService,
        private readonly taskCompletionService : TaskCompletionService,
        private readonly calendarService : CalendarService,
        private readonly taskEditService : TaskEditService,
        private readonly paywallService : PaywallService,
        private readonly searchService : SearchService,
        private readonly notificationService : TCTaskNotificationService,
        private readonly appMenuService : AppMenuService,
        private modalService     : NgbModal,
        private readonly dragulaService: DragulaService,
        private readonly hotkeyService: TCHotkeyService,
        private elRef: ElementRef
    ) {
        dragulaService.setOptions('tasks', {
            copy: true,
            moves: function (el, source) {
                return !source.classList.contains('list-item')
            },
            accepts: function (el, target) {
                const targetingCalendar : boolean = target.classList.contains('calendar-day')
                const elementIsTaskito : boolean = el.classList.contains('task-taskito') || el.classList.contains('subtask-taskito')
                const elementIsChecklist : boolean = el.classList.contains('task-checklist')
                const elementIsRegular : boolean = el.classList.contains('task-regular')
                const elementIsProject : boolean = el.classList.contains('task-project')

                return targetingCalendar || elementIsTaskito || elementIsChecklist || elementIsRegular || elementIsProject
            }
        })
        dragulaService.drop.subscribe((value) => {
            let [element, target] = value.slice(1)
            if(!target || !element) return

            if (element.classList.contains('list-item')) return

            let taskMoveDirection = Array.prototype.indexOf.call(target.childNodes, element) == 1 ? -0.5 : 0.5

            if(taskMoveDirection > 0) {
                if(target.classList.contains('is-subtask') || target.classList.contains('task-taskito')) {
                    const currentId = target.dataset.subId
                    const parentNode = target.parentNode
                    if(parentNode && parentNode.lastElementChild.childNodes[1] && currentId == parentNode.lastElementChild.childNodes[1].dataset.subId) {
                        this.dragulaService.find('tasks').drake.cancel(true)
                        return
                    }
                } else if(target.classList.contains('task-regular')) {
                    const currentId = target.dataset.id
                    const parentNode = target.parentNode.parentNode
                    if(parentNode && parentNode.lastElementChild.childNodes[1] && currentId == parentNode.lastElementChild.childNodes[1].dataset.id) {
                        this.dragulaService.find('tasks').drake.cancel(true)
                        return
                    }
                }
            }
        
            dragulaService.find(value[0]).drake.cancel(true)

            const action = DetermineDragAndDropAction(element, target, (sectionIndex) => {
                return this.currentSections[sectionIndex]
            })

            if (action.targetIsCalendar && action.movedTaskCell) {
                //drop to date in main calendar
                const updateFunction = (taskInfo : SelectedTaskInformation) : Observable<TCTask> => {
                    const day = target.dataset.date
                    const month = target.dataset.month
                    const year = target.dataset.year 
                    const date = moment([year, month - 1, day]).toDate()
                    
                    taskInfo.cell.task.dueDate = date
                    return this.taskService.update(taskInfo.cell.task).first()
                }
                
                if (this.isTaskSelected(action.movedTaskCell.task)) {
                    this.selectedTasks
                        .map(updateFunction)
                        .reduce((accum, current) => accum.merge(current))
                        .subscribe({
                            next : (update) => {
                                const taskInfo = this.selectedTasks.find(info => info.cell.task.identifier == update.identifier)

                                if (taskInfo.parent) return
            
                                this.removeTaskFromSection(taskInfo.cell.task, taskInfo.section)
                                this.sortTaskIntoSection(taskInfo.cell)
                            },
                            complete : () => {
                                if (action.movedItemParent) {
                                    action.movedItemParent.sortSubtasks()

                                    // NOTE: This update call is necessary because the updates of the subtask are run
                                    // simultaneously. This means that when they go to see what the smallest due date
                                    // for the project is, it's possible to find old information that hasn't been updated
                                    // yet, leading to an erroneous value for the project's due date. A different
                                    // solution would be to create an API method that allows for multiple task updates
                                    // at the same time.
                                    this.taskService.update(action.movedItemParent.task).first().subscribe(change => {
                                        this.reloadParentCell(action.movedItemParent)
                                    })
                                }
                            }
                        })
                }
                else {
                    const taskInfo = { 
                        cell : action.movedTaskCell, 
                        section : action.movedTaskSection, 
                        parent : action.movedItemParent 
                    }

                    updateFunction(taskInfo).subscribe(change => {
                        if (taskInfo.parent) {
                            taskInfo.parent.sortSubtasks()
                            this.reloadParentCell(taskInfo.parent)
                            return
                        }
    
                        this.removeTaskFromSection(taskInfo.cell.task, taskInfo.section)
                        this.sortTaskIntoSection(taskInfo.cell)
                    })
                }
                return
            }

            if (action.targetIsList && action.movedTaskCell) {
                //drop to list
                if(action.movedTaskito || action.movedTaskCell.task.isSubtask) {
                    return
                }


                const updateFunction = (taskInfo : SelectedTaskInformation) => {
                    const listId = target.dataset.id

                    if(listId == taskInfo.cell.task.listId) return

                    taskInfo.cell.task.listId = listId
                    const task = taskInfo.cell.task
                    this.taskService.update(task).subscribe(change => {})

                    const movedOutOfList = this.sourceModule instanceof ListTaskSource && 
                        this.sourceModule.source.identifier !== listId
                    const movedOutOfSmartList = this.sourceModule instanceof SmartListTaskSource &&
                        this.sourceModule.source.excludedListIds &&
                        this.sourceModule.source.excludedListIds.has(listId)
                    if (movedOutOfList || movedOutOfSmartList) {
                        this.removeTaskFromSection(taskInfo.cell.task, taskInfo.section)
                    }
                }

                if (this.isTaskSelected(action.movedTaskCell.task)) {
                    this.selectedTasks.forEach(updateFunction)
                }
                else {
                    updateFunction({
                        cell : action.movedTaskCell,
                        section : action.movedTaskSection,
                        parent : action.movedItemParent
                    })
                }
                return
            }

            if (action.targetIsHeader && action.movedTaskCell) {
                const updateFunction = (taskInfo : SelectedTaskInformation) => {
                    this.removeTaskFromSection(taskInfo.cell.task, taskInfo.section)
                    taskInfo.cell.task.parentId = null
                    taskInfo.cell.task.sortOrder = 0
                    action.targetHeaderSection.onDrop(taskInfo.cell)
                    this.taskService.update(taskInfo.cell.task).first().subscribe((result) => {
                        this.updateSortOrderForSection(action.targetHeaderSection)
                        this.sortTaskIntoSection(taskInfo.cell)
                    })
                }

                if (this.isTaskSelected(action.movedTaskCell.task)) {
                    this.selectedTasks.forEach(updateFunction)
                }
                else {
                    updateFunction({ 
                        cell : action.movedTaskCell, 
                        section : action.movedTaskSection, 
                        parent : action.movedItemParent 
                    })
                }
                return
            }

            if (action.targetIsHeader && action.movedTaskito) {
                // convert taskito to task, stick it in the header
                return
            }

            const conditions = GetDragAndDropConditions(action)
            const conditionReduction = (accum, condition) => accum || condition

            if (conditions.updateSort.reduce(conditionReduction, false)) {
                const sortTaskitos = action.movedTaskito && action.targetTaskito
                if (sortTaskitos) {
                    action.movedTaskito.sortOrder = action.targetTaskito.sortOrder + taskMoveDirection
                    this.updateSortOrderForTaskitos(action.targetCell)
                } else if (action.targetIsChild) {
                    action.movedTaskCell.task.sortOrder = action.targetCell.task.sortOrder + taskMoveDirection
                    this.setDNDPriority(action.movedTaskCell.task, action.targetCell, action.movedTaskSection, taskMoveDirection)
                    this.updateSortOrderForSubtasks(action.targetParent)
                } else {
                    if (moment(action.movedTaskCell.task.dueDate).diff(action.targetCell.task.dueDate, 'minutes')) {
                        action.movedTaskCell.task.dueDate = action.targetCell.task.dueDate
                    }
                    this.moveAsRegular(target, action, taskMoveDirection)
                }
                return
            }

            if (conditions.moveToProject.reduce(conditionReduction, false)) {
                if(action.targetCell.task.parentId && action.targetCell.task.parentId == action.movedTaskCell.task.identifier) return
                if(taskMoveDirection < 0 && action.targetCell.task.isParent) {
                    if(!action.movedTaskCell.task.isSubtask) {
                        this.moveAsRegular(target, action, taskMoveDirection)
                    }
                    return
                }
                if (this.isTaskSelected(action.movedTaskCell.task)) {
                    this.selectedTasks.forEach((movedTaskInfo : SelectedTaskInformation) => {
                        if (movedTaskInfo.cell.task.isProject) {
                            this.removeSelectedTask(movedTaskInfo.cell.task)
                            return
                        }

                        const projectCell = action.targetIsChild ? action.targetParent : action.targetCell
                        this.moveToProject(movedTaskInfo.cell, projectCell, movedTaskInfo.section)
                        movedTaskInfo.cell.task.sortOrder = action.targetIsChild ? action.targetCell.task.sortOrder + taskMoveDirection : 0
                        this.setDNDPriority(movedTaskInfo.cell.task, action.targetCell, action.movedTaskSection, taskMoveDirection)
                        this.updateSortOrderForSubtasks(projectCell)
                    })
                }
                else {
                    const projectCell = action.targetIsChild ? action.targetParent : action.targetCell
                    this.moveToProject(action.movedTaskCell, projectCell, action.movedTaskSection)
                    action.movedTaskCell.task.sortOrder = action.targetIsChild ? action.targetCell.task.sortOrder + taskMoveDirection : 0
                    this.setDNDPriority(action.movedTaskCell.task, action.targetCell, action.movedTaskSection, taskMoveDirection)
                    this.updateSortOrderForSubtasks(projectCell)
                }

                this.clearSelectedTasks()
                return
            }

            if (conditions.moveToChecklist.reduce(conditionReduction, false)) {
                if(taskMoveDirection < 0 && action.targetCell.task.isParent) {
                    if(!action.movedTaskito) {
                        this.moveAsRegular(target, action, taskMoveDirection)
                    }
                    return
                }
                if (this.isTaskSelected(action.movedTaskCell.task)) {
                    this.selectedTasks.forEach((movedTaskInfo : SelectedTaskInformation) => {
                        if (movedTaskInfo.cell.task.isProject) {
                            this.removeSelectedTask(movedTaskInfo.cell.task)
                            return
                        }

                        this.removeTaskFromSection(movedTaskInfo.cell.task, movedTaskInfo.section)
                        this.moveToChecklist(movedTaskInfo.cell, action.targetCell, action.movedItemParent)
                    })
                }
                else {
                    this.removeTaskFromSection(action.movedTaskCell.task, action.movedTaskSection)
                    this.moveToChecklist(action.movedTaskCell, action.targetCell, action.movedItemParent)
                }

                this.clearSelectedTasks()
                return
            }

            if (conditions.moveToList.reduce(conditionReduction, false)) {
                if (this.isTaskSelected(action.movedTaskCell.task)) {
                    this.selectedTasks.forEach((movedTaskInfo : SelectedTaskInformation) => {
                        if(action.targetCell) movedTaskInfo.cell.task.sortOrder = action.targetCell.task.sortOrder + taskMoveDirection
                        if(action.targetCell) this.setDNDPriority(movedTaskInfo.cell.task, action.targetCell, action.movedTaskSection, taskMoveDirection)
                        this.moveToRoot(action.targetCell, movedTaskInfo.cell, action.movedItemParent, movedTaskInfo.section)
                    })
                }
                else {
                    if(action.targetCell) action.movedTaskCell.task.sortOrder = action.targetCell.task.sortOrder + taskMoveDirection
                    if(action.targetCell) this.setDNDPriority(action.movedTaskCell.task, action.targetCell, action.movedTaskSection, taskMoveDirection)
                    this.moveToRoot(action.targetCell, action.movedTaskCell, action.movedItemParent, action.movedTaskSection)
                }

                this.clearSelectedTasks()
                return
            }

            if (conditions.changeTaskitoChecklist.reduce(conditionReduction, false)) {
                this.changeTaskitoChecklist(action.movedTaskito, action.movedItemParent, action.targetCell)
                return
            }

            if (conditions.convertTaskitoToTask.reduce(conditionReduction, false)) {
                //convert to regular task
                const newTask = this.convertTaskitoToTask(action.movedTaskito, action.movedItemParent)
                newTask.listId = action.targetCell.task.listId
                newTask.sortOrder = action.targetCell.task.sortOrder + taskMoveDirection
                this.setDNDPriority(newTask, action.targetCell, action.movedTaskSection, taskMoveDirection)
                const targetSection = this.currentSections[target.dataset.sectionIndex]
                targetSection.onDrop(new TaskCellImpl(newTask))

                const targetIsProject = (action.targetCell.task.isProject || (action.targetIsChild && action.targetParent.task.isProject)) && (taskMoveDirection > 0)

                if (targetIsProject) {
                    newTask.parentId = action.targetIsChild ? action.targetParent.task.identifier : action.targetCell.task.identifier
                    newTask.dueDate = action.targetIsChild ? action.targetParent.task.dueDate : action.targetCell.task.dueDate
                }

                this.taskService.create(newTask).first().subscribe(task => {
                    if (targetIsProject) {
                        action.targetIsChild ? action.targetParent.getSubtaskCount() : action.targetCell.getSubtaskCount()
                        action.targetIsChild ? action.targetParent.reloadSubtasks() : action.targetCell.reloadSubtasks()
                    } else {
                        const resultMapFunction = movedTask => cell => {
                            if (cell.task === task) {
                                return this.createCell(movedTask)
                            }
                            return cell
                        }

                        const newCell = this.createCell(task)
                        this.sortTaskIntoSection(newCell)

                        const section = this.sortTaskSectionFunctions[this.sourceModule.sortType](newCell.task)
                        section.taskCells = section.taskCells.map(resultMapFunction(task))
                    }
                })

                return
            }
        })
        dragulaService.over.subscribe((value) => {
            if(value[0] != 'tasks') {
                return
            }
            if (value[1] && value[2]) {
                if(value[2].classList.contains('calendar-day')) {
                    value[2].classList.add('ta-calendar')
                }
                if(value[2].classList.contains('list-item')) {
                    value[2].classList.add('ta-list')
                    value[1].classList.add('el-list')
                }
                if(value[2].classList.contains('task-section-header')) {
                    value[2].classList.add('ta-header')
                    value[1].classList.add('el-header')
                }
                value[1].classList.add('moving')
            }
        })
        dragulaService.shadow.subscribe((value) => {
            if(value[0] != 'tasks') {
                return
            }
            var taskMoveDirection = Array.prototype.indexOf.call(value[2].childNodes, value[1]) == 1 ? -0.5 : 0.5
            if(taskMoveDirection > 0) {
                if(value[2].classList.contains('task-project') || value[2].classList.contains('task-checklist')) {
                    value[2].classList.add('ta-parent')
                    value[1].classList.add('el-parent')
                }
                if(value[1] && value[2]) {
                    if(value[2].classList.contains('is-subtask') || value[2].classList.contains('task-taskito')) {
                        const currentId = value[2].dataset.subId
                        const parentNode = value[2].parentNode
                        if(parentNode && parentNode.lastElementChild.childNodes[1] && currentId == parentNode.lastElementChild.childNodes[1].dataset.subId) {
                            value[1].classList.add('no-style')
                            return
                        }
                    } else if(value[2].classList.contains('task-regular')) {
                        const currentId = value[2].dataset.id
                        const parentNode = value[2].parentNode.parentNode
                        if(parentNode && parentNode.lastElementChild.childNodes[1] && currentId == parentNode.lastElementChild.childNodes[1].dataset.id) {
                            value[1].classList.add('no-style')
                            return
                        }
                    }
                }
            }
            if(taskMoveDirection < 0) {
                if(value[2].classList.contains('task-project') || value[2].classList.contains('task-checklist')) {
                    value[2].classList.remove('ta-parent')
                    value[1].classList.remove('el-parent')
                }
            }
        })
        dragulaService.out.subscribe((value) => {
            if(value[0] != 'tasks') {
                return
            }
            if (value[1]) {
                value[1].classList.remove('moving')
                value[1].classList.remove('el-parent')
                value[1].classList.remove('el-header')
                value[1].classList.remove('el-list')
                value[1].classList.remove('no-style')
            }
            if(value[2]) {
                value[2].classList.remove('ta-parent')
                value[2].classList.remove('ta-header')
                value[2].classList.remove('ta-calendar')
                value[2].classList.remove('ta-list')
            }
        })

        this.hotkeySubscription = hotkeyService.commands.subscribe(hotkeyEvent => this.handleCommand(hotkeyEvent))
    }

    private moveToProject(taskCell : TaskCell, projectCell : TaskCell, section : TaskSectionDefinition) {
        if (taskCell.task.isProject) return

        let parentTask : TaskCell
        if (!taskCell.task.isSubtask) {
            this.removeTaskFromSection(taskCell.task, section)
        } else {
            parentTask = this.findParentCellInSection(taskCell.task, section)
        }

        taskCell.task.parentId = projectCell.task.identifier
        taskCell.task.listId = projectCell.task.listId
        this.taskService.update(taskCell.task).first().subscribe(change => {
            if (parentTask) {
                parentTask.getSubtaskCount()
                parentTask.reloadSubtasks()
            }
            projectCell.reloadSubtasks()
            projectCell.getSubtaskCount()
            this.reloadParentCell(projectCell)
        })
    }

    private moveToChecklist(taskCell : TaskCell, checklistCell : TaskCell, parentCell? : TaskCell) {
        const newTaskito = new TCTaskito()
        newTaskito.parentId = checklistCell.task.identifier
        newTaskito.name = taskCell.task.name
        newTaskito.sortOrder = 0
        this.taskitoService.create(newTaskito).first().subscribe(taskito => {
            checklistCell.addTaskito(taskito)
            checklistCell.reloadSubtasks()
            checklistCell.getSubtaskCount()

            this.taskService.delete(taskCell.task).subscribe(task => {
                this.onTaskDeleted(taskCell.task, parentCell)
            })
        })
    }

    private changeTaskitoChecklist(taskito : TCTaskito, checklistCell : TaskCell, newChecklistCell : TaskCell) {
        taskito.parentId = newChecklistCell.task.identifier

        this.taskitoService.update(taskito).first().subscribe(changed => {
            newChecklistCell.addTaskito(taskito)
            newChecklistCell.reloadSubtasks()
            newChecklistCell.getSubtaskCount()
            checklistCell.taskitos = checklistCell.taskitos.filter(item => item.identifier != taskito.identifier)
            checklistCell.getSubtaskCount()
        })
    }

    private moveToRoot(taskCell : TaskCell, subTaskCell : TaskCell, parentCell : TaskCell, section : TaskSectionDefinition){
        if(!parentCell.task.isProject) return

        const resultMapFunction = movedTask => cell => {
            if (cell.task === subTaskCell.task) {
                return this.createCell(movedTask)
            }
            return cell
        }

        subTaskCell.task.parentId = null

        const newCell = this.createCell(subTaskCell.task)
        this.sortTaskIntoSection(newCell)
        this.removeSubtaskFromParent(parentCell, subTaskCell.task)

        this.taskService.update(subTaskCell.task).first().subscribe(task => {
            const section = this.sortTaskSectionFunctions[this.sourceModule.sortType](newCell.task)
            section.taskCells = section.taskCells.map(resultMapFunction(task))
            parentCell.getSubtaskCount()
            this.reloadParentCell(parentCell)
        })
    }

    private convertTaskitoToTask(taskito : TCTaskito, parentChecklist : TaskCell) {
        const newTask = new TCTask()
        newTask.name = taskito.name
        newTask.taskType = TaskType.Normal
        this.taskitoService.delete(taskito).subscribe(task => {
            this.onTaskitoDeleted(taskito, parentChecklist)
        })

        return newTask
    }

    private moveAsRegular(target : any, action : DragAndDropAction, taskMoveDirection : number) {
        const targetSection = this.currentSections[target.dataset.sectionIndex]
        if(action.movedTaskSection.label === targetSection.label) {
            action.movedTaskCell.task.sortOrder = action.targetCell.task.sortOrder + taskMoveDirection
            this.setDNDPriority(action.movedTaskCell.task, action.targetCell, action.movedTaskSection, taskMoveDirection)
            this.updateSortOrderForSection(action.movedTaskSection)
        } else {
            this.removeTaskFromSection(action.movedTaskCell.task, action.movedTaskSection)
            action.movedTaskCell.task.parentId = null
            action.movedTaskCell.task.sortOrder = action.targetCell.task.sortOrder + taskMoveDirection
            this.setDNDPriority(action.movedTaskCell.task, action.targetCell, action.movedTaskSection, taskMoveDirection)
            targetSection.onDrop(action.movedTaskCell)
            this.taskService.update(action.movedTaskCell.task).first().subscribe((result) => {
                this.updateSortOrderForSection(targetSection)
                this.sortTaskIntoSection(action.movedTaskCell)
            })
        }
    }

    private setDNDPriority(movedTask : TCTask, targetCell : TaskCell, currentSection : TaskSectionDefinition, taskMoveDirection : number) {
        let nextTargetCell = targetCell
        if(taskMoveDirection > 0) {
            if(targetCell.task.parentId) {
                const parentCell = this.findParentCell(targetCell.task)
                const index = parentCell.subtasks.findIndex(cell => {
                    return cell.task.identifier == targetCell.task.identifier
                })
                nextTargetCell = parentCell.subtasks[index + 1] ? parentCell.subtasks[index + 1] : null
            } else {
                const index = currentSection.taskCells.findIndex(cell => {
                    return cell.task.identifier == targetCell.task.identifier
                })
                nextTargetCell = currentSection.taskCells[index + 1] ? currentSection.taskCells[index + 1] : null
            }
        }
        if(nextTargetCell && nextTargetCell.task.priority > movedTask.priority)
            movedTask.priority = nextTargetCell.task.priority
    }

    ngOnDestroy() {
        this.dragulaService.destroy('tasks')
        this.hotkeySubscription.unsubscribe()
        this.syncCompletedSubscription.unsubscribe()

        if (this._settingsSubscription) this._settingsSubscription.unsubscribe()
    }

    ngOnInit() : void {
        this.taskCompletionService.completedTasks.subscribe(result => {
            result.completedTasks
                .filter(resultTask => this.sourceModule.shouldSortTask(resultTask))
                .forEach(completedTask => {
                    this.onTaskCompleted(completedTask)
                })

            result.repeatedTasks
                .filter(resultTask => this.sourceModule.shouldSortTask(resultTask))
                .forEach(repeatedTask => {
                    this.onTaskRepeated(repeatedTask)
                })

            if (result.repeatedTasks && result.repeatedTasks.length > 0 && this.sourceModule.shouldReloadOnTaskEdit) {
                this.reloadTasks()
            }
        })

        let taskSubscription : Subscription = null
        const setupPager = () => {
            if (taskSubscription) taskSubscription.unsubscribe()

            taskSubscription = this.sourceModule.pager.pagedTasksLoaded.subscribe((result : {page: number, tasks : TCTask[]}) => {
                result.tasks.forEach(task => {
                    this.sortTaskSectionFunctions[this.sourceModule.sortType](task).taskCells.push(this.createCell(task))
                })

                for (const section of this.currentSections) {
                    section.taskCells.sort(this.secondarySortFunction)
                }
            })
        }

        // Have to do this to make sure that we keep our source list object up to date with the one
        // published by the lists service.
        this.listService.lists
            .filter(pub => pub.info.find(info => info == ListPublishInformation.AfterSync) == null)
            .map(pub => pub.lists).subscribe(lists => {
                this.settingsSubscription = this.userSettingsService.settings.subscribe(settings => {
                    if (!this.sourceModule) return

                    const current = lists.find(list => this.sourceModule.source.identifier == list.identifier)
                    if (!current) return
                    if (current === this.sourceModule.source) return
                    
                    this.sourceModule = new ListTaskSource(
                        current, 
                        current.sortType >= 0 ? current.sortType : settings.taskSortOrder,
                        this.sourceModule.pager,
                        this.listService, 
                        settings
                    )
                    
                    setupPager()
                    this.reloadTasks()
                })
            })

        this.listService.lists
            .filter(pub => {
                const listDelete = pub.info.find(info => info == ListPublishInformation.ListDeleted) != null
                return listDelete && this.sourceModule.reloadOnListDelete
            })
            .subscribe(pub => {
                this.reloadTasks()
            }) 

        // And the same thing for the smart lists.
        this.smartListService.smartLists.map(pub => pub.smartLists).subscribe(smartLists => {
            this.settingsSubscription = this.userSettingsService.settings.subscribe(settings => {
                if (!this.sourceModule) return

                const current = smartLists.find(list => this.sourceModule.source.identifier == list.identifier)
                if (!current) return
                if (current === this.sourceModule.source) return
                
                this.sourceModule = new SmartListTaskSource(
                    current, 
                    current.sortType >= 0 ? current.sortType : settings.taskSortOrder,
                    this.sourceModule.pager,
                    this.smartListService, 
                    settings,
                    this.userSettingsService
                )
                
                setupPager()
            })
        })

        const isSameAsCurrentSource = (object : TCObject) : boolean => {
            return this.sourceModule && this.sourceModule.source.identifier == object.identifier
        }

        this.listService.selectedList
            .filter(list => !isSameAsCurrentSource(list) )
            .subscribe(list => {
                this.settingsSubscription = this.userSettingsService.settings.subscribe(settings => {
                    const sortType = list.sortType >= 0 ? list.sortType : settings.taskSortOrder
                    const pager = TaskPager.PagerForList(list, this.pagerServices)
                    this.sourceModule = new ListTaskSource(
                        list, 
                        sortType, 
                        pager,
                        this.listService, 
                        settings
                    )
                    
                    setupPager()
                    this.resetTaskSections()
                })
            })
        this.listService.selectedList
            .filter(list => isSameAsCurrentSource(list) )
            .subscribe(list => this.reloadTasks())

        const setSmartListTaskSource = (smartList : TCSmartList) => {
            this.settingsSubscription = this.userSettingsService.settings.subscribe(settings => {
                const sortType = smartList.sortType >= 0 ? smartList.sortType : settings.taskSortOrder
                const pager = TaskPager.PagerForSmartList(smartList, this.pagerServices)
                this.sourceModule = new SmartListTaskSource(
                    smartList, 
                    sortType, 
                    pager,
                    this.smartListService, 
                    settings,
                    this.userSettingsService
                )
                
                setupPager()
                this.resetTaskSections()
            })
        }

        this.smartListService.smartListSelected
            .filter(smartList => !isSameAsCurrentSource(smartList))
            .subscribe(smartList => setSmartListTaskSource(smartList))
        this.smartListService.smartListSelected
            .filter(smartList => isSameAsCurrentSource(smartList))
            .subscribe(smartList => this.reloadTasks())

        this.smartListService.smartListUpdated
            .subscribe(smartList => {
                setSmartListTaskSource(smartList)
                this.taskService.getTaskCounts()
            })

        this.searchService.searchBegan.subscribe(term => {
            this.settingsSubscription = this.userSettingsService.settings.subscribe(settings => {
                const pager = TaskPager.PagerForSearch(term, this.pagerServices)
                this.sourceModule = new SearchTaskSource(
                    term,
                    pager,
                    settings
                )
                
                setupPager()
                this.resetTaskSections()
            })
        })

        this.taskEditService.editedTask
            .filter(info => info.state == TaskEditState.Finished)
            .subscribe(info => {
                this.currentEditedTask = null
                this.taskService.update(info.task).first()
                    .filter(updated => this.sourceModule.shouldReloadOnTaskEdit)
                    .subscribe(updated => {
                        this.reloadTasks()
                    })
            })

        const sortOnUpdate = (change : TaskUpdate, taskClone : TCTask) => {
            const parentCell = this.findParentCell(change.task)

            if (parentCell) {
                const subCell = parentCell.subtasks.find(sub => sub.task.identifier == change.task.identifier)

                if (subCell) {
                    subCell.task = change.task
                    parentCell.sortSubtasks()
                }

                // We have to retrieve the parent task in case changes
                // to the subtask have changed the "subtask" fields on
                // the parent.
                this.reloadParentCell(parentCell)

                return
            }

            const section = this.sortTaskSectionFunctions[this.sourceModule.sortType](taskClone)

            const removedCell = this.removeTaskFromSection(change.task, section) 
            const cell = removedCell ? removedCell : this.createCell(change.task)
            cell.task = change.task
            this.sortTaskIntoSection(cell)
        }

        this.taskEditService.editedTask
            .filter(info => info.state == TaskEditState.Beginning && info.publisher != null)
            .subscribe(info => {
                this.currentEditedTask = info.task

                info.publisher.taskDueDateChange.subscribe(change => {
                    const taskClone = new TCTask(change.task.requestBody())
                    taskClone.dueDate = change.oldDate
                    sortOnUpdate(change, taskClone)
                })

                info.publisher.taskStartDateChange.subscribe(change => {
                    const taskClone = new TCTask(change.task.requestBody())
                    taskClone.startDate = change.oldDate
                    sortOnUpdate(change, taskClone)
                })

                info.publisher.taskPriorityChange
                    .subscribe(change => {
                        const taskClone = new TCTask(change.task.requestBody())
                        taskClone.priority = change.oldPriority
                        sortOnUpdate(change, taskClone)
                    })

                info.publisher.taskListChange
                    .subscribe(change => {
                        this.sourceModule.onTaskListChanged(this, change.task, change.newList)
                    })
                info.publisher.taskCompleted
                    .subscribe(completedTask => {
                        this.onTaskCompleted(completedTask)
                    })
                info.publisher.taskRepeated
                    .subscribe(repeatedTask => {
                        if (!this.sourceModule.shouldSortTask(repeatedTask)) return
                        this.onTaskRepeated(repeatedTask)
                    })
                info.publisher.taskUncompleted
                    .subscribe(uncompletedTask => {
                        this.onTaskUncompleted(uncompletedTask)
                    })
            })

        this.calendarService.selectedDates.subscribe(dates => this.selectedDates = dates)

        // For electron app only
        this.syncCompletedSubscription = this.syncService.syncCompleted.subscribe(() => {
            if (this.numberOfTasks == 0) {
                this.reloadTasks()
                return
            }
            
            this.sourceModule.pager.onSync().subscribe({
                next : tasks => {
                    console.log(`Reloaded ${tasks.length} tasks.`)

                    const flattenedTaskList : TaskCell[] = this.currentSections.reduce((accum, current) => {
                        return accum.concat(current.taskCells)
                    }, [])

                    interface Comparison {
                        intersection : {
                            oldCell: TaskCell, 
                            task : TCTask
                        }[], 
                        add : TCTask[], 
                        remove : TCTask[]
                    }

                    const comparison : Comparison = flattenedTaskList.reduce((accum, current) => {
                        const existingTaskIndex = tasks.findIndex(task => task.identifier == current.task.identifier)

                        if (existingTaskIndex > -1) {
                            const existingTask = tasks[existingTaskIndex]
                            accum.intersection.push({ oldCell: current, task: existingTask })
                            tasks.splice(existingTaskIndex, 1)
                        }
                        else {
                            accum.remove.push(current.task)
                        }

                        return accum
                    }, { 
                        intersection: new Array<{oldCell : TaskCell, task: TCTask}>(), 
                        remove: new Array<TCTask>(), 
                        add: new Array<TCTask>() 
                    })

                    comparison.add = tasks

                    comparison.intersection.forEach(result => {
                        if (result.oldCell.task.isChecklist != result.task.isChecklist ||
                            result.oldCell.task.isProject != result.task.isProject) 
                        {
                            this.removeTaskFromAnySection(result.oldCell.task)
                            this.sortTaskIntoSection(this.createCell(result.task))
                        }
                        else {
                            if (result.oldCell.task.shownDueDate != result.task.shownDueDate ||
                                result.oldCell.task.priority != result.task.priority ||
                                result.oldCell.task.name != result.task.name ||
                                result.oldCell.task.isCompleted != result.task.isCompleted) 
                            {
                                this.removeTaskFromAnySection(result.oldCell.task)
                                result.oldCell.task = result.task
                                this.sortTaskIntoSection(result.oldCell)
                            }
                            else {
                                result.oldCell.task = result.task
                            }
    
                            result.oldCell.onSync()

                            this.taskEditService.syncEditedTask(result.task)
                        }
                    })
                    comparison.remove.forEach(remove => {
                        this.removeTaskFromAnySection(remove)
                    })
                    comparison.add.forEach(add => {
                        this.sortTaskIntoSection(this.createCell(add))
                    })
                },
                error : err => {
                    console.log(`Error reloading tasks after sync.`)
                },
                complete : () => {
                    console.log(`Sync task reload complete.`)
                }
            })
        })

        // If this component loads, we know we can enable the TaskCreate shortcut
        this.appMenuService.enableMenuItems([
            AppMenuIdentifier.TaskCreate
        ])
    }

    private reloadParentCell(parentCell : TaskCell) {
        this.taskService.taskForId(parentCell.task.identifier).first().subscribe((parent) => {
            parentCell.task = parent
            this.removeTaskFromAnySection(parentCell.task)
            this.sortTaskIntoSection(parentCell)
            parentCell.getSubtaskCount()
        })
    }

    private showDeleteSelectedConfirmationModal() {
        const modalRef = this.modalService.open(TaskDeleteConfirmationComponent)
        this.isDeleteDialogOpen = true
        const deleteComponent : TaskDeleteConfirmationComponent = modalRef.componentInstance

        deleteComponent.task = this.selectedTasks[0].cell.task
        deleteComponent.selectedTaskCount = this.selectedTasks.length
        deleteComponent.deletePressed.subscribe(task => {
            this.onDeleteSelected()
        })
        modalRef.result.then(result => {
            this.isDeleteDialogOpen = false
        })
    }

    private reloadTasks() {
        this.sourceModule.pager.reset()
        this.resetTaskSections()
    }

    private resetTaskSections() {
        this.loadingCompletedTasks = false
        this.clearSelectedTasks()
        this.currentSections.forEach((section) => section.taskCells = [] )
        this.currentSections = this.sortTypeSections[this.sourceModule.sortType]

        this.sourceModule.pager.nextPage()
    }

    private taskIsInSelectedDates(task : TCTask) : boolean {
        if (this.selectedDates.length == 0) return true

        const matchDate = task.shouldShowDueDate ? task.shownDueDate : task.isCompleted ? task.completionDate : null
        if (!matchDate) return false

        return this.selectedDates.find(d => 
            d.getFullYear() == matchDate.getFullYear() &&
            d.getMonth() == matchDate.getMonth() &&
            d.getDate() == matchDate.getDate()
        ) != null
    }

    private getSectionFilteredBySelectedDates(section : TaskSectionDefinition) : TaskSectionDefinition {
        return {
            label : section.label,
            taskCells : section.taskCells.filter(t => this.taskIsInSelectedDates(t.task)),
            onDrop : section.onDrop
        }
    }

    private findParentCellInSection(subtask: TCTask | TCTaskito, section: TaskSectionDefinition) : TaskCell {
        return section.taskCells.find(cell => cell.task.identifier == subtask.parentId)
    }

    private findParentCell(subtask: TCTask | TCTaskito) : TaskCell {
        return this.currentSections.reduce((accum : TaskCell, section : TaskSectionDefinition) : TaskCell => {
            if (accum) return accum
            return this.findParentCellInSection(subtask, section)
        }, null)
    }

    private findCellInSection(task : TCTask, section: TaskSectionDefinition) : TaskCell {
        return section.taskCells.find(cell => cell.task.identifier == task.identifier)
    }

    private findCell(task : TCTask) : TaskCell {
        return this.currentSections.reduce((accum : TaskCell, section : TaskSectionDefinition) : TaskCell => {
            if (accum) return accum
            return this.findCellInSection(task, section)
        }, null)
    }

    private removeSubtaskFromParent(parentCell: TaskCell, subtask: TCTask) : TaskCell {
        if (!parentCell.task.isProject) return null

        const index = parentCell.subtasks.findIndex(cell => cell.task.identifier == subtask.identifier)
        if ((index == undefined || index < 0)) return null

        const cell = parentCell.subtasks[index]
        parentCell.subtasks.splice(index, 1)

        return cell
    }

    public removeTaskFromAnySection(task : TCTask) : TaskCell {
        const parentCell = this.findParentCell(task)
        if (parentCell) {
            const subCell = this.removeSubtaskFromParent(parentCell, task)
            if (!this.sourceModule.showSubtasks) {
                return subCell
            }
        }

        let cell : TaskCell = null
        for (const section of this.currentSections) {
            const removed = this.removeTaskFromSection(task, section)
            if (removed) {
                cell = removed
                break
            }
        }
        return cell
    }

    public removeTaskFromSection(task : TCTask, section : TaskSectionDefinition) : TaskCell {
        const parentCell = this.findParentCellInSection(task, section)
        if (parentCell) {
            const subCell = this.removeSubtaskFromParent(parentCell, task)
            if (!this.sourceModule.showSubtasks) {
                return subCell
            }
        }

        const index = section.taskCells.findIndex(element => element.task.identifier == task.identifier)
        if ((index == undefined || index < 0)) return null

        const cell = section.taskCells[index]
        section.taskCells.splice(index, 1)
        return cell
    }

    public removeSelectedTaskFromSection() : TaskCell {
        return this.removeTaskFromSection(this.primarySelectedTask.cell.task, this.primarySelectedTask.section)
    }

    public sortTaskIntoSection(cell : TaskCell) : TaskSectionDefinition {
        const section = this.sortTaskSectionFunctions[this.sourceModule.sortType](cell.task)
        section.taskCells.push(cell)
        section.taskCells.sort(this.secondarySortFunction)
        let updatedTaskCell = this.selectedTasks.find(i => i.cell.task.identifier === cell.task.identifier)
        if(updatedTaskCell)
            updatedTaskCell.section = section
        return section
    }

    public resortSelectedTask() {
        if (!this.sourceModule.shouldSortTask(this.primarySelectedTask.cell.task)) return
        const section = this.sortTaskIntoSection(this.primarySelectedTask.cell)
        this.primarySelectedTask.section = section
    }

    private addTaskNotificationFromDueDate(newTask: TCTask) {
        if(newTask.dueDateHasTime) {
            const newNotification = new TCTaskNotification({ 
                taskid        : newTask.identifier,
                sound_name    : 'bell', 
                triggerdate   : Math.floor(new Date(newTask.dueDate.getTime() - 60000).getTime() / 1000),
                triggeroffset : 1
            })
    
            return this.notificationService.create(newNotification).first()
        }
    }

    onNewTaskCreated(event : TaskCreatedEvent) {
        const resultMapFunction = createdTask => cell => {
            if (cell.task === event.task) {
                return this.createCell(createdTask)
            }
            return cell
        }

        if (this.primarySelectedTask && event.task.isSubtask) {
            const selectedCell = this.primarySelectedTask.cell
            const parentCell = 
                this.primarySelectedTask.parent ? this.primarySelectedTask.parent : 
                selectedCell.task.isParent      ? selectedCell : 
                null

            if (parentCell) {
                parentCell.addSubtask(event.task)
                event.taskSave.subscribe(createdTask => {
                    parentCell.subtasks = parentCell.subtasks.map(resultMapFunction(createdTask))
                    parentCell.getSubtaskCount()
                    this.addTaskNotificationFromDueDate(createdTask)
                })
                return
            }
        }
        
        const newCell = this.createCell(event.task)
        this.sortTaskIntoSection(newCell)
        event.taskSave.subscribe(createdTask => {
            const section = this.sortTaskSectionFunctions[this.sourceModule.sortType](createdTask)
            section.taskCells = section.taskCells.map(cell => {
                const resultCell = resultMapFunction(createdTask)(cell)
                if (resultCell !== cell) this.selectTask({ cell : resultCell, section : section })
                return resultCell
            })
            this.addTaskNotificationFromDueDate(createdTask)
            const newCell = this.createCell(createdTask)
            const div = this.elRef.nativeElement.querySelector('.creating')
            this.componentScroll.directiveRef.scrollTo(0, div.offsetParent.offsetTop, 500)
        })
    }

    onNewTaskitoCreated(event : TaskitoCreatedEvent) {
        if (!this.primarySelectedTask) {
            console.log('Tried to create a taskito without selecting a checklist')
            return // This should never happen
        }
            
        const parentCell = 
            this.primarySelectedTask.cell.task.isChecklist ? this.primarySelectedTask.cell   : 
            this.primarySelectedTask.parent                ? this.primarySelectedTask.parent : 
            null

        if (!parentCell) {
            console.log('Tried to create a taskito without selecting a checklist')
            return // This should never happen
        }

        parentCell.addTaskito(event.taskito)
        event.taskitoSave.subscribe(createdTaskito => {
            parentCell.taskitos = parentCell.taskitos.map(taskito => {
                if (taskito === event.taskito) return createdTaskito
                return taskito
            })
            parentCell.sortTaskitos()
            parentCell.getSubtaskCount()
        })
    }
    
    onTaskitoCompleted(taskito : TCTaskito, parentCell : TaskCell) {
        parentCell.sortTaskitos()
    }

    onTaskitoUncompleted(taskito : TCTaskito, parentCell : TaskCell) {
        parentCell.sortTaskitos()
    }

    onTaskitoDeleted(taskito : TCTaskito, parentCell : TaskCell) {
        parentCell.taskitos = parentCell.taskitos.filter(item => item.identifier != taskito.identifier)
        parentCell.getSubtaskCount()
    }

    onTaskTypeChanged(change : TypeUpdate, cell : TaskCell, section : TaskSectionDefinition, parent? : TaskCell) {
        if (parent) {
            this.removeTaskFromSection(parent.task, section)
            const newParent = this.createCell(parent.task)
            this.sortTaskIntoSection(newParent)
            this.showChildren(newParent)
        }
        else if (change.current == TaskType.Project || change.current == TaskType.Checklist) {
            this.removeTaskFromSection(cell.task, section)
            this.sortTaskIntoSection(this.createCell(change.updatedTask))
        }
        else if (
            change.current == TaskType.Normal && 
            (change.previous == TaskType.Project || change.previous == TaskType.Checklist)
        ) {
            this.reloadTasks()
        }
    }

    onTaskPriorityChanged(change) {
        const taskClone = new TCTask(change.task.requestBody())
        taskClone.priority = change.oldPriority
        const parentCell = this.findParentCell(change.task)

        if (parentCell) {
            const subCell = parentCell.subtasks.find(sub => sub.task.identifier == change.task.identifier)

            if (subCell) {
                subCell.task = change.task
                parentCell.sortSubtasks()
            }

            return
        }

        const section = this.sortTaskSectionFunctions[this.sourceModule.sortType](taskClone)

        const removedCell = this.removeTaskFromSection(change.task, section) 
        const cell = removedCell ? removedCell : this.createCell(change.task)
        cell.task = change.task
        this.sortTaskIntoSection(cell)
    }

    onTaskDueDateRemoved(task : TCTask) {
        this.reloadTasks()
    }

    private resortSubtask(subtask : TCTask) {
        const parentCell = this.findParentCell(subtask)
        this.removeSubtaskFromParent(parentCell, subtask)
        parentCell.addSubtask(subtask)
        parentCell.getSubtaskCount()
    }

    private onTaskCompleted(completedTask : TCTask) {
        const parentCell = this.findParentCell(completedTask)
        if (parentCell) {
            if(parentCell.showSubtasks) {
                this.resortSubtask(completedTask)
                this.reloadParentCell(parentCell)
            }
            return
        }

        const removedCell = this.removeTaskFromAnySection(completedTask)
        const cell = removedCell ? removedCell : this.createCell(completedTask)
        cell.task = completedTask
        this.sortTaskIntoSection(cell)
        if(cell.task.isParent) {
            cell.reloadSubtasks()
        }
    }

    private onTaskRepeated(repeatedTask : TCTask) {
        const parentCell = this.findParentCell(repeatedTask)
        if (parentCell) {
            this.resortSubtask(repeatedTask)
            this.reloadParentCell(parentCell)
            return
        }

        const removedCell = this.removeTaskFromAnySection(repeatedTask)
        const cell = removedCell ? removedCell : this.createCell(repeatedTask)
        cell.task = repeatedTask
        this.sortTaskIntoSection(cell)
        if(this.taskEditorIsOpen) this.taskEditService.editTask(cell.task)
        if(cell.task.isParent) {
            cell.reloadSubtasks()
        }
    }

    private onTaskUncompleted(uncompletedTask : TCTask, parentCell? : TaskCell) {
        if (parentCell) {
            this.resortSubtask(uncompletedTask)
            this.reloadParentCell(parentCell)
            return
        }

        const removedCell = this.removeTaskFromSection(uncompletedTask, this.sectionDefinitions.completed) 
        const cell = removedCell ? removedCell : this.createCell(uncompletedTask)
        cell.task = uncompletedTask
        this.sortTaskIntoSection(cell)
    }

    private onTaskDeleted(task : TCTask, parentCell? : TaskCell) {
        const closeEditTask = this.currentEditedTask && 
              (task.identifier == this.currentEditedTask.identifier || 
               task.identifier == this.currentEditedTask.parentId)
        if (this.currentEditedTask && closeEditTask) {
            this.taskEditService.finishEditTask(this.currentEditedTask)
        }

        if (this.primarySelectedTask) {
            const selectedTaskId = this.primarySelectedTask.cell.task.identifier
            const deletedTaskIsSelected = selectedTaskId == task.identifier
            const deletedParentIsSelected = 
                this.primarySelectedTask.parent &&
                this.primarySelectedTask.parent.subtasks.reduce((accum, curr) => {
                    return accum || curr.task.identifier == selectedTaskId
                }, false)

            if (deletedTaskIsSelected || deletedParentIsSelected) {
                this.clearSelectedTasks()
            }
        }
        
        if (parentCell) {
            this.removeSubtaskFromParent(parentCell, task)
            this.reloadParentCell(parentCell)
        }
        else {
            this.removeTaskFromAnySection(task)
        }

        this.removeSelectedTask(task)

        this.taskService.getTaskCounts()
    }

    onDeleteSelected() {
        const deletedTasks = this.selectedTasks
        this.clearSelectedTasks()
        deletedTasks.reduce((accum : Observable<{}>, info) : Observable<{}> => {
            const currentObs = this.taskService.delete(info.cell.task).first()
            return accum ? accum.merge(currentObs) : currentObs
        }, null)
        .subscribe({
            complete : () => {
                deletedTasks.forEach(info => {
                    this.onTaskDeleted(info.cell.task, info.parent)
                })
            }
        })
    }

    public showChildren(cell : TaskCell) {
        if (cell.task.isParent) {
            cell.showSubtasks = !cell.showSubtasks
            if (cell.showSubtasks) cell.loadSubtasks()
            else {
                if (this.primarySelectedTask && 
                    this.primarySelectedTask.cell.task.parentId == cell.task.identifier) {
                    this.clearSelectedTasks()
                }
            }
        }
    }

    public onTaskSelect(info : SelectedTaskInformation, event : {shift : boolean, ctrl : boolean}, sectionIndex : number, taskIndex : number) {
        const obs : Observable<{shift : boolean, ctrl : boolean}> = Observable.from([event])

        obs.filter(e => !(e.shift || e.ctrl)).subscribe(e => {
            this.selectTask(info)
        })
        obs.filter(e => event.ctrl).subscribe(e => {
            if (!this.canMultiselectTask(info.cell.task)) {
                
                if (this.selectedTasks.length == 0) {
                    this.selectTask(info)
                }
                return
            }

            this.isTaskSelected(info.cell.task) ? 
                this.removeSelectedTask(info.cell.task) :
                this.addSelectedTask(info)
        })
        obs.filter(e => event.shift).subscribe(e => {
            if (!this.canMultiselectTask(info.cell.task)) {
                
                if (this.selectedTasks.length == 0) {
                    this.selectTask(info)
                }
                return
            }

            const last = this.selectedTasks[this.selectedTasks.length - 1]
            const subtasks = info.cell.task.isSubtask
            const lastSectionIndex = this.currentSections.indexOf(last.section)
            const lastTaskIndex = !subtasks ? last.section.taskCells.indexOf(last.cell) : last.parent.subtasks.indexOf(last.cell)
            const sectionDiff = last && !subtasks ? sectionIndex - lastSectionIndex : 0
            const taskDiff = last && sectionDiff == 0 ? taskIndex - lastTaskIndex : 0
            const selectingInSingleSection = lastSectionIndex == sectionIndex
            const direction = sectionDiff > 0 ? 1  :
                sectionDiff < 0             ? -1 :
                taskDiff > 0                ? 1  :
                taskDiff < 0                ? -1 :
                0

            if (direction == 0) {
                this.removeSelectedTask(info.cell.task)
                return
            }

            let tasksToAdd = []
            if (subtasks) {
                tasksToAdd = last.parent.subtasks.reduce((accum : SelectedTaskInformation[], cell, currentTaskIndex) => {
                    let shouldAddTask = direction > 0 ?
                        currentTaskIndex > lastTaskIndex && currentTaskIndex <= taskIndex :
                        currentTaskIndex < lastTaskIndex && currentTaskIndex >= taskIndex
    
                    shouldAddTask = shouldAddTask && !this.isTaskSelected(cell.task)
                    if (shouldAddTask) accum.push({ cell : cell, section : last.section, parent : last.parent})
    
                    return accum
                }, [])
            }
            else {
                tasksToAdd = this.currentSections.reduce((accum : SelectedTaskInformation[], section, currentSectionIndex) => {
                    const inSectionRange = direction < 0 ?
                        currentSectionIndex <= lastSectionIndex && currentSectionIndex >= sectionIndex :
                        currentSectionIndex >= lastSectionIndex && currentSectionIndex <= sectionIndex
                    const isEndSection = currentSectionIndex == lastSectionIndex || currentSectionIndex == sectionIndex
                
                    return !inSectionRange ? accum : 
                        accum.concat(section.taskCells.reduce((accum : SelectedTaskInformation[], cell, currentTaskIndex) => {
                            let shouldAddTask = !isEndSection

                            if (isEndSection && direction < 0) {
                                shouldAddTask = 
                                    selectingInSingleSection ? currentTaskIndex < lastTaskIndex && currentTaskIndex >= taskIndex :
                                    currentSectionIndex == lastSectionIndex ?
                                        currentTaskIndex < lastTaskIndex :
                                        currentTaskIndex >= taskIndex
                            }
                            if (isEndSection && direction > 0) {
                                shouldAddTask = 
                                    selectingInSingleSection ? currentTaskIndex > lastTaskIndex && currentTaskIndex <= taskIndex :
                                    currentSectionIndex == lastSectionIndex ?
                                        currentTaskIndex > lastTaskIndex :
                                        currentTaskIndex <= taskIndex
                            }

                            const taskIsSelected : boolean = this.isTaskSelected(cell.task)
                            shouldAddTask = shouldAddTask && !taskIsSelected
                            // console.log(`Should add task: ${cell.task.name}, ${shouldAddTask}\nTask is selected: ${taskIsSelected}`)
                            if (shouldAddTask) accum.push({ cell : cell, section : section, parent : last.parent})

                            return accum
                        }, []))
                }, [])
            }

            if (direction < 0) tasksToAdd.reverse()
            // console.log(tasksToAdd.map(info => info.cell.task.name))
            for (const info of tasksToAdd) {
                this.addSelectedTask(info)
            }
        })
    }

    public selectTask(info : SelectedTaskInformation) {
        if (info.cell.task.identifier == null) return

        if(this.primarySelectedTask && this.primarySelectedTask.cell.task.identifier === info.cell.task.identifier) {
            this.clearSelectedTasks()
            return
        }

        if (this.taskEditorIsOpen) {
            this.taskEditService.editTask(info.cell.task)
        }

        this.setSelectedTask(info)

        if (info.cell.task.isParent) {
            info.cell.loadSubtasks()
        }
    }

    public selectNextTask() {
        if (this.selectedTasks.length > 1) this.setSelectedTask(this.primarySelectedTask)

        if (this.primarySelectedTask && this.primarySelectedTask.cell.task.isSubtask) {
            const parentCell = this.primarySelectedTask.parent
            const index = parentCell.subtasks.findIndex(cell => {
                return cell.task.identifier == this.primarySelectedTask.cell.task.identifier
            })

            if (index < 0 || index == parentCell.subtasks.length - 1) return
            
            this.primarySelectedTask.cell = parentCell.subtasks[index + 1]
            return
        }

        const currentSection = this.primarySelectedTask.section
        const index = this.selectionIndexInSection()

        if (index >= currentSection.taskCells.length - 1) {
            this.selectTaskInNextSection()
            return
        }

        this.primarySelectedTask.cell = this.primarySelectedTask.section.taskCells[index + 1]
    }

    private selectTaskInNextSection(index : number = -1){
        //if it first iteration - we need to get index of current section
        if (index === -1) {
            //get index of next section
            index = 1 + this.currentSections.findIndex(section => section.label === this.primarySelectedTask.section.label)
        }
        if(index < -1 || index > this.currentSections.length - 1) return

        if (this.currentSections[index].taskCells.length === 0) {
            this.selectTaskInNextSection(++index)
            return
        }
        this.setSelectedTask({
            cell: this.currentSections[index].taskCells[0],
            section: this.currentSections[index]
        })
    }

    public selectPrevTask() {
        if (this.selectedTasks.length > 1) this.setSelectedTask(this.primarySelectedTask)
        
        if (this.primarySelectedTask && this.primarySelectedTask.cell.task.isSubtask) {
            const parentCell = this.primarySelectedTask.parent
            const index = parentCell.subtasks.findIndex(cell => {
                return cell.task.identifier == this.primarySelectedTask.cell.task.identifier
            })

            if (index == 0 || index > parentCell.subtasks.length - 1) return
            
            this.primarySelectedTask.cell = parentCell.subtasks[index - 1]
            return
        }

        const index = this.selectionIndexInSection()

        if (index === 0) {
            this.selectTaskInPrevSection()
            return
        }
        this.primarySelectedTask.cell = this.primarySelectedTask.section.taskCells[index - 1]
    }

    private selectTaskInPrevSection(index : number = -1){
        //if it first iteration - we need to get index of current section
        if (index === -1) {
            index = this.currentSections.findIndex(section => section.label === this.primarySelectedTask.section.label)
        }

        //return if in first section
        if(index <= 0) return

        //index of previous section
        index--

        if (this.currentSections[index].taskCells.length === 0) {
            this.selectTaskInPrevSection(index)
            return
        }
        this.setSelectedTask({
            cell: this.currentSections[index].taskCells[this.currentSections[index].taskCells.length - 1],
            section: this.currentSections[index]
        })
    }

    private selectionIndexInSection() : number {
        const currentSection = this.primarySelectedTask.section
        return currentSection.taskCells.findIndex(cell => {
            return cell.task.identifier == this.primarySelectedTask.cell.task.identifier
        })
    }

    public didSelectShowEditor(info : SelectedTaskInformation) {
        if (info.cell.task.identifier == null) return
        this.setSelectedTask(info)
    }

    public scrollReachedEnd() {
        if (!this.sourceModule || this.sourceModule.pager.loadingCompletedTasks) return
        this.sourceModule.pager.nextPage()
    }

    public loadCompletedTasks() {
        this.loadingCompletedTasks = true
        const afterLoadFunc = () => {
            this.loadingCompletedTasks = false
        }

        if (this.sourceModule && !this.sourceModule.pager.loadingCompletedTasks) {
            this.sourceModule.pager.loadCompletedTasks(afterLoadFunc)
            return
        }
        this.sourceModule.pager.nextPage(afterLoadFunc)
    }

    public numberOfSubTasks(cell: TaskCellImpl):Number {
        return (cell.subtasks.length + cell.taskitos.length)
    }

    private updateSortOrderForSection(section : TaskSectionDefinition) {
        let sortIndex = 1
        let tasksToUpdate : TCTask[] = []
        section.taskCells.sort(this.secondarySortFunction)
        section.taskCells.forEach((cell: TaskCell) => {
            if (cell.task.sortOrder !== sortIndex) {
                cell.task.sortOrder = sortIndex
                tasksToUpdate.push(cell.task)
            }
            sortIndex++
        })
        //this code should be rewrite
        if (tasksToUpdate && tasksToUpdate.length) {
            tasksToUpdate.forEach((task: TCTask) => {
                this.taskService.update(task).first().subscribe(updatedTask => {
                })
            })
        }
    }

    private updateSortOrderForSubtasks(parentTaskCell : TaskCell) {
        let sortIndex = 10
        let tasksToUpdate : TCTask[] = []
            parentTaskCell.sortSubtasks()
            parentTaskCell.subtasks.forEach((cell: TaskCell) => {
                if (cell.task.sortOrder !== sortIndex) {
                    cell.task.sortOrder = sortIndex
                    tasksToUpdate.push(cell.task)
                }
                sortIndex += 10
            })

        //this code should be rewrite
        if (tasksToUpdate && tasksToUpdate.length) {
            tasksToUpdate.forEach((task: TCTask) => {
                this.taskService.update(task).first().subscribe(updatedTask => {
                })
            })
        }
    }

    private updateSortOrderForTaskitos(parentTaskCell : TaskCell) {
        let sortIndex = 10
        let taskitosToUpdate : TCTaskito[] = []
            parentTaskCell.sortTaskitos()
            parentTaskCell.taskitos.forEach((taskito: TCTaskito) => {
                if (taskito.sortOrder !== sortIndex) {
                    taskito.sortOrder = sortIndex
                    taskitosToUpdate.push(taskito)
                }
                sortIndex += 10
            })

        //this code should be rewrite
        if (taskitosToUpdate && taskitosToUpdate.length) {
            taskitosToUpdate.forEach((taskito: TCTaskito) => {
                this.taskitoService.update(taskito).first().subscribe(updatedTaskito => {
                })
            })
        }
    }

    private handleCommand(hotkeyEvent : HotkeyEventModel) {
        if (!this.keyTracking) return
        switch (hotkeyEvent.name) {
            case 'Tasks.selectPrevTask':
                if(this.primarySelectedTask && !this.taskEditorIsOpen)
                    this.selectPrevTask()
                break
            case 'Tasks.selectNextTask':
                this.selectNextTask()
                break
            case 'Tasks.selectDeleteSelectedTasks':
                if (this.selectedTasks.length && !this.isDeleteDialogOpen) {
                    this.showDeleteSelectedConfirmationModal()
                }
                break
        }
    }
}

