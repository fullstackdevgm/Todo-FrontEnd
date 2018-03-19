import { Component, Input, Output, EventEmitter, OnInit, ElementRef, ViewChild, NgZone } from '@angular/core'
import { FormControl } from "@angular/forms"
import { TCTask } from '../../classes/tc-task'
import { TaskLocationAlertType } from '../../tc-utils'
import { MouseEvent as MapMouseClick, MapsAPILoader } from "@agm/core"
import { TCLocationService } from "../../services/tc-location.service"
import { TCTaskService } from "../../services/tc-task.service"

@Component({
    selector: 'task-edit-location-alert',
    templateUrl: 'task-edit-location-alert.component.html',
    styleUrls: ['task-edit-location-alert.component.css']
})
export class TaskEditLocationAlertComponent implements OnInit {
    private _task : TCTask
    @Input() set task(task : TCTask) {
        this._task = task

        if (!task.locationAlert) return

        const coords = task.locationAlertCoords
        this.latitude = coords.latitude
        this.longitude = coords.longitude
        this.currentAddress = task.locationAlertAdditionalInfoString
        this.direction = task.locationAlertType
    }
    @Output() done : EventEmitter<string> = new EventEmitter<string>()

    @ViewChild("locationSearchInput") searchElementRef : ElementRef

    TaskLocationAlertType = TaskLocationAlertType
    direction : TaskLocationAlertType = TaskLocationAlertType.Arriving

    latitude : number = 0
    longitude: number = 0
    mapZoomLevel : number = 8
    currentAddress : string = ''
    searchControl : FormControl = new FormControl()
    hasCurrentPositionError : boolean = false
    errorNumber : number = 0

    constructor(
        private locationService : TCLocationService,
        private readonly taskService : TCTaskService,
        private readonly mapsAPILoader : MapsAPILoader,
        private readonly ngZone : NgZone
    ){}

    ngOnInit() {
        this.locationService.currentPosition.first().subscribe(position => {
            this.latitude = position.lat
            this.longitude = position.lng
        },
        err => {
            this.hasCurrentPositionError = true
            this.errorNumber = err

            if (this.currentAddress) {
                this.searchForAddress(this.currentAddress)
            }
        },
        () => {
            if (this.currentAddress) {
                this.searchForAddress(this.currentAddress)
            }
        })

        this.locationService.registerForPlacesAutocomplete(this.searchElementRef).subscribe(result => {
            this.currentAddress = result.formattedAddress
            this.latitude = result.coords.lat
            this.longitude = result.coords.lng
        })
    }

    selectAlertType(type : TaskLocationAlertType) {
        this.direction = type
    }

    mapClick(click : MapMouseClick) {
        this.latitude = click.coords.lat
        this.longitude = click.coords.lng

        this.locationService.getAddressFromMapCoords(this.latitude, this.longitude).first().subscribe(address => {
            this.currentAddress = address
        })
    }

    searchForAddress(address : string) {
        this.locationService.getMapCoordsFromAddress(address).subscribe(response => {
            this.latitude = response.coords.lat
            this.longitude = response.coords.lng
            this.currentAddress = response.formattedAddress
        })
    }

    save() {
        if(!this.currentAddress) {
            this.cancel()
            return
        }
        this._task.locationAlertType = this.direction
        this._task.locationAlertCoords = { latitude : this.latitude, longitude : this.longitude }
        this._task.locationAlertAdditionalInfoString = this.currentAddress
        this.taskService.update(this._task).first().subscribe(result => {})
        this.done.emit(this._task.locationAlert)
    }

    cancel() {
        this.done.emit(null)
    }
}