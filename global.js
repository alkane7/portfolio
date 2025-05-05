console.log('IT’S ALIVE!');
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"            // Local server
  : "/portfolio/";    // GitHub Pages repo name


function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}
// const navLinks = $$("nav a");

// let currentLink = navLinks.find(
//   (a) => a.host === location.host && a.pathname === location.pathname
// );

// if (currentLink) {
//   currentLink.classList.add("current");
// }


let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'https://github.com/alkane7', title: 'Profile' },
  { url: 'cv/', title: 'CV' },
  { url: 'meta/', title: 'Meta' },
];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  url = !url.startsWith('http') ? BASE_PATH + url : url;

  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;

  a.classList.toggle("current", a.host === location.host && a.pathname === location.pathname);

  if (a.host !== location.host) {
    a.target = "_blank";
  }  

  nav.append(a);
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
    <label class="color-scheme">
      Theme:
      <select id="theme-switcher">
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  `
);

const select = document.querySelector('#theme-switcher');

function setColorScheme(value) {
  document.documentElement.style.setProperty('color-scheme', value);
  localStorage.colorScheme = value;
  select.value = value;
}
select.addEventListener('input', function (event) {
  console.log('color scheme changed to', event.target.value);
  setColorScheme(event.target.value);
});

if ('colorScheme' in localStorage) {
  setColorScheme(localStorage.colorScheme);
}

const form = document.querySelector('form');

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault(); 
    const subject = encodeURIComponent(form.subject.value);
    const body = encodeURIComponent(form.message.value);
    const url = `mailto:lisusan1104@gmail.com?subject=${subject}&body=${body}`;
    location.href = url;
  });
}

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    console.log(response)
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}


export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  containerElement.innerHTML = '';
  projects.forEach(project => {
    const article = document.createElement('article');
    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${project.image}" alt="${project.title}">
      <p>${project.description}</p>
      <p class="year">c. ${project.year}</p>
    `;
    containerElement.appendChild(article);
  });
}

export async function fetchGitHubData(username) {
  // return statement here
  return fetchJSON(`https://api.github.com/users/${username}`);
}
