//FEED SORTING
let sortType = 'new';
let timeFilter = 'day';


// ELEMENTS
const input = document.getElementById('subreddit-input');
const searchBtn = document.getElementById('search-btn');
const feed = document.getElementById('feed');

// NEW: variables for infinite scroll
let after = null;             // Reddit's "next page" marker
let currentSubreddit = '';    // which subreddit are we viewing
let loading = false;          // stops double-loading



// WHEN CLICK SEARCH
searchBtn.addEventListener('click', async () => {
    const subreddit = input.value.trim();
    if (!subreddit) return;

    currentSubreddit = subreddit; // remember current subreddit
    after = null;                 // reset "next page" marker
    feed.innerHTML = '<p>Loading...</p>';

    //SUBREDDIT ICON
    const aboutRes = await fetch(`https://www.reddit.com/r/${subreddit}/about.json`);
    const aboutData = await aboutRes.json();
    const subIcon = aboutData.data.icon_img || aboutData.data.community_icon || '';

    feed.innerHTML = `
    <h2>
        ${subIcon ? `<img src="${subIcon}" class="sub-icon">` : ''}
        r/${subreddit}
    </h2>
    `;
    await loadPosts();            // fetch first posts
});

// SORT SELECT LISTENER
const sortSelect = document.getElementById('sort');
sortSelect.addEventListener('change', () => {
    sortType = sortSelect.value;;
    after = null;
    feed.innerHTML = '<p>Loading...</p>';
    loadPosts();
});

// SORT TIME LISTNER
const timeSelect = document.getElementById('time');
timeSelect.addEventListener('change', () => {
    timeFilter = timeSelect.value;
    if (sortType === 'top') {
        after = null;
        feed.innerHTML = '<p>Loading...</p>';
        loadPosts();
    }
});

// FUNCTION TO LOAD POSTS
async function loadPosts() {
    if (loading) return;   // if already loading, stop
    loading = true;

    try {
        // Reddit API URL
        let url = `https://www.reddit.com/r/${currentSubreddit}/${sortType}.json?limit=20`;

        if (sortType === 'top'){
            url += `&t=${timeFilter}`;
        }
        if (after) url += `&after=${after}`; // add "after" for next page

        const res = await fetch(url);
        const data = await res.json();
        after = data.data.after; // save the "next page" marker

        // If first time loading, add subreddit title
        if (!feed.querySelector('h2')) {
            feed.innerHTML = `<h2>r/${currentSubreddit}</h2>`;
        }

        // Loop through each post
        data.data.children.forEach(post => {
            const p = post.data;

            const div = document.createElement('div');
            div.classList.add('post');

            let content = `
                <h3><a href="https://reddit.com${p.permalink}" target="_blank">${p.title}</a></h3>
                <p>⬆️ ${p.ups}</p>
            `;

            // IMAGE
            if (p.post_hint === 'image' && p.url_overridden_by_dest) {
                content += `<img src="${p.url_overridden_by_dest}" alt="post image">`;
            }

            // VIDEO
            else if (p.is_video && p.media?.reddit_video?.fallback_url) {
                content += `
                    <video controls>
                        <source src="${p.media.reddit_video.fallback_url}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                `;
            }

            // GALLERY
          // GALLERY
            else if (p.is_gallery && p.gallery_data && p.media_metadata) {
                content += `<div class="gallery">`;
                p.gallery_data.items.forEach(item => {
                    const media = p.media_metadata[item.media_id];
                    let imgUrl = media?.s?.u; // full-size source
                    if (imgUrl) {
                        imgUrl = imgUrl.replaceAll('&amp;', '&');
                        content += `<img src="${imgUrl}" alt="gallery image">`;
                    }
                });
                content += '</div>';
            }

            div.innerHTML = content;
            feed.appendChild(div);
        });

    } catch (err) {
        feed.innerHTML = '<p>Error loading posts</p>';
        console.error(err);
    }

    loading = false; // done loading
}

// WHEN SCROLL NEAR BOTTOM
window.addEventListener('scroll', () => {
    // check if user scrolled near bottom (100px left)
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
        if (currentSubreddit && after && !loading) {
            loadPosts(); // fetch more posts
        }
    }
});



if("serviceWorker" in navigator){
    window.addEventListener('load', () =>{
        navigator.serviceWorker
        .register("./sw.js")
        .then(() => console.log("Service Worker registered"))
      .catch((err) => console.error("SW failed", err));

    })
}