"use strict";

/* ELEMENTS */
const subredditElement = document.querySelector("#subreddit");
const fetcher = document.querySelector("#fetch");
const randfetcher = document.querySelector("#fetch-random");
const userfetcher = document.querySelector("#fetch-user");
const filtersInputElement = document.querySelector("#subredditFilter");
const containsFiltersInputElement = document.querySelector("#subredditContentFilter");
const nsfwCheckboxCheckbox = document.querySelector("#nsfw");
const nsfwCheckboxLabel = document.querySelector("#nsfw-label");
const savedElement = document.querySelector("#saved");
const detailsElement = document.querySelector(".object-and-details > details");
const autoscrollElement = document.querySelector("#autoscroll");
const similarSubredditsElement = document.querySelector("#similar-subreddits");

/* INPUT */
const fallbackSubreddit = "ProgrammerHumor"; // the subreddit to use if the subreddit input is empty
const nsfwToggleKey = "n";
const clearSavedKey = "x";
const rateLimitResponse = 429;
let scrollDistance = 5;
let scrollDelay = 10;
let subreddit;                               // the subreddit currently viewed
let subredditNameContainsFilters = [];       // filters subreddits whose name contains 
let subredditNameFilters = [];               // filters subreddits whose name is
let after = "";                              // the after parameter for the reddit api
let autoscroll = false;                      // whether or not the scroller is active
let searchUser = false;                      // whether or not the query is used for user or subreddit
let searched = false;                        // whether the query currently displayed was a manual search
let showingSavedPage = false;                // whether or not the saved page is showing

fetchRandomContent(nsfwCheckboxCheckbox.checked, subredditNameContainsFilters, subredditNameFilters);

fetcher.addEventListener("click", () => { fetcherClick(false); });
userfetcher.addEventListener("click", () => { fetcherClick(true); });
randfetcher.addEventListener("click", () => {
    searched = false;
    fetchRandomContent(nsfwCheckboxCheckbox.checked, subredditNameContainsFilters, subredditNameFilters);
});

setInterval(() => {
    if (autoscroll) pageScroll();
}, scrollDelay);

autoscrollElement.addEventListener("click", () => {
    autoscroll = !autoscroll;
});

/* FILTERS */
containsFiltersInputElement.addEventListener("input", () => {
    subredditNameContainsFilters = containsFiltersInputElement.value.split("\n")
});
filtersInputElement.addEventListener("input", () => {
    subredditNameFilters = filtersInputElement.value.split("\n");
});
// if nsfw is clicked, and showing saved, refresh saved
nsfwCheckboxCheckbox.addEventListener("click", () => {
    if (showingSavedPage) {
        savedElement.click();
    }
});
document.addEventListener("keydown", (e) => {
    // If the event target is the subredditElement, return early
    if (e.target === subredditElement) {
        return;
    }

    if (e.key == nsfwToggleKey) {
        let wasChecked = nsfwCheckboxCheckbox.checked;
        // hide the nsfw checkbox if it is not hidden, show it otherwise
        nsfwCheckboxCheckbox.hidden = !nsfwCheckboxCheckbox.hidden;
        nsfwCheckboxLabel.hidden = !nsfwCheckboxLabel.hidden;
        nsfwCheckboxCheckbox.checked = false;

        // if showing saved, reload saved
        if (showingSavedPage) {
            savedElement.click();
        } else if (wasChecked) { // otherwise fetch random
            fetchRandomContent(nsfwCheckboxCheckbox.checked, subredditNameContainsFilters, subredditNameFilters);
        }
    } else if (e.key == clearSavedKey) {
        // clear the cookies for the posts only
        localStorage.removeItem("posts");
    }
});

// if enter clicked while in the subreddit input, search for the subreddit
subredditElement.addEventListener("keyup", (e) => {
    if (e.key == "Enter") {
        fetcherClick(false);
    }
});

