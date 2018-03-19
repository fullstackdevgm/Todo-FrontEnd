import {Injectable} from '@angular/core'
import {Router, CanActivate} from '@angular/router'
import { tokenNotExpired } from 'angular2-jwt'
import { TCAuthenticationService } from '../services/tc-authentication.service'

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private router: Router,
        private auth  : TCAuthenticationService
    ) {}

    canActivate() {
        if (this.auth.needsTokenRefresh()) {
            if (this.auth.tokenExpired()) {
                this.auth.logout()
                return false
            }
        }

        return true
    }
}
