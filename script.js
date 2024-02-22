const container = document.getElementById("tree-container");
const viewer = document.getElementById("info");

const dim = container.getBoundingClientRect();
const width = dim.width;
const height = dim.height;


function worst_case_nb_expts(n, k, E) {
    return Array.from({ length: k }, (_, x) => Math.max(
        x + 1 === k ? 0 : E.get(`${n},${k - (x + 1)}`) || 0,
        x + 1 === 1 ? 0 : E.get(`${n - 1},${x}`) || 0
    ));
}

function fill_dp_table(N, K) {
    const E = new Map();

    for (let n = 1; n <= N; n++) {
        E.set(`${n},1`, 1);
    }

    for (let k = 1; k <= K; k++) {
        E.set(`1,${k}`, k);
    }

    for (let n = 2; n <= N; n++) {
        for (let k = 2; k <= K; k++) {
            const key = `${n},${k}`;
            E.set(key, 1 + Math.min(...worst_case_nb_expts(n, k, E)));
        }
    }

    return E;
}

function opt_stimulus(n, k, t_lo, E) {
    if (k === 0) {
        return [];
    }
    if (n === 1) {
        return [1];
    }

    const worstCases = worst_case_nb_expts(n, k, E);
    const minExperiments = Math.min(...worstCases);

    return worstCases.reduce((result, e, x) => {
        if (e === minExperiments) {
            result.push(x + 1);
        }
        return result;
    }, []);
}


function build_tree(N, K, t_lo = 0) {
    const E = fill_dp_table(N, K);

    const data = {
        name: null,
        n: N,
        k: K,
        t_lo: t_lo,
        s: null,
        status: null,
        children: [],
    };

    const queue = [data];

    while (queue.length > 0) {
        const current_node = queue.shift();

        const xs = opt_stimulus(
            current_node.n,
            current_node.k,
            current_node.t_lo,
            E
        );
        const x = xs[Math.floor(Math.random() * xs.length)];

        current_node.s = x + current_node.t_lo;
        current_node.name = `n=${current_node.n}\nk=${current_node.k}\nt_lo=${current_node.t_lo}\ns=${current_node.s}`;

        const off = {
            name: null,
            n: current_node.n,
            k: current_node.k - x,
            t_lo: null,
            s: null,
            status: "off",
            children: [],
        };

        if (current_node.k === x) {
            off.name = `n=${off.n}\nt=${current_node.t_lo + x}`;
            off.s = current_node.t_lo + x;
        } else {
            off.t_lo = current_node.t_lo + x;
            queue.push(off);
        }
        current_node.children.push(off);

        const on = {
            name: null,
            n: current_node.n - 1,
            k: x - 1,
            t_lo: null,
            s: null,
            status: "on",
            children: [],
        };

        if (x === 1 || current_node.n === 1) {
            on.name = `n=${on.n}\nt=${current_node.t_lo}`;
            on.s = current_node.t_lo;
        } else {
            on.t_lo = current_node.t_lo;
            queue.push(on);
        }
        current_node.children.push(on);
    }

    return data;
}