// when saved button is clicked, clear the posts and add the posts from the cookie
savedElement.addEventListener("click", () => {

    showingSavedPage = true;

    updateSavedButton();

    //remove all posts
    while (document.getElementById("content")) {
        document.getElementById("content").remove();
    }

    //get the posts from the cookie
    let posts = JSON.parse(localStorage.getItem("posts"));

    //if there are no posts, return early
    if (posts == null) {
        return;
    }

    showingSavedPage = true;

    // console.log("fetching saved...");

    while (document.getElementById("content")) {
        document.getElementById("content").remove();
    }

    //reverse the order of posts
    posts.reverse();

    //go through posts and remove nsfw posts if nsfw is hidden
    for (let i = 0; i < posts.length; i++) {
        if (posts[i].data.over_18 == true && nsfwCheckboxCheckbox.hidden == true) {
            posts.splice(i, 1);
            i--;
        }
    }

    getPosts(posts);

});

/* FUNCTIONS */

/**
 * Fetches random content from a random subreddit
 * @param {boolean} nsfw Whether or not to fetch nsfw content
 * @param {string[]} nameContainsFilters The filters to check if the subreddit contains
 * @param {string[]} nameFilters The filters to check if the subreddit is equal to
 * @returns {void}
 */
function fetchRandomContent(nsfw = false, nameContainsFilters, nameFilters) {
    //get a random line from "./subreddit parsed/parsedSubreddits.txt"
    fetch("./subreddit parsed/" + (nsfw ? "nsfw" : "") + "parsedSubreddits.txt")
        .then((response) => response.text()).then((body) => {
            let lines = body.split("\n");
            let randomLine = ""
            do {
                randomLine = lines[Math.floor(Math.random() * lines.length)];
                // console.log("invalid sub: " + randomLine)
            } while (!checkSub(randomLine, nameContainsFilters, nameFilters));
            subreddit = randomLine;
            subredditElement.value = randomLine;
            searchUser = false;
            after = "";
            searchInput(subreddit, nsfwCheckboxCheckbox.checked);
            fetchContent();
        });
}

/**
 * Sets the subreddit to view and initializes everything.
 * @param {boolean} queryUser Whether or not the query is for a user
 * @returns {void}
 */
function fetcherClick(queryUser) {
    searchUser = queryUser;
    if (subredditElement.value == "") {
        subreddit = fallbackSubreddit;
        subredditElement.value = subreddit;
        searchInput(subreddit, nsfwCheckboxCheckbox.checked);
    } else if (subreddit != subredditElement.value) {
        subreddit = subredditElement.value;
        after = "";
    }

    searched = true;
    fetchContent();
}

/**
 * Checks if a subreddit is valid based on the filters provided.
 * The subreddit should not include the r/ or u/ part in it.
 * @param {string} sub The subreddit to check
 * @param {string[]} nameContainsFilters The filters to check if the subreddit contains
 * @param {string[]} nameFilters The filters to check if the subreddit is equal to
 * @returns {boolean} Whether or not the subreddit is valid
 */
function checkSub(sub, nameContainsFilters, nameFilters) {
    for (let filter of nameContainsFilters) {
        if (sub.includes(filter)) {
            // console.log("Blocked by inclusion: sub has '" + filter + "' in the name")
            return false;
        }
    }
    for (let filter of nameFilters) {
        if (sub === filter) {
            // console.log("Blocked by manual exclusion");
            return false;
        }
    };

    return true;
}

/**
 * Fetches and displays content.
 * @returns {void}
 */
