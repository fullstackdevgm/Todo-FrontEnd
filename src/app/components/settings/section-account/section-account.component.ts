import { 
    Component, 
    OnInit, 
    OnDestroy, 
    ChangeDetectorRef, 
    Output, 
    EventEmitter, 
    ViewChild, 
    ElementRef 
}  from '@angular/core'
import { TCUserSettingsService } from '../../../services/tc-user-settings.service'
import { TCUserSettings, TCUserSettingsUpdate } from '../../../classes/tc-user-settings'
import { environment } from '../../../../environments/environment'
import { TCAccountService } from '../../../services/tc-account.service'
import { TCAccount, TCAccountUpdate } from '../../../classes/tc-account'
import { TCSubscriptionService } from '../../../services/tc-subscription.service'
import { TCSubscription } from '../../../classes/tc-subscription'
import { PasswordUpdate } from '../../../tc-types'
import { Utils } from '../../../tc-utils'
import { Subscription } from 'rxjs'

import Croppie from 'croppie'

const MAX_FILE_SIZE_IN_BYTES = 20971520 // 20 MB (to be loaded into the browser and cropped before sending to server)
const ACCEPTABLE_IMAGE_TYPES = [
    "image/x-png",
    "image/png",
    "image/gif",
    "image/jpeg"
]

@Component({
    selector: 'section-account',
    templateUrl: 'section-account.component.html',
    styleUrls: ['section-account.component.css']

})
export class SettingsAccountComponent implements OnInit, OnDestroy {
    account      : TCAccount
    private subscription : TCSubscription

    loading : boolean = true
    readonly currentDate : any = new Date()
    passwordSaving : boolean = false
    nameSaving : boolean = false
    errorMessage : string = null
    settings : TCUserSettings
    private settingsSub : Subscription

    croppie = null
    profileImageURL = null
    imageSaving : boolean = false
    disableAutofill : string = "new-password"
    falseAutofill : string = "off"

    firstName : string
    lastName : string
    username : string
    emailOptIn : boolean

    newPasswordErr : string = null

    @Output() showPremiumSelected : EventEmitter<void> = new EventEmitter<void>()

    @ViewChild('passwordInput') private passwordInput : ElementRef
    @ViewChild('newPasswordInput') private newPasswordInput : ElementRef
    @ViewChild('reenterPasswordInput') private reenterPasswordInput : ElementRef
    showPasswordUpdate : boolean = false

    constructor(
        private readonly accountService : TCAccountService,
        private readonly subscriptionService : TCSubscriptionService,
        private readonly changeDetector : ChangeDetectorRef,
        private userSettingsService : TCUserSettingsService
    ) {}

    ngOnInit() {
        this.settingsSub = this.userSettingsService.settings.subscribe(settings => {
            this.settings = settings
        })
        this.accountService.account.subscribe(account => {
            this.account = account

            this.firstName = account.firstName
            this.lastName = account.lastName
            this.username = account.userName
            this.emailOptIn = account.emailOptIn

            this.update()
        })
        this.subscriptionService.subscription.subscribe(subscription => {
            this.subscription = subscription
            this.update()
        })
    }

    ngOnDestroy() {
        this.errorMessage = null
        this.firstName = this.account.firstName
        this.lastName = this.account.lastName
        this.username = this.account.userName
        this.nameSaving = false
        this.settingsSub.unsubscribe()
    }

    update() {
        this.loading = this.account == null || this.subscription == null
        if (this.loading) {
            this.changeDetector.detectChanges()
        } else if (this.account && this.account.imageGUID) {
            this.profileImageURL = `${environment.baseProfileImageUrl}/${this.account.imageGUID}`
        }
    }

    cancelCroppie() {
        this.croppie.destroy()
        this.croppie = null
    }

    saveCroppedImages() {
        this.imageSaving = true
        this.accountService.getProfileImageUploadURLs().first().subscribe(result => {
            const jsonResults = JSON.parse(result)
            // console.log(`RESULTS: ${result}`)
            
            this.croppie.result({
                type: "blob",
                format: "jpeg",
                size: {width: 100, height: 100},
                quality: 1
            }).then((largeBlob) => {
                this.accountService.uploadProfileImage(largeBlob, jsonResults.largeUrlInfo).first().subscribe(uploadResult => {
                    const fields = jsonResults.largeUrlInfo.fields
                    const bucketName = fields.bucket
                    const largeFileKey = fields.Key

                    this.croppie.result({
                        type: "blob",
                        format: "jpeg",
                        size: {width: 50, height: 50},
                        quality: 1
                    }).then((smallBlob) => {
                        this.accountService.uploadProfileImage(smallBlob, jsonResults.smallUrlInfo).first().subscribe(uploadResult2 => {
                            const fields2 = jsonResults.smallUrlInfo.fields
                            const smallFileKey = fields2.Key
                            this.accountService.saveProfileImages(bucketName, largeFileKey, smallFileKey).first().subscribe(saveResult => {
                                const imageGUID = fields.Key.split("/").reverse()[0]
                                this.profileImageURL = `${environment.baseProfileImageUrl}/${imageGUID}`

                                this.accountService.getAccount().first().subscribe(result => {
                                    this.imageSaving = false
                                    console.log('stop')

                                    this.cancelCroppie()
                                })
                            })
                        })
                    })
                })
            })
        })
    }

