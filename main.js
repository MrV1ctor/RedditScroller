let autoscroll = false;
let after = "";
let searched = false;

/* ELEMENTS */
let subredditElement = document.querySelector("#subreddit");
let fetcher = document.querySelector("#fetch")
let randfetcher = document.querySelector("#fetch-random")
let userfetcher = document.querySelector("#fetch-user")

let searchUser = false;
let subredditNameFiltersInput = document.querySelector("#subredditFilter")
let subredditNameContainsFiltersInput = document.querySelector("#subredditContentFilter")

/* INPUT */
let subreddit;

function fetcherClick() {
    if (subredditElement.value == "") {
        subreddit = "ProgrammerHumor";
        subredditElement.value = subreddit;
        searchInput();
    } else if (subreddit != subredditElement.value) {
        subreddit = subredditElement.value;
        after = "";
    }

    searched = true;

    fetchContent();
}
fetcher.addEventListener("click", () => {
    searchUser = false
    fetcherClick();
});

userfetcher.addEventListener("click", () => {
    searchUser = true;
    fetcherClick();
})

randfetcher.addEventListener("click", () => {
    searched = false;
    fetchRandomContent();
});

// document.getElementById("nsfw").addEventListener("click", () => {
//     fetchRandomContent();
// })

document.getElementById("autoscroll").addEventListener("click", () => {
    pageScroll();
    autoscroll = !autoscroll;
});

fetchRandomContent();

//fetch stuff
function fetchRandomContent() {
    //get a random line from "./subreddit parsed/parsedSubreddits.txt"
    let nsfw = document.getElementById("nsfw").checked;
    fetch("./subreddit parsed/" + (nsfw ? "nsfw" : "") + "parsedSubreddits.txt")
        .then((response) => response.text()).then((body) => {
            let lines = body.split("\n");
            let randomLine = ""
            do {
                randomLine = lines[Math.floor(Math.random() * lines.length)];
                console.log("invalid sub: " + randomLine)
            } while (!checkSub(randomLine));
            subreddit = randomLine;
            subredditElement.value = randomLine;
            searchUser = false;
            after = "";
            searchInput();
            fetchContent();
        });
}

/* FILTERS */

let subredditNameContainsFilters = [];
let subredditNameFilters = [];

subredditNameContainsFiltersInput.addEventListener("input", () => {
    subredditNameContainsFilters = subredditNameContainsFiltersInput.value.split("\n")
})

subredditNameFiltersInput.addEventListener("input", () => {
    subredditNameFilters = subredditNameFiltersInput.value.split("\n");
});

function checkSub(sub) {
    for (let filter of subredditNameContainsFilters) {
        if (sub.includes(filter)) {
            console.log("Blocked by inclusion: sub has '" + filter + "' in the name")
            return false;
        }
    }
    for (let filter of subredditNameFilters) {
        if (sub === filter) {
            console.log("Blocked by manual exclusion");
            return false;
        }
    };

    return true;
}