function fetchContent() {

    showingSavedPage = false;
    updateSavedButton();

    // console.log("fetching content...");

    // ublock fix
    while (document.getElementById("content")) {
        document.getElementById("content").remove();
    }

    let isUser = searchUser ? "user" : "r";

    if (isUser == "user") {
        searchInput("", nsfwCheckboxCheckbox.checked);
    }

    let parentDiv = document.createElement("div");
    parentDiv.id = "content";

    // console.log(`fetching from https://www.reddit.com/${isUser}/${subreddit}/.json?after=${after}&limit=50`);
    //if this has a 429 error get the reply header and print the time
    fetch(`https://www.reddit.com/${isUser}/${subreddit}/.json?after=${after}&limit=50`).then(response => {
        if (response.status == rateLimitResponse) {
            // console.log(response.headers.get("x-ratelimit-reset"));
        }
        return response;
    }).then(response => response.json()).then(body => {

        // console.log(body);

        if (body.message == "Forbidden")
            fetchRandomContent(nsfwCheckboxCheckbox.checked, subredditNameContainsFilters, subredditNameFilters);
        after = body.data.after;

        let posts = body.data.children;
        getPosts(posts);

        if (parentDiv.children.length == 1) {
            fetchRandomContent(nsfwCheckboxCheckbox.checked, subredditNameContainsFilters, subredditNameFilters);
        }

        //infinite scroll stuff
        document.getElementById("content").addEventListener('scroll', event => {
            const { scrollHeight, scrollTop, clientHeight } = event.target;

            // console.log(Math.abs(scrollHeight - clientHeight - scrollTop));
            if (Math.abs(scrollHeight - clientHeight - scrollTop) <= 1) {
                // console.log("bottom reached");
                if (searched || isUser == "user") {
                    fetchContent();
                } else {
                    fetchRandomContent(nsfwCheckboxCheckbox.checked, subredditNameContainsFilters, subredditNameFilters);
                }
            }
        });
        // console.log("test");
        // more ublock tomfoolery
        let ublockDetectionElement = document.querySelector("#pt-ext-root");

        if (ublockDetectionElement) {
            // console.log("REMOVED")
            ublockDetectionElement.remove();
        }
    });
}

/**
 * Start the automating scrolling, if autoscroll enabled.
 * @returns {void}
 */
function pageScroll() {
    // if still scrolling
    if (document.getElementById("content") && autoscroll)
        document.getElementById("content").scrollBy(0, scrollDistance);
}

/**
 * Returns a normalized value representing the similarity between two strings.
 * Used for searching and finding results for subreddit queries against the list.
 * @param {string} s1 The first string
 * @param {string} s2 The second string
 * @returns {number} The similarity, between 0.0 and 1.0
 */
function similarity(s1, s2) {
    //if one contains the other, return 1
    if (s1.includes(s2) || s2.includes(s1)) {
        return 1.0;
    }

    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (
        (longerLength - editDistance(longer, shorter)) /
        parseFloat(longerLength)
    );
}

/**
 * Levenshtein distance between two strings. Helper function for `similarity(s1:string, s2:string)`.
 * @param {string} s1 The first string
 * @param {string} s2 The second string
 * @returns {number} The amount of edits between two strings. A non-negative integer.
 */
function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
            if (i == 0) costs[j] = j;
            else
                if (j > 0) {
                    var newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }

        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

/**
 * Searches for subreddits similar to the input in the subreddit input and displays them
 * @param {string} query The username/subreddit to search for
 * @param {boolean} queryNSFW Whether or not to search for nsfw subs
 * @returns {void}
 */
function searchInput(query, queryNSFW) {
    // console.log("searching");
    let similar_subreddits = [];
    let textBox = similarSubredditsElement;

    // if the queries are null, read the text of the subreddit id text input
    if (query == null) {
        query = subredditElement.value;
    }
    if (query == "") {
        textBox.innerHTML = "";
        return;
    }
    

    // reads the parsedSubreddits.txt file and finds the 5 most similar subreddits to display
    fetch("./subreddit parsed/" + (queryNSFW ? "nsfw" : "") + "parsedSubreddits.txt")
        .then((response) => response.text())
        .then((body) => {

            // find 5 similar subreddits, sorted by similarity
            let lines = body.split("\n");
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i];
                let similarityScore = similarity(query, line);
                similar_subreddits.push({ name: line, score: similarityScore });
            }

            // prepare the list
            similar_subreddits.sort((a, b) => (a.score > b.score ? -1 : 1));
            similar_subreddits = similar_subreddits.slice(0, 10);

            // reset the similarsubs area and rebuild it
            textBox.innerHTML = "";
            for (let i = 0; i < similar_subreddits.length; i++) {
                let a = document.createElement("a");
                a.classList.add(["similarsub"])
                a.href = `javascript:
                        subreddit="${similar_subreddits[i].name}";
                        subredditElement.value = subreddit;
                        after="";
                        fetchContent();`;
                let h = document.createElement("h4");
                h.textContent = similar_subreddits[i].name;
                a.appendChild(h);
                textBox.appendChild(a);
            }

        });
}

