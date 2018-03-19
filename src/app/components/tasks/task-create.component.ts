import { Component, Input, HostListener, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core'
import { TCTag } from '../../classes/tc-tag'
import { TCTaskito } from '../../classes/tc-taskito'
import { TCTask } from '../../classes/tc-task'
import { TCList } from '../../classes/tc-list'
import { TCUserSettings } from '../../classes/tc-user-settings'

import { TCTagService } from '../../services/tc-tag.service'
import { TCTaskService, TaskParsingResults } from '../../services/tc-task.service'
import { TCTaskitoService } from '../../services/tc-taskito.service'
import { TCListService } from '../../services/tc-list.service'
import { TCSmartListService } from '../../services/tc-smart-list.service'
import { TCUserSettingsService } from '../../services/tc-user-settings.service'
import { AppMenuIdentifier, AppMenuService} from '../../services/app-menu.service'
import { PaywallService } from '../../services/paywall.service'

import { Utils, TaskPriority, TaskType, DefaultDueDate, TaskRecurrenceType } from '../../tc-utils'
import { TaskCreatedEvent, TaskitoCreatedEvent } from '../../tc-types'
import { environment } from '../../../environments/environment'
import { HotkeyEventModel, TCHotkeyService } from '../../services/tc-hotkey.service'
import { Observable, Subscription } from 'rxjs'

import 'datejs'

export interface TaskCreationInformation {
    listId : string,
    parentIsChecklist : boolean,
    defaultDueDate : DefaultDueDate,
    parentTask? : TCTask
}

type TaskCreationFunction = (name: string) => void
interface TaskCreationModule {
    label : string
    placeholder : string
    creationFunction : TaskCreationFunction
    shouldShow : () => boolean
}
interface TaskCreationModuleCollecion {
    task : TaskCreationModule
    project : TaskCreationModule
    checklist : TaskCreationModule
    subtask : TaskCreationModule
    item : TaskCreationModule
}

const defaultDueDateToDate = (dueDate : DefaultDueDate) : Date => {
    const result = new Date()

    if (dueDate > 1) {
        result.setDate(result.getDate() + (dueDate - 1))
    }

    return dueDate > 0 ? result : null
}

const taskCreationInfoEqual = (a : TaskCreationInformation, b : TaskCreationInformation) : boolean => {
    // return false if either is null/undefined. Comparison is meaningless, so default to not equal
    if (!a || !b) return false

    const sameList : boolean = a.listId == b.listId
    const bothHaveParents : boolean = a.parentTask != null && b.parentTask != null
    const neitherHaveParents : boolean = a.parentTask == null && b.parentTask == null
    const parentsAreEqual : boolean = neitherHaveParents || (
        bothHaveParents && 
        a.parentTask.idEqual(b.parentTask) && 
        a.parentIsChecklist == b.parentIsChecklist
    )

    return sameList && parentsAreEqual
}

@Component({
    selector: 'task-create',
    templateUrl: 'task-create.component.html',
    styleUrls: ['task-create.component.css']
})
export class TaskCreateComponent {
    private _creationInfo : TaskCreationInformation
    DateJs: IDateJSStatic = <any>Date;
    
    @Input() set creationInfo (info : TaskCreationInformation) {
        const oldCreationInfo = this._creationInfo
        this._creationInfo = info

        if (!taskCreationInfoEqual(oldCreationInfo, info)) 
        {
            if (this.shouldCreateTaskito) {
                this.taskCreationModule = this.creationModuleCollection.item
            }
            else if(this.shouldCreateSubtask) {
                this.taskCreationModule = this.creationModuleCollection.subtask
            }
            else {
                this.taskCreationModule = this.creationModuleCollection.task
            }
        }
    }
    @Output() taskCreated : EventEmitter<TaskCreatedEvent> = new EventEmitter<TaskCreatedEvent>()
    @Output() taskNameSelected : EventEmitter<boolean> = new EventEmitter<boolean>()
    @Output() taskitoCreated : EventEmitter<TaskitoCreatedEvent> = new EventEmitter<TaskitoCreatedEvent>()

    @ViewChild('taskName') taskName : ElementRef

    taskNameInput : string = ""
    placeholder : string = "What's on your mind?"

    TaskType = TaskType

    get shouldCreateTask() : boolean {
        return !this.shouldCreateSubtask && !this.shouldCreateTaskito
    }

    get shouldCreateTaskito() : boolean {
        return this._creationInfo && this._creationInfo.parentTask && this._creationInfo.parentIsChecklist
    }

    get shouldCreateSubtask() : boolean {
        return this._creationInfo && this._creationInfo.parentTask && !this._creationInfo.parentIsChecklist
    }

    get shouldShowCreateChecklistButton() : boolean {
        return (
            this.shouldShowCreateProjectButton || 
            (this._creationInfo && this._creationInfo.parentTask != null)
        ) && 
        !this.shouldCreateTaskito
    }

    get shouldShowCreateProjectButton() : boolean {
        return this._creationInfo && this._creationInfo.parentTask == null
    }

    readonly creationModules : TaskCreationModule[] = [
        {
            label : "Task",
            placeholder : "Add a task",
            creationFunction : (name : string) => {
                this.createNewTask(name)
            },
            shouldShow : () => {
                return this.shouldCreateTask
            }
        },
        {
            label : "Subtask",
            placeholder : "Add a subtask",
            creationFunction : (name : string) => {
                this.paywallService.paywallCheck("Projects are a premium feature.",
                    () => this.createNewTask(name),
                    () => {}
                )
            },
            shouldShow : () => {
                return this.shouldCreateSubtask
            }
        },
        {
            label : "Item",
            placeholder : "Add an item",
            creationFunction : (name : string) => {
                this.createNewTaskito(name)
            },
            shouldShow : () => {
                return this.shouldCreateTaskito
            }
        },
        {
            label : "Project",
            placeholder : "Add a project",
            creationFunction : (name : string) => {
                this.paywallService.paywallCheck("Projects are a premium feature.",
                    () => this.createNewTask(name, TaskType.Project),
                    () => {}
                )
            },
            shouldShow : () => {
                return this.shouldShowCreateProjectButton
            }
        },
        {
            label : "Checklist",
            placeholder : "Add a checklist",
            creationFunction : (name : string) => {
                this.createNewTask(name, TaskType.Checklist)
            },
            shouldShow : () => {
                return this.shouldShowCreateChecklistButton
            }
        }
    ]

    readonly creationModuleCollection : TaskCreationModuleCollecion = {
        task : this.creationModules[0],
        subtask : this.creationModules[1],
        item : this.creationModules[2],
        project : this.creationModules[3],
        checklist : this.creationModules[4],
    }

    _taskCreationModule : TaskCreationModule
    set taskCreationModule(tcm : TaskCreationModule) {
        this._taskCreationModule = tcm
        this.placeholder = tcm.placeholder
        this.taskName.nativeElement.select()
    }

    private listSub : Subscription
    private smartListSub : Subscription
    protected settings : TCUserSettings

    private listsSub : Subscription
    private lists : TCList[]
    
    private tagsSub : Subscription
    private tags : TCTag[]

    private hotkeySubscription: Subscription

    constructor(
        private readonly tagService : TCTagService,
        private readonly taskService : TCTaskService,
        private readonly taskitoService : TCTaskitoService,
        private readonly listService : TCListService,
        private readonly smartListService : TCSmartListService,
        private readonly userSettingsService : TCUserSettingsService,
        private readonly appMenuService : AppMenuService,
        private readonly hotkeyService: TCHotkeyService,
        private readonly paywallService : PaywallService
    ) {
        this.hotkeySubscription = hotkeyService.commands.subscribe(hotkeyEvent => this.handleCommand(hotkeyEvent))
    }

    ngOnInit() : void {
        this.listSub = this.listService.selectedList.subscribe(list => {
            this.taskName.nativeElement.focus()
        })

        this.smartListSub = this.smartListService.smartListSelected.subscribe(smartList => {
            this.taskName.nativeElement.focus()
        })

        this.userSettingsService.settings.subscribe(settings => {
            this.settings = settings
        })

        this.listsSub = this.listService.lists.subscribe(lists => {
            this.lists = lists['lists']
        })

        this.tagsSub = this.tagService.tagsForUser().subscribe(tags => {
            this.tags = tags.map(tagInfo => tagInfo.tag)
        })

        this.placeholder = this.creationModules[0].placeholder

        this.appMenuService.enableMenuItems([
            AppMenuIdentifier.TaskCreate
        ])
        this.appMenuService.actions.subscribe(action => {
            if (action.menuItemID == AppMenuIdentifier.TaskCreate) {
                this.taskName.nativeElement.select()
            }
        })
    }

    ngOnDestroy() {
        this.listSub.unsubscribe()
        this.smartListSub.unsubscribe()
        this.listsSub.unsubscribe()
        this.tagsSub.unsubscribe()
        this.hotkeySubscription.unsubscribe()
    }

    createNewTask(taskName : string, type : TaskType = TaskType.Normal) {
        if (!(taskName.trim().length > 0) || this._creationInfo == null) return

        const newTask = new TCTask()
        newTask.listId = this._creationInfo.listId
        newTask.name = taskName.trim()
        newTask.taskType = type

        if (this._creationInfo.parentTask) {
            newTask.parentId = this._creationInfo.parentTask.identifier
            newTask.dueDate = this._creationInfo.parentTask.dueDate
            newTask.recurrenceType = TaskRecurrenceType.WithParent
        }
        else if(this._creationInfo.defaultDueDate > 0) {
            newTask.dueDate = defaultDueDateToDate(this._creationInfo.defaultDueDate)
        }

        let parsingResults : TaskParsingResults = this.runIntelligentTaskParsing(newTask)
        if (newTask.name.trim().length == 0) return

        this.taskCreated.emit({
            task : newTask,
            taskSave : this.taskService.create(newTask, parsingResults).first()
        })

        this.taskNameInput = ""
    }

    createNewTaskito(taskitoName : string) {
        if (!(taskitoName.trim().length > 0) || this._creationInfo == null || this._creationInfo.parentTask == null) return

        const newTaskito = new TCTaskito()
        newTaskito.parentId = this._creationInfo.parentTask.identifier
        newTaskito.name = taskitoName.trim()
        newTaskito.sortOrder = 0

        this.taskitoCreated.emit({
            taskito : newTaskito,
            taskitoSave : this.taskitoService.create(newTaskito).first()
        })

        this.taskNameInput = ""
    }

    runIntelligentTaskParsing(newTask : TCTask) : TaskParsingResults {
        if (!newTask) {
            return null
        }

        let results : TaskParsingResults = <TaskParsingResults>{}

        if (!this.settings.skipTaskPriorityParsing) {
            this.updatePriorityFromTaskName(newTask)
        }
        
        if (!this.settings.skipTaskListParsing) {
            this.updateListFromTaskName(newTask)
        }

        if (!this.settings.skipTaskTagParsing) {
            let possibleTags = this.updateTagsFromTaskName(newTask)
            if (possibleTags && possibleTags.length > 0) {
                results.parsed_tags = possibleTags
            }
        }

        if (!this.settings.skipTaskDateParsing) {
            this.updateDateFromTaskName(newTask)
        }

        if (!this.settings.skipTaskStartDateParsing) {
            this.updateStartDateFromTaskName(newTask)
        }

        if (!this.settings.skipTaskChecklistParsing) {
            let taskitos = this.updateChecklistFromTaskName(newTask)
            if (taskitos && taskitos.length > 0) {
                results.parsed_taskitos = taskitos
            }
        }

        // Only try to parse project items if this is not a checklist or a subtask
        if (!this.settings.skipTaskProjectParsing && !newTask.isChecklist && newTask.parentId == null) {
            let subtasks = this.updateProjectFromTaskName(newTask)
            if (subtasks && subtasks.length > 0) {
                results.parsed_subtasks = subtasks
            }
        }
        if (Object.keys(results).length > 0) {
            return results
        } else {
            return null // Return null so the caller knows it doesn't have to deal with any parsed results
        }
    }

    updatePriorityFromTaskName(newTask : TCTask) : void {
        if (!newTask) return

        if (!this.parseTaskPriorityType(newTask, TaskPriority.High)) {
            if (!this.parseTaskPriorityType(newTask, TaskPriority.Medium)) {
                if (!this.parseTaskPriorityType(newTask, TaskPriority.Low)) {
                    this.parseTaskPriorityType(newTask, TaskPriority.None)
                }
            }
        }
    }

    parseTaskPriorityType(task, priorityType) : void {
        if (!task) return
        if (typeof priorityType == "undefined" || priorityType == null) return
        
        const highPriorityPatterns = ["!high", "!h", "!hi", "!!!"]
        const medPriorityPatterns = ["!medium", "!med", "!m", "!!"]
        const lowPriorityPatterns = ["!low", "!l", "!"]
        const nonePriorityPatterns = ["!n", "!none"]

        let patterns = nonePriorityPatterns
        switch(priorityType) {
            case TaskPriority.High: {
                patterns = highPriorityPatterns
                break;
            }
            case TaskPriority.Medium: {
                patterns = medPriorityPatterns
                break;
            }
            case TaskPriority.Low: {
                patterns = lowPriorityPatterns
                break
            }
            case TaskPriority.None:
            default: {
                patterns = nonePriorityPatterns
                break
            }
        }

        const items = task.name.split(' ')

        let itemIndex = -1
      
        const priorityItem = items.find((item, idx) => {
          itemIndex = idx
          const lowerItem = item.toLowerCase()
          return patterns.find(pattern => pattern == lowerItem)
        })
      
        if (priorityItem) {
          task.priority = priorityType
          items.splice(itemIndex, 1) // removes the priority pattern from the task name
          task.name = items.join(' ') // reconstructs the new task name
        }
    }

    updateListFromTaskName(newTask : TCTask) : void {
        if (!newTask) return

        let taskName = newTask.name

        // Don't waste time if there's not even a dash character
        if (taskName.indexOf('-') == -1) return

        // If a matching list is found, track its position in the task
        // name so we can remove it later.
        let itemIndex = -1

        const matchingList : TCList = this.lists.find((list : TCList) => {
            // Look for each list in the task name
            const lowerListName = list.name.toLowerCase()
            const lowerTaskName = taskName.toLowerCase()

            itemIndex = lowerTaskName.indexOf(lowerListName)
            if (itemIndex > 0) {
                // Now check to see if the character before the list
                // is a dash character.
                const textBeforeList = lowerTaskName.substring(0, itemIndex).trim()
                if (textBeforeList.endsWith("-")) {
                    // Make sure that the preceeding character isn't another dash
                    if (textBeforeList.length == 1 || textBeforeList.substr(0, textBeforeList.length - 1).endsWith("-") == false) {
                        return true
                    }
                }
            }

            return false
        })

        if (matchingList) {
            newTask.listId = matchingList.identifier

            // First remove the original list name in the task name
            const originalItem : string = taskName.substr(itemIndex, matchingList.name.length)
            taskName = taskName.replace(originalItem, '')

            // Now remove the dash character, which could have had any number of whitespace
            // before the list name.
            var leftSide = taskName.substring(0, itemIndex).trim() // puts the dash at the far right
            leftSide = leftSide.substr(0, leftSide.length - 1) // Removes the dash
            const rightSide = taskName.length > itemIndex ? taskName.substr(itemIndex) : ""
            taskName = `${leftSide} ${rightSide}`

            taskName = taskName.replace('  ', ' ') // replace any double spaces with a single space
            newTask.name = taskName
        }
    }

    updateTagsFromTaskName(newTask : TCTask) : string[] {
        if (!newTask) return []

        let taskName = newTask.name

        const possibleTagElements = taskName.split(" ").filter(item => item.startsWith(`#`))
        const possibleTags : string[] = []

        if (possibleTagElements.length > 0) {
            this.paywallService.paywallCheck('Adding tags to tasks is a premium feature.', () => {
                possibleTagElements.forEach(possibleTagElement => {
                    const lowerPossibleTag = possibleTagElement.substr(1).toLocaleLowerCase()
                    if (lowerPossibleTag && lowerPossibleTag.length > 0) {
                        possibleTags.push(lowerPossibleTag)
        
                        // Remove the element from the task name
                        let regEx = new RegExp(possibleTagElement, 'g')
                        taskName = taskName.replace(regEx, ``) // replace *all* occurrences
                    }
                })
        
                // Make sure we don't leave the task with any double spaces
                taskName = taskName.replace(`  `, ` `)
                newTask.name = taskName.trim()
            })
        }

        return possibleTags
    }

    updateDateFromTaskName(newTask : TCTask) : void {
        if (!newTask) return
        
        let taskName = newTask.name

        // This regular expression will match a parenthesized expression
        let possibleMatches = taskName.match(/(\s)*\([^\)]+\)(\s)*/g)
        if (possibleMatches) {
            possibleMatches.forEach(match => {
                var matched = false

                var expression = match.trim()

                // Remove the parentheses from the expression
                expression = expression.substr(1, match.length - 3).trim().toLowerCase()

                // First see if the user is trying to specify no due date
                if (expression == "no date" || expression == "no due date" || expression == "none") {
                    newTask.dueDate = null
                    newTask.dueDateHasTime = false
                    matched = true
                } else {
                    // This regular expression removes the words 'on', 'at', 'in', and @,
                    // to remove ambiguity when parsing a date.
                    expression = expression.replace(/(^|\s)(on|at|in|@)(?=($|\s))/g, ' ')

                    var date = this.DateJs.parse(expression)
                    if (date) {
                        // Found a date! Set the date on the task

                        // Try to determine if a time is specified in the string.
                        // If so, set dueDateHasTime to true.
                        if (expression.indexOf("pm") > 0 || expression.indexOf("am") > 0 || expression.indexOf("a.m.") > 0 || expression.indexOf("p.m.") > 0
                            || expression.indexOf("o'clock") > 0 || expression.indexOf(":") > 0 || expression.indexOf("oclock") > 0) {
                            newTask.dueDate = date
                            newTask.dueDateHasTime = true
                        } else {
                            newTask.dueDate = date
                            newTask.dueDateHasTime = false
                        }
                        matched = true
                    }
                }

                if (matched) {
                    // Remove the parenthesized expression from the task name, unless that will make the task name empty
                    let newTaskName = taskName.replace(match, '').trim()
                    if (newTaskName.length > 0) {
                        newTask.name = newTaskName
                    }
                    return
                }
            })
        }
    }

    updateStartDateFromTaskName(newTask : TCTask) : void {
        if (!newTask) return
        
        let taskName = newTask.name

        // This regular expression will match a parenthesized expression
        let possibleMatches = taskName.match(/(\s)*\[[^\]]+\](\s)*/g)
        if (possibleMatches) {
            possibleMatches.forEach(match => {
                var matched = false

                var expression = match.trim()

                // Remove the parentheses from the expression
                expression = expression.substr(1, match.length - 3).trim().toLowerCase()

                // First see if the user is trying to specify no date
                if (expression == "no date" || expression == "none") {
                    newTask.dueDate = null
                    newTask.dueDateHasTime = false
                    matched = true
                } else {
                    // This regular expression removes the words 'on', 'at', 'in', and @,
                    // to remove ambiguity when parsing a date.
                    expression = expression.replace(/(^|\s)(on|at|in|@)(?=($|\s))/g, ' ')

                    var date = this.DateJs.parse(expression)
                    if (date) {
                        // Found a date! Set the date on the task
                        newTask.startDate = (date > newTask.dueDate) ? newTask.dueDate : date
                        matched = true
                    }
                }

                if (matched) {
                    // Remove the parenthesized expression from the task name, unless that will make the task name empty
                    let newTaskName = taskName.replace(match, '').trim()
                    if (newTaskName.length > 0) {
                        newTask.name = newTaskName
                    }
                    return
                }
            })
        }
    }

    updateChecklistFromTaskName(newTask : TCTask) : string[] {
        // A user can turn a task into a checklist by adding a colon
        // followed by a comma-separated list of items.
        if (!newTask) return []
        
        let taskName = newTask.name
        let taskitos : string[] = []

        let colonPosition = taskName.indexOf(":")
        if (colonPosition > 0 && colonPosition + 1 < taskName.length) {
            let potentialList = taskName.substr(colonPosition + 1)
            let checklistItems = potentialList.split(",")
            if (checklistItems && checklistItems.length > 1) {
                // We've found checklist items so convert this to a checklist
                newTask.taskType = TaskType.Checklist
                checklistItems.forEach(item => {
                    let trimmedItemName = item.trim()
                    if (trimmedItemName && trimmedItemName.length > 0) {
                        taskitos.push(trimmedItemName)
                    }
                })

                // Remove the checklist items from the name of the original task
                newTask.name = taskName.substring(0, colonPosition).trim()
            }
        }

        return taskitos
    }

    updateProjectFromTaskName(newTask : TCTask) : string[] {
        // A user can turn a task into a project by adding a semi-colon
        // followed by a comma-separated list of subtasks.
        if (!newTask) return []
        
        let taskName = newTask.name
        let subtasks : string[] = []

        let colonPosition = taskName.indexOf(";")
        if (colonPosition > 0 && colonPosition + 1 < taskName.length) {
            this.paywallService.paywallCheck('Creating projects is a premium feature.', () => {
                let potentialList = taskName.substr(colonPosition + 1)
                let subtaskItems = potentialList.split(",")
                if (subtaskItems && subtaskItems.length > 0) {
                    // We've found subtask items so convert this to a project
                    newTask.taskType = TaskType.Project
                    newTask._projectDueDate = newTask._dueDate
                    subtaskItems.forEach(item => {
                        let trimmedItemName = item.trim()
                        if (trimmedItemName && trimmedItemName.length > 0) {
                            subtasks.push(trimmedItemName)
                        }
                    })

                    // Remove the subtasks from the name of the original task
                    newTask.name = taskName.substring(0, colonPosition).trim()
                }
            })
        }

        return subtasks
    }

    private handleCommand(hotkeyEvent : HotkeyEventModel) {
        switch (hotkeyEvent.name) {
            case 'MacOS.TaskCreate.create':
                if (Utils.isMacOS && this.taskName) {
                    this.taskName.nativeElement.select()
                }
                break
            case 'Other.TaskCreate.create':
                if (!Utils.isMacOS && this.taskName) {
                    this.taskName.nativeElement.select()
                }
                break
        }
    }

}