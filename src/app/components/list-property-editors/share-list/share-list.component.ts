import { Component, OnInit, Input, Output, EventEmitter} from '@angular/core'

import { TCList } from '../../../classes/tc-list'
import { TCSmartList } from '../../../classes/tc-smart-list'
import { TCInvitation } from '../../../classes/tc-invitation'
import { TCListMembershipService } from '../../../services/tc-list-membership.service'
import { TCInvitationService } from '../../../services/tc-invitation.service'
import { TCAccountService } from '../../../services/tc-account.service'
import { TCSyncService } from '../../../services/tc-sync.service'
import { ListMemberAccountInfo } from '../../../tc-types'
import { ListMembershipType } from '../../../tc-utils'
import { TCListMembership } from '../../../classes/tc-list-membership'
import { environment } from '../../../../environments/environment'

enum ShareListScreen {
    Main,
    Invite
}

@Component({
    selector : 'share-list',
    templateUrl : 'share-list.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'share-list.component.css']
})
export class ListShareComponent {
    @Input() list : TCList
    @Output() done : EventEmitter<any> = new EventEmitter<any>()
    @Output() listMembershipChanged : EventEmitter<void> = new EventEmitter<void>()

    public me : ListMemberAccountInfo
    public members : ListMemberAccountInfo[]
    public invitations : TCInvitation[]
    public sendingInvitation : string[] = []
    public invitationSent : string[] = []
    public savingOwner : string[] = []

    ShareListScreen = ShareListScreen
    currentShareScreen : ShareListScreen = ShareListScreen.Main

    constructor(
        private readonly listMembershipService : TCListMembershipService,
        private readonly invitationService : TCInvitationService,
        private readonly accountService : TCAccountService,
        private readonly syncService : TCSyncService
    ){}

    ngOnInit() {
        if (!environment.isElectron) {
            this.populateListMemberInformation()
            return
        }
        
        this.syncService.syncIdForList(this.list).first().subscribe(result => {
            // The list MUST be synced with the server before it can be shared. This block
            // ensures that sync has happened before the an invitation can be made.
            if (result.hasSyncId) {
                this.populateListMemberInformation()
                return
            }
            
            this.syncService.syncCompleted.first().subscribe(result => {
                this.populateListMemberInformation()
            })
            this.syncService.performSync()
        })
    }

    populateListMemberInformation() {
        this.accountService.account.first().subscribe(account => {
            this.listMembershipService.getMembersForList(this.list).first().subscribe(result => {
                const matchesAccount = (info) => info.account.userID == account.userID
                this.me = result.find(matchesAccount)
                const notMe = result.filter(info => !matchesAccount(info))

                this.members = [this.me].concat(notMe)
            })

            this.invitationService.getInvitationsForList(this.list).first().subscribe(result => {
                this.invitations = result
            })
        })
    }

    isMe(member : ListMemberAccountInfo) : boolean {
        return this.me.account.userID == member.account.userID
    }

    isOwner(member : ListMemberAccountInfo) : boolean {
        if (!member) return false
        return member.membership.membershipType == ListMembershipType.Owner
    }

    isOnlyOwner(member : ListMemberAccountInfo) : boolean {
        if (!member) return false
        return (member.membership.membershipType == ListMembershipType.Owner && this.members.filter((aMember) => {
            return aMember.membership.membershipType == ListMembershipType.Owner
        }).length <= 1)
    }

    isOwnerInvitation(invitation : TCInvitation) : boolean {
        return invitation.membershipType == ListMembershipType.Owner
    }

    removeMember(member : ListMemberAccountInfo) {
        this.listMembershipService.removeMember(member.membership).subscribe(() => {
            this.members = this.members.filter(m => m.account.userID != member.account.userID)
            this.listMembershipChanged.emit()
        },
        err => {})
    }

    toggleMemberOwner(member : ListMemberAccountInfo) {
        if (!this.isOwner(this.me)) return
        this.savingOwner.push(member.account.identifier)
        const role = this.isOwner(member) ? ListMembershipType.Member : ListMembershipType.Owner
        this.listMembershipService.changeRole(member.membership, role).subscribe(
            result => {
                if(result.success) {
                    member.membership = new TCListMembership({
                        'userid': member.membership.userId,
                        'listid': member.membership.listId,
                        'membership_type': role,
                    })
                }
                this.deleteSpinner(this.savingOwner, member.account.identifier)
            },
            err => {
                console.log(err)
                this.deleteSpinner(this.savingOwner, member.account.identifier)
            }
        )
    }

    resendInvitation(invitation : TCInvitation) {
        this.sendingInvitation.push(invitation.identifier)
        this.invitationService.resendInvitation(invitation).first().subscribe(result => {
            this.deleteSpinner(this.sendingInvitation, invitation.identifier)
            this.invitationSent.push(invitation.identifier)
            setTimeout(() => {
                this.deleteSpinner(this.invitationSent, invitation.identifier)
            }, 3000)
        })
    }

    removeInvitation(invitation : TCInvitation) {
        this.invitationService.deleteInvitation(invitation).first().subscribe(result => {
            this.invitations = this.invitations.filter(inv => inv.identifier != invitation.identifier)
            this.listMembershipChanged.emit()
        })
    }

    toggleInvitationOwner(invitation : TCInvitation) {
        if (!this.isOwner(this.me)) return
        this.savingOwner.push(invitation.identifier)
        const role = this.isOwnerInvitation(invitation) ? ListMembershipType.Member : ListMembershipType.Owner
        this.invitationService.updateInvitationRole(invitation, role).subscribe(result => {
            invitation.membershipType = result.membershipType
            this.deleteSpinner(this.savingOwner, invitation.identifier)
        })
    }

    showInvite() {
        this.currentShareScreen = ShareListScreen.Invite
    }

    hideInvite() {
        this.currentShareScreen = ShareListScreen.Main
    }

    onNewInvtation(invitation : TCInvitation) {
        this.invitations.push(invitation)
        this.listMembershipChanged.emit()
        this.hideInvite()
    }

    deleteSpinner(container : string[], id : string) {
        let index : number = container.indexOf(id);
        if (index !== -1) {
            container.splice(index, 1);
        }
    }
}