/**
 * Updates the content of the saved button based on whether or not the saved page is showing
 * @returns {void}
 */
function updateSavedButton() {

    if (showingSavedPage) {
        // document.getElementById("saved").textContent = "Refresh Saved";
        savedElement.innerHTML = "Refresh Saved <i class='searchButtonIcon fa-solid fa-sync'></i>";
    } else {
        // set the content to "Open Saved <i class="searchButtonIcon fa-solid fa-bookmark"></i>"
        // document.getElementById("saved").textContent = "Open Saved";
        savedElement.innerHTML = "Open Saved <i class='searchButtonIcon fa-solid fa-bookmark'></i>";
    }

}

/**
 * Dynamically creates the posts from the posts array and appends them to the body of the document
 * @param {Array} posts The array of posts to create
 * @property {boolean} posts[].data.is_gallery Whether or not the post is a gallery
 * @property {string} posts[].data.url_overridden_by_dest The url of the post
 * @property {string} posts[].data.thumbnail The thumbnail of the post
 * @property {string} posts[].data.media.reddit_video.fallback_url The fallback url of the video
 * @property {string} posts[].data.preview.reddit_video_preview.fallback_url The fallback url of the video
 * @property {boolean} posts[].data.over_18 Whether or not the post is nsfw
 * @property {string} posts[].data.post_hint The type of post
 * @property {string} posts[].data.author The author of the post
 * @property {string} posts[].data.subreddit The subreddit of the post
 * @property {string} posts[].data.title The title of the post
 * @returns {void}
 */
