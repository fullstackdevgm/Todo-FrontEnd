// The RxJS operators are not available in Angular's base
// Observable implementation. We have to extend Observable
// by importing them.
//
// We could extend Observable with just the operators we
// need here by including the pertinent import statements
// at the top of each file where it's needed (and many
// authorities say that is what you should do).
//
// For convenience, we can combine all of the RxJS
// Observable extensions that our entire app requires
// here in a single file.

// Observable class extensions
import 'rxjs/add/observable/of'
import 'rxjs/add/observable/throw'

// Observable operators
import 'rxjs/add/operator/catch'
import 'rxjs/add/operator/debounceTime'
import 'rxjs/add/operator/distinctUntilChanged'
import 'rxjs/add/operator/do'
import 'rxjs/add/operator/filter'
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/switchMap'