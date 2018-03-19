import { Injectable, OnInit, ElementRef, NgZone }     from '@angular/core'
import { Http, Headers, RequestOptions, Response, URLSearchParams }  from '@angular/http'
import { TCHttp } from '../tc-http'
import { environment } from '../../environments/environment'
import { Observable, ReplaySubject, Subject } from 'rxjs'
import 'rxjs/add/operator/map'

import { TCBaseService } from './tc-base.service'
import { TCErrorService } from './tc-error.service'
import { LatLngLiteral, MapsAPILoader } from '@agm/core'

@Injectable()
export class TCLocationService extends TCBaseService {
    private headers : Headers
    private readonly currentLocation : ReplaySubject<LatLngLiteral> = new ReplaySubject<LatLngLiteral>(1)

    constructor(
        private http : Http,
        tcHttp : TCHttp,
        errService : TCErrorService,
        private readonly mapsAPILoader : MapsAPILoader,
        private readonly ngZone : NgZone
    ){
        super(tcHttp, errService)
        this.headers = new Headers({ })
    }

    getAddressFromMapCoords(latitude : number, longitude : number) : Observable<string> {
        const params = new URLSearchParams()
        params.append('latlng', `${latitude},${longitude}`)
        params.append('key', environment.googleMapsAPIKey)

        const retVal = this.http
            .get(`https://maps.googleapis.com/maps/api/geocode/json`, { headers : this.headers, search : params }).share()
            .map(response => {
                if(response.ok) {
                    let mostDetailedAddressSize = 0
                    const results : {address_components : any[], formatted_address : string}[]  = response.json().results
                    const address = results.reduce((accum, current) : string => {
                        if (current.address_components.length > mostDetailedAddressSize) {
                            mostDetailedAddressSize = current.address_components.length
                            return current.formatted_address
                        }
                        return accum
                    }, '')
                    return mostDetailedAddressSize > 0 ? address : `${latitude}, ${longitude}`
                }
                else {
                    return Observable.throw(response.json().error || 'Geocode error')
                }
            })
            .catch(err => this.handleError(err))

        return retVal
    }

    getMapCoordsFromAddress(address : string) : Observable<{ coords : LatLngLiteral, formattedAddress : string }> {
        const params = new URLSearchParams()
        params.append('address', address)
        params.append('key', environment.googleMapsAPIKey)

        const retVal = this.http
            .get(`https://maps.googleapis.com/maps/api/geocode/json`, { headers : this.headers, search : params }).share()
            .map(response => {
                if(response.ok) {
                    const results : {geometry : { location : LatLngLiteral }, formatted_address : string}[]  = response.json().results
                    return results.length > 0 ? {
                        coords : results[0].geometry.location,
                        formattedAddress : results[0].formatted_address
                    } : Observable.throw('Geocode Error')
                }
                else {
                    return Observable.throw(response.json().error || 'Geocode error')
                }
            })
            .catch(err => this.handleError(err))

        return retVal
    }

    registerForPlacesAutocomplete(element : ElementRef) : Observable<{ coords : LatLngLiteral, formattedAddress : string }> {
        const subject = new Subject<{ coords : LatLngLiteral, formattedAddress : string }>()

        this.mapsAPILoader.load().then(() => {
            let autocomplete = new google.maps.places.Autocomplete(element.nativeElement, {
                types: ["address"]
            })
            autocomplete.addListener("place_changed", () => {
                this.ngZone.run(() => {
                    //get the place result
                    let place: google.maps.places.PlaceResult = autocomplete.getPlace()

                    //verify result
                    if (place.geometry === undefined || place.geometry === null) {
                        subject.error(new Error('Unable to retrieve place'))
                        return
                    }

                    subject.next({
                        coords : {
                            lat : place.geometry.location.lat(),
                            lng : place.geometry.location.lng()
                        },
                        formattedAddress : place.formatted_address
                    })
                })
            })
        })

        return subject
    }

    get currentPosition() : Observable<LatLngLiteral> {
        if (!("geolocation" in navigator)) {
            return Observable.throw(PositionError.POSITION_UNAVAILABLE)
        }

        const subject = new Subject<LatLngLiteral>()
        navigator.geolocation.getCurrentPosition((position)=> {
            this.currentLocation.next({ lat : position.coords.latitude, lng : position.coords.longitude })
        },
        err => {
            this.currentLocation.error(err)
        })

        return this.currentLocation        
    }
}
