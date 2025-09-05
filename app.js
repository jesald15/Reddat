// FEED SORTING
let sortType = 'new';
let timeFilter = 'day';

// ELEMENTS
const input = document.getElementById('subreddit-input');
const searchBtn = document.getElementById('search-btn');
const feed = document.getElementById('feed');

// NEW: variables for infinite scroll
let after = null;             // Reddit's "next page" marker
let currentSubreddit = '';    // which subreddit are we viewing
let currentUser = '';
let loading = false;          // stops double-loading

// WHEN CLICK SEARCH

searchBtn.addEventListener('click', async () => {
    const query = input.value.trim();
    if (!query) return;

    const searchType = document.getElementById('searchType').value;

    if (searchType === "subreddit") {
        // ===== SUBREDDIT SEARCH =====
        currentSubreddit = query; // remember current subreddit
        currentUser = '';
        after = null;             // reset "next page" marker

        try {
            // fetch subreddit info
            const aboutRes = await fetch(`https://www.reddit.com/r/${currentSubreddit}/about.json`);
            const aboutData = await aboutRes.json();
            const subIcon = aboutData.data.icon_img || aboutData.data.community_icon || '';

            feed.innerHTML = `
              <h2>
                ${subIcon ? `<img src="${subIcon}" class="sub-icon">` : ''}
                r/${currentSubreddit}
              </h2>
            `;

            await loadPosts(); // fetch posts
        } catch (err) {
            feed.innerHTML = '<p>Subreddit not found.</p>';
            console.error(err);
        }

    } else if (searchType === "user") {
        // ===== USER SEARCH =====

        currentUser =  query;
        currentSubreddit = '';
        after = null;

        try {
            const userRes = await fetch(`https://www.reddit.com/user/${query}/about.json`);
            const userData = await userRes.json();

            if (!userData.data) {
                feed.innerHTML = '<p>User not found.</p>';
                return;
            }
            const name = userData.data.name;
            const karma = userData.data.total_karma;
            const created = new Date(userData.data.created_utc * 1000);

            feed.innerHTML = `
              <h2>
    
                u/${name}
              </h2>
              <p>Karma: ${karma}</p>
              <p>Created: ${created.toDateString()}</p>
            `;

            await loadUserPosts();
        } catch (err) {
            feed.innerHTML = '<p>Error loading user.</p>';
            console.error(err);
        }
    }
});

// SORT SELECT LISTENER
const sortSelect = document.getElementById('sort');
sortSelect.addEventListener('change', () => {
    sortType = sortSelect.value;
    after = null;
    if (currentSubreddit) {
        feed.innerHTML = '<p>Loading...</p>';
        loadPosts();
    }
});

// SORT TIME LISTENER
const timeSelect = document.getElementById('time');
timeSelect.addEventListener('change', () => {
    timeFilter = timeSelect.value;
    if (sortType === 'top' && currentSubreddit) {
        after = null;
        feed.innerHTML = '<p>Loading...</p>';
        loadPosts();
    }
});

// FUNCTION TO LOAD SUBREDDIT POSTS
async function loadPosts() {
    if (loading) return;
    loading = true;

    try {
        let url = `https://www.reddit.com/r/${currentSubreddit}/${sortType}.json?limit=20`;
        if (sortType === 'top') {
            url += `&t=${timeFilter}`;
        }
        if (after) url += `&after=${after}`;

        const res = await fetch(url);
        const data = await res.json();
        after = data.data.after;

        if (!feed.querySelector('h2')) {
            feed.innerHTML = `<h2>r/${currentSubreddit}</h2>`;
        }

        renderPosts(data.data.children);

    } catch (err) {
        feed.innerHTML = '<p>Error loading posts</p>';
        console.error(err);
    }

    loading = false;
}

// FUNCTION TO LOAD USER POSTS
async function loadUserPosts() {
    if (loading) return;
    loading = true;

    try {
        let url = `https://www.reddit.com/user/${currentUser}/submitted.json?limit=20`;
        if (after) url += `&after=${after}`;

        const res = await fetch(url);
        const data = await res.json();
        after = data.data.after;

        renderPosts(data.data.children);

    } catch (err) {
        feed.innerHTML += '<p>Error loading user posts</p>';
        console.error(err);
    }

    loading = false;
}

// FUNCTION TO RENDER POSTS (used by both sub + user)
function renderPosts(posts) {
    posts.forEach(post => {
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

            // REDGIFS (external link only, since API doesn't give video)
            else if (p.domain === "redgifs.com" && p.url_overridden_by_dest) {
                content += `
                    <p><a href="${p.url_overridden_by_dest}" target="_blank">
                        🔗 Watch on Redgifs
                    </a></p>
                `;
            }


            // GALLERY
            else if (p.is_gallery && p.gallery_data && p.media_metadata) {
                content += `<div class="gallery">`;
                p.gallery_data.items.forEach(item => {
                    const media = p.media_metadata[item.media_id];
                    let imgUrl = media?.s?.u;
                    if (imgUrl) {
                        imgUrl = imgUrl.replaceAll('&amp;', '&');
                        content += `<img src="${imgUrl}" alt="gallery image">`;
                    }
                });
                content += '</div>';
            }

            // LINK
            else if (p.post_hint === 'link' || p.domain) {
                content += `
                    <p>
                        🔗 <a href="${p.url}" target="_blank" rel="noopener noreferrer">
                            ${p.domain} 
                        </a>
                    </p>
                `;
            }

        div.innerHTML = content;
        feed.appendChild(div);
    });
}

// INFINITE SCROLL
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
        if (!loading && after) {
            if (currentSubreddit) {
                loadPosts();
            } else if (currentUser) {
                loadUserPosts();
            }
        }
    }
});

// SERVICE WORKER
if ("serviceWorker" in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register("./sw.js")
            .then(() => console.log("Service Worker registered"))
            .catch((err) => console.error("SW failed", err));
    });
}