    profilePictureSelected(fileInput: any) {

        const file = fileInput.target.files[0]
        // console.log(`File name: ${file.name}`) // IMG_9202.JPG
        // console.log(`File size: ${file.size}`) // 3819210
        // console.log(`File type: ${file.type}`) // image/jpeg

        // Do not attempt to process images that are larger than 10 MB
        if (file.size > MAX_FILE_SIZE_IN_BYTES) {
            console.log(`The file is too large: ${file.size}`)
            // TO-DO: Show an error and do not continue
            return
        }

        // Do not send files that are not images
        if (file.type == undefined) {
            console.log(`Cannot determine the file type and cannot continue.`)
            // TO-DO: Show an error about not being able to determine the image type
            return
        }
        const acceptableImage = ACCEPTABLE_IMAGE_TYPES.find((imgType) => {
            return imgType == file.type
        })
        if (!acceptableImage) {
            console.log(`The file selected is not a supported image type.`)
            // TO-DO: Show an error about the file not being a supported image type
            return
        }

        // Show the Croppie Interface for letting the user crop
        // and position their profile image before we send it to
        // the Todo Cloud Service.

        // TO-DO: Vladimir, I need your help to make this look better.
        // I think what would work well is to have Croppie fill the
        // full right-hand side space of the settings screen with
        // the Cancel and Save buttons at the bottom.

        const imageURL = URL.createObjectURL(file)
        let profileElement = document.getElementById("profile-crop")
        this.croppie = new Croppie(profileElement, {
            viewport: { width: 100, height: 100 },
            boundary: { width: 200, height: 200 },
            showZoomer: true
        });

        this.croppie.bind({
            url: imageURL
        });
    }

    updateNames() {
        this.nameSaving = true
        const update = new TCAccountUpdate()
        update.firstName = this.firstName
        update.lastName = this.lastName
        if (this.username != this.account.userName) update.userName = this.username
        this.accountService.updateAccount(update).subscribe(
            result => {
                this.nameSaving = false
                this.errorMessage = null
            },
            (err : string) => {
                this.firstName = this.account.firstName
                this.lastName = this.account.lastName
                this.username = this.account.userName
                this.nameSaving = false
                this.errorMessage = Utils.parseErrorMessage(err)
            }
        )
    }

    cancelChange() {
        this.firstName = this.account.firstName
        this.lastName = this.account.lastName
        this.username = this.account.userName
    }

    showUpgrade() {
        this.showPremiumSelected.emit()
    }

    onPasswordEntered() {
        this.showPasswordUpdate = true
    }

    onNewPasswordEntered() {
        if (this.passwordInput.nativeElement.value.length == 0) {
            this.passwordInput.nativeElement.focus()
            return
        }

        if (this.newPasswordInput.nativeElement.value.length == 0) {
            this.newPasswordInput.nativeElement.focus()
            return
        }

        if (this.reenterPasswordInput.nativeElement.value.length == 0) {
            this.reenterPasswordInput.nativeElement.focus()
            return
        }

        this.passwordSaving = true

        this.newPasswordInput.nativeElement.blur()
        this.reenterPasswordInput.nativeElement.blur()

        this.accountService.updatePassword({
            current : this.passwordInput.nativeElement.value,
            new_password : this.newPasswordInput.nativeElement.value,
            reentered_password : this.reenterPasswordInput.nativeElement.value
        }).subscribe(
            result => {
                this.newPasswordErr = null
                this.passwordInput.nativeElement.value = ''
                this.newPasswordInput.nativeElement.value = ''
                this.reenterPasswordInput.nativeElement.value = ''
                this.showPasswordUpdate = false
                this.passwordSaving = false
            },
            err => {
                this.newPasswordErr = Utils.parseErrorMessage(err)
                this.passwordSaving = false
            }
        )
    }

    updateEmailOptIn() {
        const update = new TCAccountUpdate()
        update.emailOptIn = this.emailOptIn
        update.firstName = this.firstName
        update.lastName = this.lastName
        this.accountService.updateAccount(update)
    }
}
