'use strict';

// Shortcuts to DOM Elements.
// var messageForm = document.getElementById('message-form');
// var messageInput = document.getElementById('new-post-message');
// var titleInput = document.getElementById('new-post-title');

var contactForm = document.getElementById('contact-form');
var nameInput = document.getElementById('new-contact-name');
var phoneInput = document.getElementById('new-contact-phone');
var emailInput = document.getElementById('new-contact-email');
var noteInput = document.getElementById('new-contact-note');
var dateInput = document.getElementById('new-contact-date');

var signInButton = document.getElementById('sign-in-button');
var signOutButton = document.getElementById('sign-out-button');
var splashPage = document.getElementById('page-splash');
var addContactSection = document.getElementById('add-contact-section');
var addButton = document.getElementById('add');
var recentPostsSection = document.getElementById('recent-posts-list');
var userPostsSection = document.getElementById('user-posts-list');
var topUserPostsSection = document.getElementById('top-user-posts-list');
var recentMenuButton = document.getElementById('menu-recent');
var myPostsMenuButton = document.getElementById('menu-my-posts');
var myTopPostsMenuButton = document.getElementById('menu-my-top-posts');
var listeningFirebaseRefs = [];

function writeContact(uid, contactID, name, phone, email, note, date) {
    var contactData = {
        name: name,
        phone: phone,
        email: email,
        note: note,
        date: date
    };
    var contactNameDate = {
        name: name,
        date: date
    };
    contactID = contactID || firebase.database().ref().child(uid + '/contacts').push().key;

    var updates = {};
    updates[uid + '/contacts/' + contactID] = contactData;
    updates[uid + '/names_dates/' + contactID] = contactNameDate;
    return firebase.database().ref().update(updates);
}

function toggleStar(postRef, uid) {
    postRef.transaction(function(post) {
        if (post) {
            if (post.stars && post.stars[uid]) {
                post.starCount--;
                post.stars[uid] = null;
            } else {
                post.starCount++;
                if (!post.stars) {
                    post.stars = {};
                }
                post.stars[uid] = true;
            }
        }
        return post;
    });
}

