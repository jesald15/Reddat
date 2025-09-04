
const addsub = document.getElementById('add-subs')
const feedSection = document.getElementById('feed');
const subSection = document.getElementById('subscriptions');

document.getElementById('home-btn').addEventListener('click', ()=>{
    feedSection.style.display = 'block';
    subSection.style.display = 'none';
});

document.getElementById('subs-btn').addEventListener('click', ()=>{
    feedSection.style.display = 'none';
    subSection.style.display = 'block';
});

const addSubBtn = document.getElementById('add-sub');
const subInput =  document.getElementById('sub-input');
const subList = document.getElementById('sub-list');

let subs = JSON.parse(localStorage.getItem('subs')) || [];

function renderSubs() {
  subList.innerHTML = '';
  subs.forEach((s, i) => {
    const li = document.createElement('li');

    // clickable subreddit name
    const subLink = document.createElement('span');
    subLink.textContent = `r/${s}`;
    subLink.style.cursor = 'pointer';
    subLink.onclick = () => {
      // Switch to Home view
      feedSection.style.display = 'block';
      subSection.style.display = 'none';

      // Trigger loading posts for that subreddit
      currentSubreddit = s;
      after = null;
      feed.innerHTML = '<p>Loading...</p>';
      loadPosts();
    };

    // delete button
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.onclick = () => {
      subs.splice(i, 1);
      localStorage.setItem('subs', JSON.stringify(subs));
      renderSubs();
    };

    li.appendChild(subLink);
    li.appendChild(delBtn);
    subList.appendChild(li);
  });
}


addsub.addEventListener('click', ()=>{
    const sub = input.value.trim();
    if (sub && !subs.includes(sub)){
        subs.push(sub);
        localStorage.setItem('subs', JSON.stringify(subs));
        renderSubs();
    }
    input.value ='';
});

renderSubs();



