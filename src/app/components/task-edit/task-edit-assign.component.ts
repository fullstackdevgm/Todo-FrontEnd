import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core'

import { TCTask } from '../../classes/tc-task'
import { TCAccount } from '../../classes/tc-account'
import { TCListMembership } from '../../classes/tc-list-membership'
import { ListMemberAccountInfo } from '../../tc-types'
import { TCListMembershipService } from '../../services/tc-list-membership.service'
import { TCTaskService } from '../../services/tc-task.service'
import { TCAccountService } from '../../services/tc-account.service'
import { PaywallService } from '../../services/paywall.service'
import { Subscription } from 'rxjs/Rx'

import { environment } from '../../../environments/environment'

@Component({
    selector : 'task-edit-assign-task',
    templateUrl : 'task-edit-assign.component.html',
    styleUrls : ['../../../assets/css/task-editors.css', 'task-edit-assign.component.css', 'task-edit.component.css']
})
export class TaskEditAssign implements OnInit, OnDestroy {
    
    _task : TCTask
    @Input() set task(task : TCTask) {
        if (!task || !task.listId) return

        this._task = task
        this.loading = true
        this.showAssign = false
        this.listMembershipService.getMembersForListID(this._task.listId).subscribe(result => {
            this.members = result
            this.loading = false

            this.selectedMember = this.members.find((memberInfo) => memberInfo.account.identifier == this._task.assignedUserId)
        })
    }
    @Output() userAssigned : EventEmitter<TCAccount> = new EventEmitter<TCAccount>()
    @Output() userRemoved  : EventEmitter<void> = new EventEmitter<void>()

    environment  = environment
    selectedMember : ListMemberAccountInfo = null
    members : ListMemberAccountInfo[] = []
    loading : boolean
    showMemberSelection : boolean
    showAssign = false

    constructor(
        private readonly listMembershipService : TCListMembershipService,
        private readonly paywallService : PaywallService,
        private readonly taskService : TCTaskService
    ) {}

    ngOnInit() {
    }

    ngOnDestroy() {
    }

    updateTask() {
        this.taskService.update(this._task).first().subscribe(result => {})
    }

    listMemberSelected(member : ListMemberAccountInfo) {
        if (this._task.assignedUserId == member.membership.userId) {
            this.removeSelectedMember()
            return
        }

        this._task.assignedUserId = member.account.identifier
        this.selectedMember = member
        this.showAssign = false
        this.userAssigned.emit(this.selectedMember.account)

        this.updateTask()
    }

    toggleMemberList() {
        if(!this.selectedMember) {
            this.paywallService.paywallCheck("Only premium users can assign tasks to someone.",
                () => this.showAssign=!this.showAssign,
            )
        }
    }

    removeSelectedMember() {
        this._task.assignedUserId = ''
        this.selectedMember = null
        this.showAssign = false
        this.userRemoved.emit()

        this.updateTask()
    }
}
