import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale, yScale, commits;
let commitProgress = 100;
let timeScale; // 全局变量用于映射 slider 范围到 datetime
let filteredCommits = []; // 将被 slider 更新


async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function processCommits(data) {
  const grouped = d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;

      return {
        id: commit,
        url: 'https://github.com/alkane7/portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
        lines, 
      };
    });

  return d3.sort(grouped, (a, b) => d3.ascending(a.datetime, b.datetime));
}

function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats');
  dl.selectAll('*').remove();  // ✅ 清空旧内容

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  const fileCount = d3.group(data, d => d.file).size;
  dl.append('dt').text('Files');
  dl.append('dd').text(fileCount);

  const maxDepth = d3.max(data, d => d.depth) ?? 0;
  dl.append('dt').text('Max depth');
  dl.append('dd').text(maxDepth);

  const longestLineLength = d3.max(data, d => d.length) ?? 0;
  dl.append('dt').text('Longest line');
  dl.append('dd').text(longestLineLength);
}



function renderScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;
  
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  
    const usableArea = {
      top: margin.top,
      right: width - margin.right,
      bottom: height - margin.bottom,
      left: margin.left,
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
    };
  
    const svg = d3
      .select('#chart')
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('overflow', 'visible');
  
    xScale = d3.scaleTime()
      .domain(d3.extent(commits, d => d.datetime))
      .range([usableArea.left, usableArea.right])
      .nice();
  
    yScale = d3.scaleLinear()
      .domain([0, 24])
      .range([usableArea.bottom, usableArea.top]);

    const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
    const rScale = d3
        .scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]); 

    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    const dots = svg.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(sortedCommits, (d) => d.id) 
        .join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines)) 
        .style('fill-opacity', 0.7)
        .attr('fill', 'steelblue')
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1); 
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });

          

    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    const yTicks = yScale.ticks();


    gridlines.selectAll('line')
        .data(yTicks)
        .join('line')
        .attr('x1', 0)
        .attr('x2', usableArea.width)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
        .attr('stroke', d => (d < 6 || d > 18) ? 'steelblue' : 'orange')  
        .attr('stroke-opacity', 0.3)
        .attr('stroke-width', 1);

  
    const xAxis = d3.axisBottom(xScale);
    svg.append('g')
      .attr('transform', `translate(0, ${usableArea.bottom})`)
      .attr('class', 'x-axis')  // 添加 class
      .call(xAxis);
  
    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');
  
    svg.append('g')
      .attr('transform', `translate(${usableArea.left}, 0)`)
      .attr('class', 'y-axis')  // 可选，为一致性
      .call(yAxis);
    
    createBrushSelector(svg);
}

function updateScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart').select('svg');

  xScale = xScale.domain(d3.extent(commits, d => d.datetime));
  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);
  const xAxis = d3.axisBottom(xScale);

  // ✅ 清除原始 x 轴
  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select('g.dots');
  const sortedCommits = d3.sort(commits, d => -d.totalLines);


  dots.selectAll('circle')
    .data(sortedCommits, d => d.id)
    .join('circle')
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    })
    // 在 join 后统一设置初始 r 为 0（仅首次）
    .attr('r', function(d) {
      const existing = d3.select(this).attr('r');
      return existing ? existing : 0;
    })
    // 给所有点加 transition：平滑更新位置 & 大小
    .transition()
    .duration(400)
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines));

  
}

  
function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');
  
    if (!commit || Object.keys(commit).length === 0) return;
  
    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime.toLocaleDateString('en', { dateStyle: 'full' });
    time.textContent = commit.datetime.toLocaleTimeString('en', { timeStyle: 'short' });
    author.textContent = commit.author;
    lines.textContent = commit.totalLines;
  }
  
function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}
  
function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
  }

  function createBrushSelector(svg) {
    const brush = d3.brush().on('start brush end', brushed);
    svg.call(brush);
  
    svg.selectAll('.dots, .overlay ~ *').raise();
  }

function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', (d) =>
      isCommitSelected(selection, d),
    );
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
  }
  
  function isCommitSelected(selection, commit) {
    if (!selection) return false;
    const [[x0, y0], [x1, y1]] = selection;
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
    return x0 <= x && x <= x1 && y0 <= y && y <= y1;
  }
  
  
function renderSelectionCount(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
  
    const countElement = document.querySelector('#selection-count');
    countElement.textContent = `${
      selectedCommits.length || 'No'
    } commits selected`;
  
    return selectedCommits;
  }
  
function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
    const container = document.getElementById('language-breakdown');
  
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);
  
    // Use d3.rollup to count lines per language
    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type,
    );
  
    // Update DOM with breakdown
    container.innerHTML = '';
  
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);
  
      container.innerHTML += `
              <dt>${language}</dt>
              <dd>${count} lines (${formatted})</dd>
          `;
    }
  }

function setupTimeSlider(commits) {
  // 初始化时间刻度尺
  timeScale = d3.scaleTime()
    .domain([
      d3.min(commits, d => d.datetime),
      d3.max(commits, d => d.datetime)
    ])
    .range([0, 100]);

  // slider 初始化与监听
  const slider = document.getElementById('commit-progress');
  slider.addEventListener('input', onTimeSliderChange);

  // 初始化显示时间
  onTimeSliderChange();
}

function onTimeSliderChange() {
  const slider = document.getElementById('commit-progress');
  commitProgress = +slider.value;

  const commitMaxTime = timeScale.invert(commitProgress);
  const timeDisplay = document.getElementById('commit-time');

  timeDisplay.textContent = commitMaxTime.toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  // ✅ 根据时间过滤 commits
  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
  const filteredData = filteredCommits.flatMap(d => d.lines);  // ✅ 这里定义

  // ✅ 更新图表与视图
  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);
  renderCommitInfo(filteredData, filteredCommits);
}


function updateFileDisplay(filteredCommits) {
  let lines = filteredCommits.flatMap((d) => d.lines);
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    })
    .sort((a, b) => b.lines.length - a.lines.length);

  const filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, (d) => d.name)
    .join((enter) =>
      enter.append('div').call((div) => {
        div.append('dt').append('code');
        div.append('dd');
      })
    );

  // 更新文件名
  filesContainer.select('dt').html((d) =>
    `<code>${d.name}</code><small>${d.lines.length} lines</small>`
  );

  // 为每个文件的 dd 添加圆点
  const dd = filesContainer.select('dd');

  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  dd.selectAll('div')
    .data((d) => d.lines)
    .join('div')
    .attr('class', 'loc')
    .style('background', (d) => colors(d.type));
}



let data = await loadData();
commits = processCommits(data);
console.log(commits);  


renderCommitInfo(data, commits);
renderScatterPlot(data, commits); 


setupTimeSlider(commits);

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html((d, i) => `
    On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
    I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
    I edited ${d.totalLines} lines across ${
      d3.rollups(d.lines, D => D.length, d => d.file).length
    } files.
    Then I looked over all I had made, and I saw that it was very good.
  `);

function onStepEnter(response) {
  const datetime = response.element.__data__.datetime;

  // 基于当前 step 的时间过滤 commits
  filteredCommits = commits.filter(d => d.datetime <= datetime);
  const filteredData = filteredCommits.flatMap(d => d.lines);

  // 更新散点图与其他视图
  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);
  renderCommitInfo(filteredData, filteredCommits);

  // 可选：更新顶部时间显示
  const timeDisplay = document.getElementById('commit-time');
  if (timeDisplay) {
    timeDisplay.textContent = datetime.toLocaleString('en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
  }
}


const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnter);