import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');
document.querySelector('.projects-title').textContent = `${projects.length} Projects`;

renderProjects(projects, projectsContainer, 'h2');

const colors = d3.scaleOrdinal(d3.schemeTableau10);

let query = '';
let selectedIndex = -1;

function renderPieChart(projectsGiven) {
    const rolledData = d3.rollups(
      projectsGiven,
      v => v.length,
      d => d.year
    );
    const data = rolledData.map(([year, count]) => ({
      value: count,
      label: year
    }));
  
    const svg = d3.select('#projects-plot');
    svg.selectAll('path').remove();
  
    const legend = d3.select('.legend');
    legend.selectAll('li').remove();
  
    const sliceGenerator = d3.pie().value(d => d.value);
    const arcData = sliceGenerator(data);
    const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  
  
    svg
        .selectAll('path')
        .data(arcData)
        .enter()
        .append('path')
        .attr('d', arcGenerator)
        .attr('style', (_, i) => `--color: ${colors(i)}`)
        .attr('fill', (_, i) => colors(i))  
        .attr('transform', 'translate(0,0)')
        .on('click', function (event, d) {
            const i = arcData.indexOf(d);
            selectedIndex = selectedIndex === i ? -1 : i;
          
            svg
              .selectAll('path')
              .attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));
          
            legend
              .selectAll('li')
              .attr('class', (_, idx) => `legend-item ${idx === selectedIndex ? 'selected' : ''}`);
          

            // if (selectedIndex === -1) {
            //   renderProjects(projects, projectsContainer, 'h2');
            // } else {
            //   const selectedYear = data[selectedIndex].label;
            //   const filteredByYear = projects.filter(p => p.year === selectedYear);
            //   renderProjects(filteredByYear, projectsContainer, 'h2');
            // }
            if (selectedIndex === -1) {
                renderProjects(filteredBySearch, projectsContainer, 'h2');
            } else {
                const selectedYear = data[selectedIndex].label;
                const filteredByBoth = filteredBySearch.filter(p => p.year === selectedYear);
                renderProjects(filteredByBoth, projectsContainer, 'h2');
            }
          });
          

  
    data.forEach((d, idx) => {
      legend
        .append('li')
        .attr('style', `--color:${colors(idx)}`)
        .attr('class', `legend-item ${idx === selectedIndex ? 'selected' : ''}`)
        .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
    });
  }


renderPieChart(projects);
let filteredBySearch = projects;  

searchInput.addEventListener('input', event => {
  query = event.target.value.toLowerCase();

  filteredBySearch = projects.filter(project => {
    const values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query);
  });


  if (query === '') {
    filteredBySearch = projects;
  } else {
    filteredBySearch = projects.filter(project => {
      const values = Object.values(project).join('\n').toLowerCase();
      return values.includes(query);
    });
  }


  if (selectedIndex === -1) {
    renderProjects(filteredBySearch, projectsContainer, 'h2');
  } else {
    const selectedYear = data[selectedIndex].label;
    const filteredByBoth = filteredBySearch.filter(p => p.year === selectedYear);
    renderProjects(filteredByBoth, projectsContainer, 'h2');
  }

  renderPieChart(filteredBySearch); 
});


// searchInput.addEventListener('input', event => {
//   query = event.target.value.toLowerCase();

//   const filteredProjects = projects.filter(project => {
//     const values = Object.values(project).join('\n').toLowerCase();
//     return values.includes(query);
//   });


//   renderProjects(filteredProjects, projectsContainer, 'h2');


//   if (filteredProjects.length === 0) {
//     renderPieChart(projects);
//   } else {
//     renderPieChart(filteredProjects);
//   }
// });