function getPosts(posts) {

    let isUser = searchUser ? "user" : "r";
    let parentDiv = document.createElement("div");
    parentDiv.id = "content";

    for (let i = 0; i < posts.length; i++) {

        // console.log("type: " + (posts[i].data.post_hint));
        // console.log(posts[i].data);

        // if (posts[i].data.post_hint == "image") {
        //if it s a gallery or not a picture, skip it
        if (posts[i].data.is_gallery == true || posts[i].data.url_overridden_by_dest == undefined)
            continue;
        // if (posts[i].data.post_hint == "rich:video" || posts[i].data.is_video == true)
        //     continue;

        let div = document.createElement("div");
        div.classList.add(["post"])

        let title = document.createElement("h4");
        let imageSrc = posts[i].data.url_overridden_by_dest;
        let thumbnailImageSrc = posts[i].data.thumbnail;
        let pictureDiv = document.createElement("div");
        let img;
        let objectAndDetails;

        //if it is a video, add a video element
        if (posts[i].data.post_hint == "rich:video" || posts[i].data.is_video == true) {
            let video = document.createElement("video");
            video.controls = true;
            video.autoplay = false;
            video.loop = true;
            // video.muted = true;

            try {
                video.src = posts[i].data.media.reddit_video.fallback_url;
            } catch (error) {
                try {
                    video.src = posts[i].data.preview.reddit_video_preview.fallback_url;
                } catch (error) {
                    // console.log("error getting video src");
                    // console.log(error);
                    video.src = "";
                }
            }

            // console.log("video.src")
            // console.log(video.src)

            video.onerror = function () {
                this.parentElement.remove();
                if (parentDiv.children.length == 1) {
                    fetchRandomContent(nsfwCheckboxCheckbox.checked, subredditNameContainsFilters, subredditNameFilters);
                }
            };

            if (posts[i].data.over_18 == true && nsfwCheckboxCheckbox.checked == false) {
                // add an element with a backdrop filter blur to blur the video
                let blur = document.createElement("div");
                blur.classList.add("blur");
                blur.appendChild(video);
                pictureDiv.appendChild(blur);
                video.controls = false;
            } else {
                pictureDiv.appendChild(video);
            }

            // add styling to the video to make it fit
            video.classList.add("video");

        } else if (imageSrc.endsWith(".gif")) {

            objectAndDetails = document.createElement("div");
            objectAndDetails.classList.add("object-and-details");

            let staticImage = document.createElement("img");
            staticImage.src = thumbnailImageSrc;
            staticImage.alt = "static image";
            staticImage.loading = "lazy";
            objectAndDetails.appendChild(staticImage);

            let details = document.createElement("details");

            let summary = document.createElement("summary");
            summary.setAttribute("role", "button");
            summary.setAttribute("aria-label", "static image");
            details.appendChild(summary);

            let objectAndDetails1 = document.createElement("div");
            objectAndDetails1.classList.add("object-and-details1");

            let animatedImage = document.createElement("img");
            animatedImage.src = imageSrc;
            animatedImage.alt = "animated image";
            animatedImage.loading = "lazy";
            objectAndDetails1.appendChild(animatedImage);

            details.appendChild(objectAndDetails1);

            objectAndDetails.appendChild(details);

            if (posts[i].data.over_18 == true && nsfwCheckboxCheckbox.checked == false) {
                staticImage.classList.add("nsfw");
                animatedImage.classList.add("nsfw");
            }

            //add a function that fullscreens the image on click and then removes it on click again
            objectAndDetails.addEventListener("click", () => {
                if (objectAndDetails.classList.contains("fullscreen-gif")) {
                    objectAndDetails.classList.remove("fullscreen-gif");
                    details.removeAttribute("open");
                } else {
                    objectAndDetails.classList.add("fullscreen-gif");
                }
            });

            pictureDiv.appendChild(objectAndDetails);

        } else {

            //just have the image added no need for gif shenanigans
            img = document.createElement("img");
            pictureDiv.appendChild(img);
            img.src = imageSrc;

            if (posts[i].data.over_18 == true && nsfwCheckboxCheckbox.checked == false) {
                img.classList.add("nsfw");
            }

            //add a function that fullscreens the image on click and then removes it on click again
            img.addEventListener("click", () => {
                if (img.classList.contains("fullscreen-image")) {
                    img.classList.remove("fullscreen-image");
                } else {
                    img.classList.add("fullscreen-image");
                }
            });

        }

        // console.log(posts[i].data.url_overridden_by_dest);
        title.textContent = posts[i].data.title;

        div.appendChild(title);

        //if in saved, add a subreddit link
        if (showingSavedPage) {
            let aSub = document.createElement("a");
            aSub.href = `javascript:
                    subreddit="${posts[i].data.subreddit}"; 
                    subredditElement.value = subreddit;
                    after="";
                    fetchContent();`;
            let sub = document.createElement("h5");
            sub.textContent = "r/" + posts[i].data.subreddit;
            aSub.appendChild(sub);
            div.appendChild(aSub);
        }


        if (isUser == "user") {
            let aSub = document.createElement("a");
            aSub.href = `javascript:
                    subreddit="${posts[i].data.subreddit}";
                    subredditElement.value = subreddit; 
                    after="";
                    fetchContent();`;
            let sub = document.createElement("h5");
            sub.textContent = "r/" + posts[i].data.subreddit;
            aSub.appendChild(sub);
            div.appendChild(aSub);
        } else {
            let aUser = document.createElement("a");
            aUser.href = `javascript:
                    subreddit="${posts[i].data.author}";
                    subredditElement.value = subreddit;
                    after="";
                    fetcherClick(true);`;
            let user = document.createElement("h5");
            user.textContent = "u/" + posts[i].data.author;
            aUser.appendChild(user);
            div.appendChild(aUser);


            // div.appendChild(parentDiv);
            // parentDiv.appendChild(div);
        }


        // if (objectAndDetails) {
        //     div.appendChild(objectAndDetails);
        // }

        if (img != null) {
            img.onerror = function () {
                this.parentElement.remove();
                if (parentDiv.children.length == 1) {
                    fetchRandomContent(nsfwCheckboxCheckbox.checked, subredditNameContainsFilters, subredditNameFilters);
                }
            };
        }

        //append to parentdiv a button to save a post by getting the url of the post and saving it to a cookie
        let saveButton = document.createElement("input");
        saveButton.type = "checkbox";
        saveButton.classList.add("save-input");
        saveButton.checked = false;
        saveButton.textContent = "+";

        //if the post is already saved, check the button
        if (localStorage.getItem("posts") != null) {
            let cookiePosts = JSON.parse(localStorage.getItem("posts"));
            for (let post of cookiePosts) {
                if (dataEqualsData(post.data, posts[i].data)) {
                    saveButton.checked = true;
                    saveButton.textContent = "-";
                }
            }
        }

        saveButton.addEventListener("click", () => {

            if (saveButton.checked) {

                //save the post
                let data = posts[i].data;
                let post = { data: data };
                let cookiePosts = [];
                if (localStorage.getItem("posts") != null) {
                    cookiePosts = JSON.parse(localStorage.getItem("posts"));
                }
                cookiePosts.push(post);
                localStorage.setItem("posts", JSON.stringify(cookiePosts));

                //print all saved posts
                // console.log(JSON.parse(localStorage.getItem("posts")));
            } else {

                //unsave the post
                let cookiePosts = JSON.parse(localStorage.getItem("posts"));
                for (let j = 0; j < cookiePosts.length; j++) {
                    if (dataEqualsData(cookiePosts[j].data, posts[i].data)) {
                        cookiePosts.splice(j, 1);
                    }
                }
                localStorage.setItem("posts", JSON.stringify(cookiePosts));

                //print all saved posts
                // console.log(JSON.parse(localStorage.getItem("posts")));
            }

        });

        div.appendChild(saveButton);
        div.appendChild(pictureDiv);
        parentDiv.appendChild(div);

    }
    // console.log("length: " + parentDiv.children.length);

    //add a div to the bottom of parent div to make sure the scroll event is triggered
    let div = document.createElement("div");
    div.style.height = window.innerHeight + "px";
    div.style.width = "100%";

    parentDiv.appendChild(div);


    document.body.appendChild(parentDiv);


}