// function createContactElement(contactID, title, text, author, authorId,
// authorPic) {
function createContactElement(data) {
    var uid = firebase.auth().currentUser.uid;

    // contact card
    var html =
        '<div class="post post-' + data.key + ' mdl-cell mdl-cell--12-col ' +
        'mdl-cell--6-col-tablet mdl-cell--4-col-desktop mdl-grid mdl-grid--no-spacing">' +
        '<div class="mdl-card mdl-shadow--2dp">' +
        '<div class="mdl-card__title mdl-color--light-blue-600 mdl-color-text--white">' +
        '<div class="avatar"></div>' + '<h4 class="mdl-card__title-text"></h4>' +
        '</div>' +
        // phone row
        '<div class="mdl-card__actions">' +
        '<button class="mdl-button mdl-button--icon mdl-color-text--blue-grey-300">' +
        '<i class="material-icons">phone</i></button>' +
        '<div class="phone mdl-color-text--black"></div>' +
        '</div>' +
        // star...
        '<span class="star">' +

        '<div class="not-starred material-icons">star_border</div>' +
        '<div class="starred material-icons">star</div>' +
        '<div class="star-count">0</div>' +
        '<div class="pencil-button material-icons">edit_mode</div>' +
        '</span>' +
        // email row
        '<div class="mdl-card__actions">' +
        '<button class="mdl-button mdl-button--icon mdl-color-text--blue-grey-300">' +
        '<i class="material-icons">email</i></button>' +
        '<div class="email mdl-color-text--black"></div>' +
        '</div>' +
        // note row
        '<div class="mdl-card__actions">' +
        '<button class="mdl-button mdl-button--icon mdl-color-text--blue-grey-300">' +
        '<i class="material-icons">announcement</i></button>' +
        '<div class="note mdl-color-text--black"></div>' +
        '</div>' +
        // date row
        '<div class="mdl-card__actions">' +
        '<button class="mdl-button mdl-button--icon mdl-color-text--blue-grey-300">' +
        '<i class="material-icons">schedule</i></button>' +
        '<div class="date mdl-color-text--black"></div>' +
        '</div>' +
        '<div class="comments-container"></div>' +
        '<form class="add-comment" action="#">' +
        '<div class="mdl-textfield mdl-js-textfield">' +
        '<input class="mdl-textfield__input new-comment" type="text">' +
        '<label class="mdl-textfield__label">Comment...</label>' +
        '</div>' +
        '</form>' +
        '</div>' +
        '</div>';

    // Create the DOM element from the HTML.
    var div = document.createElement('div');
    div.innerHTML = html;
    var contactElement = div.firstChild;
    if (componentHandler) {
        componentHandler.upgradeElements(contactElement.getElementsByClassName('mdl-textfield')[0]);
    }

    var addCommentForm = contactElement.getElementsByClassName('add-comment')[0];
    var commentInput = contactElement.getElementsByClassName('new-comment')[0];
    var star = contactElement.getElementsByClassName('starred')[0];
    var unStar = contactElement.getElementsByClassName('not-starred')[0];
    var pencilButton = contactElement.getElementsByClassName('pencil-button')[0];

    // Set values.
//    data.key, data.val().name, data.val().phone, data.val().email, data.val().note, data.val().date
    contactElement.getElementsByClassName('mdl-card__title-text')[0].innerText = data.val().name;
    contactElement.getElementsByClassName('phone')[0].innerText = data.val().phone || '';
    contactElement.getElementsByClassName('email')[0].innerText = data.val().email || '';
    contactElement.getElementsByClassName('note')[0].innerText = data.val().note || '';
    var date = data.val().date;
    if (date > 0) {
        var expiredNote = '';
        if (Date.now() > date)
            expiredNote = ' *';
        contactElement.getElementsByClassName('date')[0].innerText = new Date(date).toDateString() + expiredNote;
    }

    contactElement.getElementsByClassName('avatar')[0].style.backgroundImage = 'url("./silhouette.jpg")';

    // Listen for comments.
    var contactRef = firebase.database().ref('post-comments/' + data.key);
    contactRef.on('child_added', function(data) {
        addCommentElement(contactElement, data.key, data.val().text, data.val().author);
    });

    contactRef.on('child_changed', function(data) {
        setCommentValues(contactElement, data.key, data.val().text, data.val().author);
    });

    contactRef.on('child_removed', function(data) {
        deleteComment(contactElement, data.key);
    });

    // Listen for likes counts.
    var starCountRef = firebase.database().ref('posts/' + data.key + '/starCount');
    starCountRef.on('value', function(snapshot) {
        updateStarCount(contactElement, snapshot.val());
    });

    // Listen for the starred status.
    var starredStatusRef = firebase.database().ref('posts/' + data.key + '/stars/' + uid)
    starredStatusRef.on('value', function(snapshot) {
        updateStarredByCurrentUser(contactElement, snapshot.val());
    });

    // Keep track of all Firebase reference on which we are listening.
    listeningFirebaseRefs.push(contactRef);
    listeningFirebaseRefs.push(starCountRef);
    listeningFirebaseRefs.push(starredStatusRef);

    // Create new comment.
    addCommentForm.onsubmit = function(e) {
        e.preventDefault();
        createNewComment(data.key, firebase.auth().currentUser.displayName, uid, commentInput.value);
        commentInput.value = '';
        commentInput.parentElement.MaterialTextfield.boundUpdateClassesHandler();
    };

    // Bind starring action.
    var onStarClicked = function() {
        var globalPostRef = firebase.database().ref('/posts/' + data.key);
        var userPostRef = firebase.database().ref('/user-posts/' + data.key );
        toggleStar(globalPostRef, uid);
        toggleStar(userPostRef, uid);
    };
    unStar.onclick = onStarClicked;
    star.onclick = onStarClicked;
    
    pencilButton.onclick = function() {
        showSection(addContactSection);
        document.getElementsByClassName('mdl-card__title-text')[0].innerText = 'Edit Contact';
        
        firebase.database().ref(uid + '/contacts/' + data.key).once('value').then(function(data) {
        	  // The Promise was "fulfilled" (it succeeded).
        	 nameInput.value = data.val().name;
             phoneInput.value = data.val().phone || '';
             emailInput.value = data.val().email || '';
             noteInput.value = data.val().note || '';
             var date = data.val().date;
             if (date > 0)
               dateInput.value = new Date(date).toDateInputValue();
        	}, function(error) {
        	  // The Promise was rejected.
        	  console.error(error);
        	});
        
       

        
        contactForm.onsubmit = function(e) {
            onSubmit(e, data.key);
            console.log('contactForm.onsubmit');
        };
      
    };
    
  

    return contactElement;
};
// end of function createContactElement

