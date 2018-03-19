import {NgModule}               from '@angular/core'
import {RouterModule, Routes, Route, UrlSegmentGroup, UrlSegment}   from '@angular/router'

import {AuthGuard}              from './guards/auth.guard'

import {HomeComponent}          from './components/home/home.component'
import {LandingComponent}       from './components/landing/landing.component'
import {NotImplementedComponent}from './components/not-implemented/not-implemented.component'
import {ResetPasswordComponent} from './components/reset-password/reset-password.component'
import {VerifyEmailComponent}   from './components/verify-email/verify-email.component'
import {AcceptInvitationComponent}   from './components/accept-invitation/accept-invitation.component'
import {StaticPageComponent}    from './components/static-page/static-page.component'
import {RedirectComponent}      from './components/static-page/redirect.component'

const routes: Routes = [
    {path: 'welcome', component: LandingComponent},
    {path: 'welcome/:screenid', component: LandingComponent},
    {path: 'signin', redirectTo: '/welcome/signin', pathMatch: 'full'},
    {path: 'register', redirectTo: '/welcome/register', pathMatch: 'full'},
    {path: 'home', component: HomeComponent, canActivate: [AuthGuard]},
    {path: 'password-reset/:resetid', component: ResetPasswordComponent},
    {path: 'verify-email/:verificationid', component: VerifyEmailComponent},
    {path: 'accept-invitation/:invitationid', component: AcceptInvitationComponent},
    {path: 'terms', component: StaticPageComponent},
    {path: 'privacy', component: StaticPageComponent},
    {path: '', component: RedirectComponent },
    {path: '**', component: NotImplementedComponent}
]

@NgModule({
    imports: [RouterModule.forRoot(routes, {useHash: true})],
    exports: [RouterModule]
})

export class AppRoutingModule {}