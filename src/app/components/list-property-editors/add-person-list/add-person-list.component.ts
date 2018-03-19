import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef} from '@angular/core'

import { TCList } from '../../../classes/tc-list'
import { TCAccount } from '../../../classes/tc-account'
import { TCInvitation } from '../../../classes/tc-invitation'
import { TCAccountService } from '../../../services/tc-account.service'
import { TCInvitationService } from '../../../services/tc-invitation.service'
import { TCListMembershipService } from '../../../services/tc-list-membership.service'
import { ListMemberAccountInfo } from '../../../tc-types'
import { ListMembershipType, Utils } from '../../../tc-utils'
import { Subscription } from 'rxjs'

@Component({
    selector : 'add-person-list',
    templateUrl : 'add-person-list.component.html',
    styleUrls : ['../../../../assets/css/list-editors.css', 'add-person-list.component.css']
})
export class ListEditAddPersonComponent {
    @Input() list : TCList
    @Output() done : EventEmitter<any> = new EventEmitter<any>()
    @Output() invited : EventEmitter<TCInvitation> = new EventEmitter<TCInvitation>()
    @ViewChild('inviteText') inviteText : ElementRef

    public sharedUsers : TCAccount[] = []
    public listMembers: ListMemberAccountInfo[] = []
    public account : TCAccount
    public invitations : TCInvitation[] = []
    public errorMessage : string = null

    public inviteInProgress : boolean = false

    private accountSub : Subscription
    private sharedMembersSub : Subscription
    private listMembersSub : Subscription
    private invitationsSub : Subscription

    constructor(
        private readonly listMembershipService : TCListMembershipService,
        private readonly accountService : TCAccountService,
        private readonly invitationService : TCInvitationService
    ){}

    ngOnInit() {
        this.accountSub = this.accountService.account.subscribe(account => {
            this.account = account
            this.sharedMembersSub = this.listMembershipService.getAllSharedListMembers().subscribe(allSharedUsers => {
                // This returns a list of users across ALL lists that have been
                // shared. What we need is the list of all users minus the ones
                // who have already been shared with this current list.

                this.listMembersSub = this.listMembershipService.getMembersForList(this.list).subscribe(members => {
                    const notCurrentMembers = allSharedUsers.filter((userInfo) => {
                        return !members.find((member) => {
                            return member.account.userID == userInfo.userID
                        })
                    })
                    this.sharedUsers = notCurrentMembers
                    this.listMembers = members
                })
            })

            this.invitationsSub = this.invitationService.getInvitationsForList(this.list).first().subscribe(result => {
                this.invitations = result
            })
        })
    }

    ngAfterViewInit() {
        // focus on input element
        if (this.inviteText) {
            this.inviteText.nativeElement.select()
        }
    }

    ngOnDestroy() {
        if (this.accountSub) this.accountSub.unsubscribe()
        if (this.sharedMembersSub) this.sharedMembersSub.unsubscribe()
        if (this.listMembersSub) this.listMembersSub.unsubscribe()
        if (this.invitationsSub) this.invitationsSub.unsubscribe()
    }

    isMe(user : TCAccount) : boolean {
        return this.account.userID == user.userID
    }

    selectUser(user : TCAccount) {
        this.inviteText.nativeElement.value = user.userName
    }

    invite() {
        this.inviteInProgress = true
        this.errorMessage = null
        if (
            this.account.userName === this.inviteText.nativeElement.value ||
            this.listMembers.filter(e => e.account.userName == this.inviteText.nativeElement.value).length > 0 ||
            this.invitations.filter(e => e.email == this.inviteText.nativeElement.value).length > 0
        ) {
            this.errorMessage = 'This user was already invited'
            this.inviteInProgress = false
            return false
        }

        if (!Utils.isValidEmail(this.inviteText.nativeElement.value)) {
            this.errorMessage = 'Please enter a valid email'
            this.inviteInProgress = false
            return false
        }

        const invitation = new TCInvitation({
            userid : this.account.userID,
            listid : this.list.identifier,
            membership_type : ListMembershipType.Member,
            email : this.inviteText.nativeElement.value
        })

        this.invitationService.sendInvitation(invitation).subscribe((result : TCInvitation) => {
            this.inviteInProgress = false
            this.invited.emit(result)
        }, err => {})
    }
}