function plot(event, d) {

    viewer.innerHTML = '';

    const result = d.ancestors().filter(node => node !== d).map(node => node.data);

    const stimuli = result.map(ancestor => ancestor.s);
    const responses = [d.data].concat(result.slice(0, -1)).map(ancestor => ancestor.status === "on" ? 1 : 0);

    const points = stimuli.map((s, index) => {
        return { x: s, y: responses[index], c: responses[index] ? '#e53935' : '#2bbc8a'};
    });

    const svgWidth = viewer.getBoundingClientRect().width;
    const svg = d3.select('#info')
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", 200)
      .append("g")
      .attr("transform", "translate(30, 10)");

    const xScale = d3.scaleLinear()
      .domain([0, +document.getElementById('var_K').value])
      .range([0, svgWidth - 40]);

    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([140, 0]);

    points.forEach(point => {
      svg.append('circle')
        .attr('cx', d => xScale(point.x)) 
        .attr('cy', d => yScale(point.y))
        .attr('r', 4)
        .style('fill', point.c);
    });

    // x label and ticks 

    svg.append("text")
        .attr("transform", "translate(" + (svgWidth / 2 - 15) + " ," + 190 + ")")
        .style("text-anchor", "middle")
        .text("stimulus");

    svg.append("g")
       .attr("transform", "translate(0," + 150 + ")")
       .call(d3.axisBottom(xScale));

    // y label and ticks

    svg.append('text')
        .attr('transform', "translate(" + (-10) + " ," + (200/2 - 30) + ")rotate(-90)")
        .attr('text-anchor', 'middle')
        .text('response');

    const yAxis = d3.axisLeft(yScale)
        .tickValues([0, 1])
        .tickFormat(d3.format('d'));
    svg.append("g")
       .call(yAxis);

    if (d.data.children.length !== 0) {
        svg.append("line")
            .attr("x1", xScale(d.data.s))
            .attr("y1", yScale(0))
            .attr("x2", xScale(d.data.s))
            .attr("y2", yScale(1))
            .style("stroke", "black")
            .style("stroke-width", 2)
            .style("stroke-dasharray", "5,5");
      
        svg.append("text")
            .attr("x", xScale(d.data.s))
            .attr("y", yScale(0.5))
            .attr("text-anchor", "middle")
            .text('next expt');
    }

}

function drawTree(N, K) {

    const data = build_tree(N, K);

    const treeLayout = d3.tree().size([width - 40, height - 60]);

    const rootNode = d3.hierarchy(data);
    const treeData = treeLayout(rootNode);

    const svg = d3.select('#tree-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', 'translate(' + 10 + ',' + 30 + ')');

    const links = svg.selectAll('path.link')
        .data(treeData.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('stroke', function(d) {
            if (d.target.data.status) {
                return d.target.data.status === 'on' ? '#e53935' : '#2bbc8a';
            }
            return 'black';
        })
        .attr('d', d3.linkVertical()
            .x(d => d.x)
            .y(d => d.y));

    const nodes = svg.selectAll('g.node')
        .data(treeData.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .on('click', plot);

    nodes.append('circle')
        .attr('r', 12);

    nodes.on("mouseover", function(event, d) {
      d3.select("#tooltip")
        .style("visibility", "visible")
        .html("<p>node information</p>" + d.data.name.split("\n"))
    }).on("mouseout", function() {
      d3.select("#tooltip")
        .style("visibility", "hidden");
    });

    nodes.append('text')
        .attr('font-size', '14px')
        .attr('dy', '0.3em') 
        .attr('dx', d => `-${.3 * d.data.s.toString().length}em`)
        .text(d => d.data.s);


    const legendData = [
      { color: '#e53935', label: 'on' },
      { color: '#2bbc8a', label: 'off' },
    ];

    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", "translate(" + 10 + "," + 10 + ")");

    legend.append("text")
      .attr("x", 0)
      .attr("y", -10)
      .attr("text-anchor", "start")
      .text("response");

    const legendBoxes = legend.selectAll(".legend-box")
      .data(legendData)
      .enter().append("g")
      .attr("class", "legend-box")
      .attr("transform", (d, i) => "translate(0," + (i * 20) + ")");

    legendBoxes.append("rect")
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", d => d.color);

    legendBoxes.append("text")
      .attr("x", 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "start")
      .text(d => d.label);

}

function noTree() {
  container.innerHTML = '<p class="default-message">NOTHING TO SHOW YET</p>';
}

document.getElementById('params').addEventListener('input', function (event) {
    const targetId = event.target.id;

    if (targetId === 'var_N' || targetId === 'var_K') {

      d3.select('#tree-container').html('');
      d3.select('#info').html('');
      viewer.innerHTML = '<p><u>THE PROBLEM:</u> find the threshold stimulus that causes the sensor to switch states.</p><p><u>THE SOLUTION:</u> an adaptively algorithm that determines the sequence of stimuli to expose the irreversible, binary-state sensors (IBSS) to find the threshold stimulus with the minimal number of experiments, when multiple IBSS\'s are at our disposal.</p>';

      const N = +document.getElementById('var_N').value;
      const K = +document.getElementById('var_K').value;

      if (!isNaN(N) && !isNaN(K) && N > 0 && K > 0) {
        drawTree(N, K);
        
      } else {
        noTree();
      }

    }
});

noTree();