Date.prototype.toDateInputValue = (function() {
    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0,10);
});

function createNewComment(contactID, username, uid, text) {
    firebase.database().ref('post-comments/' + contactID).push({
        text: text,
        author: username,
        uid: uid
    });
}

/**
 * Updates the starred status of the post.
 */
function updateStarredByCurrentUser(contactElement, starred) {
    if (starred) {
        contactElement.getElementsByClassName('starred')[0].style.display = 'inline-block';
        contactElement.getElementsByClassName('not-starred')[0].style.display = 'none';
    } else {
        contactElement.getElementsByClassName('starred')[0].style.display = 'none';
        contactElement.getElementsByClassName('not-starred')[0].style.display = 'inline-block';
    }
}

/**
 * Updates the number of stars displayed for a post.
 */
function updateStarCount(contactElement, nbStart) {
    contactElement.getElementsByClassName('star-count')[0].innerText = nbStart;
}

/**
 * Creates a comment element and adds it to the given contactElement.
 */
function addCommentElement(contactElement, id, text, author) {
    var comment = document.createElement('div');
    comment.classList.add('comment-' + id);
    comment.innerHTML = '<span class="username"></span><span class="comment"></span>';
    comment.getElementsByClassName('comment')[0].innerText = text;
    comment.getElementsByClassName('username')[0].innerText = author || 'Anonymous';

    var commentsContainer = contactElement.getElementsByClassName('comments-container')[0];
    commentsContainer.appendChild(comment);
}

/**
 * Sets the comment's values in the given contactElement.
 */
function setCommentValues(contactElement, id, text, author) {
    var comment = contactElement.getElementsByClassName('comment-' + id)[0];
    comment.getElementsByClassName('comment')[0].innerText = text;
    comment.getElementsByClassName('fp-username')[0].innerText = author;
}

/**
 * Deletes the comment of the given ID in the given contactElement.
 */
function deleteComment(contactElement, id) {
    var comment = contactElement.getElementsByClassName('comment-' + id)[0];
    comment.parentElement.removeChild(comment);
}

function createAccount() {
    var email = document.getElementById('input-email-sign-in').value;
    var password = document.getElementById('input-password-sign-in').value;
    if (email.length < 4) {
        alert('Please enter an email address.');
        return;
    }
    if (password.length < 4) {
        alert('Please enter a password.');
        return;
    }
    firebase.auth().createUserWithEmailAndPassword(email, password).catch(function(error) {
        var errorCode = error.code;
        var errorMessage = error.message;
        if (errorCode == 'auth/weak-password') {
            alert('The password is too weak.');
        } else {
            alert(errorMessage);
        }
        console.log(error);
    });

}

/**
 * Starts listening for new posts and populates posts lists.
 */