function fetchContent() {
    console.log("fetching content...");

    while (document.getElementById("content")) {
        document.getElementById("content").remove();
    }

    let isUser = searchUser ? "user" : "r";

    let parentDiv = document.createElement("div");
    parentDiv.id = "content";
    console.log("FETCHING FROM:")
    console.log(`https://www.reddit.com/${isUser}/${subreddit}/.json?after=${after}&limit=50`);
    //if this has a 429 error get the reply header and print the time
    fetch(`https://www.reddit.com/${isUser}/${subreddit}/.json?after=${after}&limit=50`).then(response => {
        if (response.status == 429) {
            console.log(response.headers.get("x-ratelimit-reset"));
        }
        return response;
    })
        .then(response => response.json())

        .then(body => {

            console.log(body);

            if (body.message == "Forbidden")
                fetchRandomContent();
            after = body.data.after;
            for (let i = 0; i < body.data.children.length; i++) {
                // if (body.data.children[i].data.post_hint == "image") {
                //if it s a gallery or not a picture, skip it
                if (body.data.children[i].data.is_gallery == true)
                    continue;
                if (body.data.children[i].data.url_overridden_by_dest == undefined)
                    continue;
                if (body.data.children[i].data.post_hint == "rich:video" || body.data.children[i].data.is_video == true)
                    continue;

                let div = document.createElement("div");
                div.classList.add(["post"])

                let title = document.createElement("h4");

                let imageSrc = body.data.children[i].data.url_overridden_by_dest;
                let thumbnailImageSrc = body.data.children[i].data.thumbnail;

                let pictureDiv = document.createElement("div");

                let img;
                
                if (imageSrc.endsWith(".gif")) {
                    //add the following structure
                    /**
                        this structure: https://css-tricks.com/pause-gif-details-summary/
                     */

                    let objectAndDetails = document.createElement("div");
                    objectAndDetails.classList.add("object-and-details");

                    let staticImage = document.createElement("img");
                    staticImage.src = thumbnailImageSrc;
                    staticImage.alt = "static image";
                    staticImage.loading = "lazy";
                    objectAndDetails.appendChild(staticImage);

                    let details = document.createElement("details");
                    // details.open = true;//uncomment to autoplay gifs

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

                    div.appendChild(objectAndDetails);

                    if (body.data.children[i].data.over_18 == true && document.getElementById("nsfw").checked == false) {
                        staticImage.classList.add("nsfw");
                        animatedImage.classList.add("nsfw");
                    }

                } else {

                    //just have the image added no need for gif shenanigans


                    img = document.createElement("img");

                    pictureDiv.appendChild(img);

                    img.src = imageSrc;

                    if (body.data.children[i].data.over_18 == true && document.getElementById("nsfw").checked == false) {
                        img.classList.add("nsfw");
                    }
                }
                
                
                //


                // console.log(body.data.children[i].data.url_overridden_by_dest);
                title.textContent = body.data.children[i].data.title;

                div.appendChild(title);
                

                if (isUser == "user") {
                    let aSub = document.createElement("a");
                    aSub.href = `javascript:
                            subreddit="${body.data.children[i].data.subreddit}";
                            subredditElement.value = subreddit; 
                            searchUser=false;
                            after="";
                            fetchContent();`;
                    let sub = document.createElement("h5");
                    sub.textContent = "r/" + body.data.children[i].data.subreddit;
                    aSub.appendChild(sub);
                    div.appendChild(aSub);
                } else {
                    let aUser = document.createElement("a");
                    aUser.href = `javascript:
                            subreddit="${body.data.children[i].data.author}";
                            subredditElement.value = subreddit;
                            searchUser=true;
                            after="";
                            fetcherClick();`;
                    let user = document.createElement("h5");
                    user.textContent = "u/" + body.data.children[i].data.author;
                    aUser.appendChild(user);
                    div.appendChild(aUser);


                    // div.appendChild(parentDiv);
                    // parentDiv.appendChild(div);
                }

                if (img != null) {
                    img.onerror = function () {
                        this.parentElement.remove();
                        if (parentDiv.children.length == 1) {
                            fetchRandomContent();
                        }
                    };
                }

                div.appendChild(pictureDiv);
                parentDiv.appendChild(div);


                // }
                // else
                // {
                //     console.log("type: "+(body.data.children[i].data.post_hint));
                // }


            }
            console.log("length: " + parentDiv.children.length);

            //add a div to the bottom of parent div to make sure the scroll event is triggered
            let div = document.createElement("div");
            div.style.height = window.innerHeight + "px";
            div.style.width = "100%";
            parentDiv.appendChild(div);


            document.body.appendChild(parentDiv);

            if (parentDiv.children.length == 1) {
                fetchRandomContent();
            }


            //infinite scroll stuff
            document.getElementById('content').addEventListener('scroll', event => {
                const { scrollHeight, scrollTop, clientHeight } = event.target;

                // console.log(Math.abs(scrollHeight - clientHeight - scrollTop));
                if (Math.abs(scrollHeight - clientHeight - scrollTop) <= 1) {
                    // console.log("bottom reached");
                    if (searched || isUser == "user") {
                        fetchContent();
                    }
                    else {
                        fetchRandomContent();
                    }
                }
            });

            //remove page blocker
            if (document.getElementById("pt-ext-root")) {
                document.getElementById("pt-ext-root").remove();
            }
        });

}

function pageScroll() {
    // console.log("scrolling");
    if (document.getElementById("content") && autoscroll)
        document.getElementById("content").scrollBy(0, 1);
    scrolldelay = setTimeout(pageScroll, 10);
}

//string similarity stuff
function similarity(s1, s2) {
    //if one contains the other, return 1
    if (s1.includes(s2) || s2.includes(s1)) {
        return 1;
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

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
            if (i == 0) costs[j] = j;
            else {
                if (j > 0) {
                    var newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue =
                            Math.min(Math.min(newValue, lastValue), costs[j]) +
                            1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

function searchInput() {
    console.log("searching");
    let input = subredditElement.value;
    let isUser = searchUser ? "user" : "r";
    let nsfw = document.getElementById("nsfw").checked;
    let similar_subreddits = [];
    let textBox = document.getElementById("similar-subreddits");

    fetch("./subreddit parsed/" + (nsfw ? "nsfw" : "") + "parsedSubreddits.txt")
        .then((response) => response.text())
        .then((body) => {
            //find 5 similar subreddits, sorted by similarity
            let lines = body.split("\n");
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i];
                let similarityScore = similarity(input, line);
                similar_subreddits.push({ name: line, score: similarityScore });
            }

            similar_subreddits.sort((a, b) => (a.score > b.score ? -1 : 1));
            similar_subreddits = similar_subreddits.slice(0, 10);

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
//   testing codespace branching whatever

/*
  notes

  theres is a property is_gallery which is eitehr true or false

*/


//if n key pressed either add or remove the nsfw toggle toggle it off and switch to a non-nsfw subreddit if current one is nsfw.
document.addEventListener("keydown", (e) => {
    if (e.key == "n") {
        let wasChecked = document.getElementById("nsfw").checked;
        //hide the nsfw checkbox if it is not hidden, show it otherwise
        document.getElementById("nsfw").hidden = !document.getElementById("nsfw").hidden;
        //also remove the label
        document.getElementById("nsfw-label").hidden = !document.getElementById("nsfw-label").hidden;

        document.getElementById("nsfw").checked = false;
        
        if (wasChecked) {
            fetchRandomContent();
        }
    }
})

const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce))");
const details = document.querySelector(".object-and-details > details");

if (mediaQuery.matches) {
  details.removeAttribute("open");
}