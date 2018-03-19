import { TCTaskito } from '../../classes/tc-taskito'
import { TaskCell } from './task-cell'
import { TaskSectionDefinition } from '../../tc-types'
import { TaskPriority } from '../../tc-utils'

export interface DragAndDropAction {
    movedTaskCell? : TaskCell,
    movedTaskito? : TCTaskito,
    movedTaskSection? : TaskSectionDefinition,
    movedItemHasParent : boolean,
    movedItemParent : TaskCell,
    targetIsChild : boolean,
    targetCell? : TaskCell,
    targetTaskito? : TCTaskito,
    targetParent? : TaskCell,
    targetIsCalendar : boolean,
    targetIsList : boolean,
    targetIsHeader : boolean,
    targetHeaderSection? : TaskSectionDefinition,
    movedInSameDimension : boolean
}

type DetermineDragAndDropActionFunction = (element : any, target : any, sectionRetrievalFunction : (section : number) => TaskSectionDefinition) => DragAndDropAction

export const DetermineDragAndDropAction : DetermineDragAndDropActionFunction = (element, target, sectionRetrievalFunction) => {
    const result : DragAndDropAction = {
        movedTaskCell : null,
        movedTaskito : null,
        movedItemHasParent : false,
        movedItemParent : null,
        targetIsChild : false,
        targetCell : null,
        targetTaskito : null,
        targetIsCalendar : false,
        targetIsList : false,
        targetIsHeader : false,
        movedInSameDimension : false
    }

    if (!element || !target) return result

    // Determine info about the task that's being moved.
    const taskId = element.dataset.id
    const taskSectionIndex = element.dataset.sectionIndex
    const movedTaskSection = sectionRetrievalFunction(taskSectionIndex)
    const parentCell = movedTaskSection.taskCells.find(t => t.task.identifier === taskId)
    const taskCell = element.classList.contains('is-subtask') ? 
        parentCell.subtasks.find(t => t.task.identifier == element.dataset.subId) : 
        parentCell
    result.movedTaskCell = taskCell
    result.movedTaskSection = movedTaskSection

    if (taskCell.task.identifier != parentCell.task.identifier) {
        result.movedItemParent = parentCell
        result.movedItemHasParent = true
    }

    if (element.classList.contains('task-taskito') || element.classList.contains('subtask-taskito')) {
        result.movedItemHasParent = true
        result.movedItemParent = parentCell

        let taskitoId = element.dataset.subId

        if(element.classList.contains('subtask-taskito')){
            let parentChecklistId = element.dataset.parentId
            let parentChecklist = taskCell.subtasks.find(t => t.task.identifier === parentChecklistId)

            result.movedItemParent = parentChecklist
            result.movedTaskito = parentChecklist.taskitos.find(t => t.identifier === taskitoId)
        }
        else {
            result.movedTaskito = taskCell.taskitos.find(t => t.identifier === taskitoId)
        }

        if (result.movedTaskito) result.movedTaskCell = null
    }

    // Determine information about where the task is being dropped.
    if (target && target.classList.contains('calendar-day')) {
        result.targetIsCalendar = true
        return result
    }

    if (target && target.classList.contains('list-item')) {
        result.targetIsList = true
        return result
    }

    if (target && target.classList.contains('task-section-header')) {
        const headerSectionIndex = target.dataset.sectionIndex
        result.targetHeaderSection = sectionRetrievalFunction(headerSectionIndex)
        result.targetIsHeader = true
        return result
    }

    const targetId = target.dataset.id
    const targetSectionIndex = target.dataset.sectionIndex
    const targetCell = sectionRetrievalFunction(targetSectionIndex).taskCells
        .find(t => t.task.identifier === targetId)
    const targetChildCell = target.classList.contains('is-subtask') ? 
        targetCell.subtasks.find(t => t.task.identifier == target.dataset.subId) : 
        targetCell
    result.targetCell = targetCell

    if (targetCell.task.identifier != targetChildCell.task.identifier) {
        result.targetCell = targetChildCell
        result.targetParent = targetCell
        result.targetIsChild = true
    }

    let subTargetId : string = null
    let subTargetCell : TaskCell = null
    if (target.classList.contains('is-subtask')) {
        subTargetId = target.dataset.subId
        subTargetCell = targetCell.subtasks.find(t => t.task.identifier === subTargetId)
    }

    if (target.classList.contains('task-taskito')) {
        //move taskito and drop to taskito
        const subTargetId = target.dataset.subId
        const targetTaskito = targetCell.taskitos.find(t => t.identifier === subTargetId)
        result.targetCell = targetCell
        result.targetTaskito = targetTaskito
    }
    if (target.classList.contains('subtask-taskito')) {

        const parentChecklistId = target.dataset.parentId
        const parentChecklist = targetCell.subtasks.find(t => t.task.identifier === parentChecklistId)

        const subTargetId = target.dataset.subId
        const targetTaskito = parentChecklist.taskitos.find(t => t.identifier === subTargetId)
        result.targetCell = parentChecklist
        result.targetTaskito = targetTaskito
    }

    //for subtasks
    if (subTargetCell && (taskCell.task.parentId === subTargetCell.task.parentId) &&
        (subTargetCell.task.isRegular || taskCell.task.isProject && subTargetCell.task.isChecklist)) {
        result.targetCell = subTargetCell
        result.targetIsChild = true
        result.movedInSameDimension = true
    } else if ((!result.movedItemHasParent && !taskCell.task.parentId && !targetCell.task.parentId) &&
        //for roots tasks
        (targetCell.task.isRegular || (taskCell.task.isProject && targetCell.task.isChecklist))) {
        result.movedInSameDimension = true
    } else if (result.movedTaskito && result.targetTaskito && result.movedTaskito.parentId == result.targetTaskito.parentId) {
        //sorting taskitos
        result.movedInSameDimension = true
    }

    return result
}

type DragAndDropConditions = {
    moveToProject : boolean[],
    moveToList : boolean[],
    moveToChecklist : boolean[],
    changeTaskitoChecklist : boolean[],
    convertTaskitoToTask : boolean[],
    updateSort: boolean[]

}
export const GetDragAndDropConditions = (action : DragAndDropAction) : DragAndDropConditions => {
   return { 
        moveToProject : [
            (
                !action.targetIsHeader &&
                action.movedTaskCell &&
                !action.movedTaskCell.task.isSubtask && 
                !action.movedTaskCell.task.isProject && 
                action.targetCell.task.isProject
            ),
            (
                !action.targetIsHeader &&
                action.movedTaskCell &&
                action.movedTaskCell.task.isSubtask && 
                !action.movedTaskCell.task.isProject && 
                action.targetCell.task.isProject && 
                action.movedItemHasParent &&
                action.targetCell.task.identifier != action.movedItemParent.task.identifier
            ),
            (
                !action.targetIsHeader &&
                action.movedTaskCell &&
                action.targetCell &&
                action.targetCell.task.isSubtask &&
                !action.movedTaskCell.task.isProject && 
                !action.targetCell.task.isChecklist
            )
        ],

        moveToList :  [
            (
                !action.targetIsHeader &&
                action.movedTaskCell &&
                action.movedItemHasParent &&
                (
                    !action.targetCell.task.isSubtask || 
                    !action.targetCell.task.isProject
                )
            ),
            (
                !action.targetIsHeader &&
                action.movedItemHasParent &&
                action.movedItemParent.task.isProject && 
                action.targetCell.task.identifier == action.movedItemParent.task.identifier
            ),
            (
                action.movedTaskCell &&
                action.targetIsHeader &&
                action.movedItemHasParent
            )
        ],

        moveToChecklist : [
            (
                action.movedTaskCell &&
                !action.movedTaskCell.task.isParent && 
                action.targetCell.task.isChecklist
            ),
            (
                action.movedTaskCell &&
                action.targetIsChild &&
                action.targetCell.task.isChecklist
            )
        ],

        changeTaskitoChecklist : [
            (
                action.movedTaskito &&
                action.movedItemHasParent &&
                action.targetCell &&
                action.targetCell.task.isChecklist &&
                action.targetCell.task.identifier != action.movedTaskito.parentId
            )
        ],

        convertTaskitoToTask : [
            (
                action.movedTaskito != null &&
                action.targetCell != null
            ),
            (
                action.movedTaskito != null &&
                action.targetIsHeader
            )
        ],

        updateSort : [
            action.movedInSameDimension != false
        ]
    }
}

type HeaderDropFunction = (movedCell : TaskCell) => void
interface HeaderDropFunctionsType {
    noDueDate : HeaderDropFunction,
    overdue : HeaderDropFunction,
    dueToday : HeaderDropFunction,
    dueTomorrow : HeaderDropFunction,
    dueNextSevenDays : HeaderDropFunction,
    dueFuture : HeaderDropFunction,
    noPriority : HeaderDropFunction,
    lowPriority : HeaderDropFunction,
    mediumPriority : HeaderDropFunction,
    highPriority : HeaderDropFunction,
    completed? : HeaderDropFunction
}

export const HeaderDropFunctions : HeaderDropFunctionsType = {
    noDueDate : (movedCell : TaskCell) => {
        movedCell.task.dueDate = null
    },
    overdue : (movedCell : TaskCell) => {
        const date = new Date()
        date.setDate(date.getDate() - 1)
        date.setHours(0, 0, 0, 0)
        movedCell.task.dueDate = date
    },
    dueToday : (movedCell : TaskCell) => {
        const date = new Date()
        date.setHours(0, 0, 0, 0)
        movedCell.task.dueDate = date
    },
    dueTomorrow : (movedCell : TaskCell) => {
        const date = new Date()
        date.setDate(date.getDate() + 1)
        date.setHours(0, 0, 0, 0)
        movedCell.task.dueDate = date
    },
    dueNextSevenDays : (movedCell : TaskCell) => {
        const date = new Date()
        date.setDate(date.getDate() + 2)
        date.setHours(0, 0, 0, 0)
        movedCell.task.dueDate = date
    },
    dueFuture : (movedCell : TaskCell) => {
        const date = new Date()
        date.setDate(date.getDate() + 8)
        date.setHours(0, 0, 0, 0)
        movedCell.task.dueDate = date
    },
    noPriority : (movedCell : TaskCell) => {
        movedCell.task.priority = TaskPriority.None
    },
    lowPriority : (movedCell : TaskCell) => {
        movedCell.task.priority = TaskPriority.Low
    },
    mediumPriority : (movedCell : TaskCell) => {
        movedCell.task.priority = TaskPriority.Medium
    },
    highPriority : (movedCell : TaskCell) => {
        movedCell.task.priority = TaskPriority.High
    }
}