function startDatabaseQueries() {
    // [START my_top_posts_query]
    var myUserId = firebase.auth().currentUser.uid;
    var topUserPostsRef = firebase.database().ref('user-posts/' + myUserId).orderByChild('starCount');
    // [END my_top_posts_query]
    // [START recent_posts_query]
    var recentPostsRef = firebase.database().ref('posts').limitToLast(100);
    // [END recent_posts_query]
    var userPostsRef = firebase.database().ref('user-posts/' + myUserId);
    var contactsRef = firebase.database().ref(myUserId + '/contacts');

    var fetchPosts = function(postsRef, sectionElement) {
        postsRef.on('child_added', function(data) {
            var author = data.val().author || 'Anonymous';
            var containerElement = sectionElement.getElementsByClassName('posts-container')[0];
            containerElement.insertBefore(
                createContactElement(data),
                containerElement.firstChild);
        });
        postsRef.on('child_changed', function(data) {
            var containerElement = sectionElement.getElementsByClassName('posts-container')[0];
            var contactElement = containerElement.getElementsByClassName('post-' + data.key)[0];
            contactElement.getElementsByClassName('mdl-card__title-text')[0].innerText = data.val().name;
            contactElement.getElementsByClassName('phone')[0].innerText = data.val().phone || '';
            contactElement.getElementsByClassName('email')[0].innerText = data.val().email || '';
            contactElement.getElementsByClassName('note')[0].innerText = data.val().note || '';
            var date = data.val().date;
            if (date > 0) {
                var expiredNote = '';
                if (Date.now() > date)
                    expiredNote = ' *';
                contactElement.getElementsByClassName('date')[0].innerText = new Date(date).toDateString() + expiredNote;
            }
            contactElement.getElementsByClassName('avatar')[0].style.backgroundImage = 'url("./silhouette.jpg")';

        });
        postsRef.on('child_removed', function(data) {
            var containerElement = sectionElement.getElementsByClassName('posts-container')[0];
            var post = containerElement.getElementsByClassName('post-' + data.key)[0];
            post.parentElement.removeChild(post);
        });
    };

    // Fetching and displaying all posts of each sections.
    // fetchPosts(topUserPostsRef, topUserPostsSection);
    // fetchPosts(recentPostsRef, recentPostsSection);
    // fetchPosts(userPostsRef, userPostsSection);
    fetchPosts(contactsRef, userPostsSection);

    // Keep track of all Firebase refs we are listening to.
    // listeningFirebaseRefs.push(topUserPostsRef);
    // listeningFirebaseRefs.push(recentPostsRef);
    // listeningFirebaseRefs.push(userPostsRef);
    listeningFirebaseRefs.push(contactsRef);
}

/**
 * Writes the user's data to the database.
 */
// function writeUserData(userId, name, email, imageUrl) {
function writeUserData(userId, email) {
    firebase.database().ref(userId + '/-user').set({
        email: email,
    });
}

/**
 * Cleanups the UI and removes all Firebase listeners.
 */
function cleanupUi() {
    // Remove all previously displayed posts.
    topUserPostsSection.getElementsByClassName('posts-container')[0].innerHTML = '';
    recentPostsSection.getElementsByClassName('posts-container')[0].innerHTML = '';
    userPostsSection.getElementsByClassName('posts-container')[0].innerHTML = '';

    // Stop all currently listening Firebase listeners.
    listeningFirebaseRefs.forEach(function(ref) {
        ref.off();
    });
    listeningFirebaseRefs = [];
}


function showSection(sectionElement, buttonElement) {
    recentPostsSection.style.display = 'none';
    userPostsSection.style.display = 'none';
    topUserPostsSection.style.display = 'none';
    addContactSection.style.display = 'none';
    recentMenuButton.classList.remove('is-active');
    myPostsMenuButton.classList.remove('is-active');
    myTopPostsMenuButton.classList.remove('is-active');

    if (sectionElement) {
        sectionElement.style.display = 'block';
    }
    if (buttonElement) {
        buttonElement.classList.add('is-active');
    }
}

function onSubmit(e, contactID) {
    e.preventDefault();
    var name = nameInput.value;
    if (!name) {
//        alert('Please enter a name');
        return;
    };
    var phone = phoneInput.value;
    var email = emailInput.value;
    var note = noteInput.value;
    var date = Date.parse(dateInput.value) || -1;
    writeContact(firebase.auth().currentUser.uid, contactID, name, phone, email, note, date).then(function() { 
    	myPostsMenuButton.click();
    });
    nameInput.value = '';
    phoneInput.value = '';
    emailInput.value = '';
    noteInput.value = '';
    dateInput.value = '';
};

// Bindings on load.
window.addEventListener('load', function() {
    // Bind Sign in button.
    signInButton.addEventListener('click', function() {
        // var provider = new firebase.auth.GoogleAuthProvider();
        // firebase.auth().signInWithPopup(provider);
        signIn();
    });

    // Bind Sign out button.
    signOutButton.addEventListener('click', function() {
        firebase.auth().signOut();
    });

    // Listen for auth state changes
    firebase.auth().onAuthStateChanged(onAuthStateChanged);

    // Saves message on form submit.
    // messageForm.onsubmit = function(e) {
    // e.preventDefault();
    // var text = messageInput.value;
    // var title = titleInput.value;
    // if (text && title) {
    // newPostForCurrentUser(title, text).then(function() {
    // myPostsMenuButton.click();
    // });
    // messageInput.value = '';
    // titleInput.value = '';
    // }
    // };



    // Bind menu buttons.
    recentMenuButton.onclick = function() {
        showSection(recentPostsSection, recentMenuButton);
    };
    myPostsMenuButton.onclick = function() {
        showSection(userPostsSection, myPostsMenuButton);
    };
    myTopPostsMenuButton.onclick = function() {
        showSection(topUserPostsSection, myTopPostsMenuButton);
    };
    addButton.onclick = function() {
        showSection(addContactSection);
        // messageInput.value = '';
        // titleInput.value = '';
        document.getElementsByClassName('mdl-card__title-text')[0].innerText = 'New Contact';
        nameInput.value = '';
        phoneInput.value = '';
        emailInput.value = '';
        noteInput.value = '';
        dateInput.value = '';
//        contactForm.onsubmit = function(e) {
//            onSubmit(e, null);
//        }
    };
    // recentMenuButton.onclick();
    myPostsMenuButton.onclick();
}, false);

function signIn() {
    var email = document.getElementById('input-email-sign-in').value;
    var password = document.getElementById('input-password-sign-in').value;
    if (email.length < 4) {
        alert('Please enter an email address.');
        return;
    }
    if (password.length < 4) {
        alert('Please enter a password.');
        return;
    }

    firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error) {
        var errorCode = error.code;
        var errorMessage = error.message;
        if (errorCode === 'auth/wrong-password') {
            alert('Wrong password.');
        } else {
            alert(errorMessage);
        }
        console.log(error);
    });
}

/**
 * The ID of the currently signed-in User. We keep track of this to detect Auth
 * state change events that are just programmatic token refresh but not a User
 * status change.
 */
var currentUID;
function onAuthStateChanged(user) {
    // We ignore token refresh events.
    if (user && currentUID === user.uid) {
        return;
    }

    cleanupUi();
    if (user) {
        currentUID = user.uid;
        splashPage.style.display = 'none';
        // writeUserData(user.uid, user.displayName, user.email, user.photoURL);
        writeUserData(user.uid, user.email);
        startDatabaseQueries();
        document.getElementById('account_status').innerText = user.email;
    } else {
        // Set currentUID to null.
        currentUID = null;
        // Display the splash page where you can sign-in.
        splashPage.style.display = '';
    }
}
