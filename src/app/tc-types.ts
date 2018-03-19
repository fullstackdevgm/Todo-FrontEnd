import { TCList } from './classes/tc-list'
import { TCTask } from './classes/tc-task'
import { TCTaskito } from './classes/tc-taskito'
import { TCAccount } from './classes/tc-account'
import { TCListMembership } from './classes/tc-list-membership'
import { TCInvitation } from './classes/tc-invitation'
import { TaskCell } from './components/tasks/task-cell'

import { Observable } from 'rxjs'

export interface ListEmailNotificationModel {
    taskNotifications : boolean,
    userNotifications : boolean,
    commentNotifications: boolean,
    notifyAssignedOnly: boolean,
}

export interface SettingsListEmailNotificationChangeModel {
    list : TCList,
    model : ListEmailNotificationModel,
    callback : (updatedModel : ListEmailNotificationModel, err? : Error) => void
}

export interface ListEmailNotificationChangeModel {
    model : ListEmailNotificationModel,
    callback : (updatedModel : ListEmailNotificationModel, err? : Error) => void
}

export interface PasswordUpdate {
    current : string,
    new_password : string,
    reentered_password : string
}

export interface TaskSectionDefinition {
    label : string,
    taskCells : TaskCell[],
    onDrop : (movedCell : TaskCell) => void
}

export interface SearchSource {
    iconName : string,
    color : string,
    name : string,
    showListForTasks : boolean,
    identifier : string
}

export type TaskCreatedEvent    = { task    : TCTask,    taskSave : Observable<TCTask> }
export type TaskitoCreatedEvent = { taskito : TCTaskito, taskitoSave : Observable<TCTaskito> }
export type ListMemberAccountInfo = { membership : TCListMembership, account : TCAccount }
export type InvitationInfo = { invitation : TCInvitation, account : TCAccount, list : TCList }