/**
 * Returns whether or not the data of two posts is equal
 * The data represents the data property of a post object
 * @param {*} data1 The data of the first post
 * @param {*} data2 The data of the second post
 * @returns {boolean} Whether or not the data of the two posts is equal
 */
function dataEqualsData(data1, data2) {


    //check urls based on if theyre gifs / videos or not
    if (data1.url_overridden_by_dest == undefined && data2.url_overridden_by_dest == undefined) {
        //if both are videos, check the fallback url
        if ((data1.post_hint == "rich:video" || data1.is_video == true) && (data2.post_hint == "rich:video" || data2.is_video == true)) {

            try {
                if (data1.media.reddit_video.fallback_url == data2.media.reddit_video.fallback_url) {
                    return true;
                }
            } catch (error) {
                try {
                    if (data1.preview.reddit_video_preview.fallback_url == data2.preview.reddit_video_preview.fallback_url) {
                        return true;
                    }
                } catch (error) {
                    return false;
                }
            }

        }
    } else {

        //gif/image
        try {
            if (data1.url_overridden_by_dest != data2.url_overridden_by_dest) {
                return false;
            }
            else {
                return true;
            }
        } catch (feature) {
            return false;
        }

    }


}

// TODO: make cookies more storage efficient
// TODO: only store whatever is used in dataEqualsData ig?
