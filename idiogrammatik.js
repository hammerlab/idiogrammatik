(function() {
"use strict";

// Data from GRCh38
// c.f. http://bioviz.org/quickload//H_sapiens_Dec_2013/
// c.f. http://www.ncbi.nlm.nih.gov/projects/genome/assembly/grc/human/data/
var INCLUDED_CHROMOSOME_NAMES = ["chr1", "chr2", "chr3", "chr4", "chr5", "chr6",
                                 "chr7", "chr8", "chr9", "chr10", "chr11", "chr12",
                                 "chr13", "chr14", "chr15", "chr16", "chr17",
                                 "chr18", "chr19", "chr20", "chr21", "chr22",
                                 "chrX", "chrY"];
var IDIOGRAM_HEIGHT = 7;
var CENTROMERE_RADIUS = 1.5;
var ARM_CLIP_RADIUS = 10;


function drawChromosomes(selector, cytobands) {
  var data = cytobandsToChromosomes(cytobands);

  var width = 800, height = 100, margin = {top: 50, bottom: 20, left: 20, right: 50};

  var xscale = d3.scale.linear()
      .domain([0, data.totalBases])
      .range([0, width - margin.left - margin.right]);

  var svg = d3.select(selector)
    .append('svg')
      .attr('width', width)
      .attr('height', height)
    .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  var chromosomes = svg.selectAll('.chromosome')
      .data(data)
    .enter().append('g')
      .attr('class', 'chromosome')
      .attr('transform', function(d) { return 'translate(' + xscale(d.start) + ',0)'; });

  chromosomes.append('clipPath')
      .attr('id', function(d) {
        return d.key + '-clipper-P';
      })
    .append('rect')
      .attr('y', 0)
      .attr('height', IDIOGRAM_HEIGHT)
      .attr('x', 0)
      .attr('width', function(d) { return xscale(d.pArm.end - d.pArm.start); })
      .attr('rx', ARM_CLIP_RADIUS)
      .attr('ry', ARM_CLIP_RADIUS);

  chromosomes.append('clipPath')
      .attr('id', function(d) {
        return d.key + '-clipper-Q';
      })
    .append('rect')
      .attr('y', 0)
      .attr('height', IDIOGRAM_HEIGHT)
      .attr('x', function(d) { return xscale(d.pArm.end - d.pArm.start); })
      .attr('width', function(d) { return xscale(d.qArm.end - d.qArm.start); })
      .attr('rx', ARM_CLIP_RADIUS)
      .attr('ry', ARM_CLIP_RADIUS);

  // chromosomes.selectAll('.sep')
  //     .data(function(d) { return [d.end - d.start]; })
  //   .enter().append('line')
  //     .style('stroke-width', 1)
  //     .style('stroke', 'black')
  //     .attr('x1', function(d) { return xscale(d); })
  //     .attr('x2', function(d) { return xscale(d); })
  //     .attr('y1', function(d) { return -7; })
  //     .attr('y2', function(d) { return 14; })

  var bands = chromosomes.selectAll('.band')
      .data(function(d) { return d.values; })
    .enter().append('rect')
      .attr('class', 'band')
      .style('shape-rendering', 'crispEdges')
      .attr('fill', gstainFiller)
      .attr('y', 0)
      .attr('height', IDIOGRAM_HEIGHT)
      .attr('x', function(d) { return xscale(d.start); })
      .attr('width', function(d) { return xscale(d.end - d.start); })
      .attr('clip-path', function(d) {
        if ((d.end + d.chromosome.start) <= d.chromosome.center) // then we're in the P arm
          return 'url(#' + d.chromosomeName + '-clipper-P' + ')';
        else // well, then we're in the Q arm
          return 'url(#' + d.chromosomeName + '-clipper-Q' + ')';
      });

  chromosomes.selectAll('.centromere')
      .data(function(d) { return [d.center - d.start]; })
    .enter().append('circle')
      .attr('class', 'centromere')
      .attr('cx', xscale)
      .attr('cy', IDIOGRAM_HEIGHT/2)
      .attr('fill', '#FF3333')
      .attr('r', CENTROMERE_RADIUS);

  var listener = svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('x', -margin.left)
      .attr('y', -margin.top)
      .attr('fill', 'white')
      .attr('opacity', 0);

  listener.on('mousemove', function() {
    var mouseX = d3.mouse(this)[0],
        bp, fmtBp;

    if (mouseX >= 0 && mouseX <= width - margin.left - margin.right)
      bp = Math.round(xscale.invert(mouseX));
    else if (mouseX >= width - margin.left - margin.right)
      bp = Math.round(xscale.invert(width - margin.left - margin.right));
    else
      bp = 0;

    fmtBp = d3.format(',')(bp);
    console.log(fmtBp);
  });

}


function getter(attr) {
  return function(d) {
    return d[attr];
  }
}


function gstainFiller(d) {
  var stain = d.gstain;
  if (stain === 'gneg') {
    return '#dfdfdf';
  } else if (stain === 'gpos') {
    return '#525252';
  } else if (stain === 'acen') {
    return null;
  } else if (stain === 'gvar') {
    return '#cfcfcf';
  } else if (stain === 'stalk') {
    return '#cfcfcf';
  } else {
    return 'white';
  }
}


function chromosomeComparator(k1, k2) {
  k1 = k1.slice(3);
  k2 = k2.slice(3);

  if (k1 === 'X' || k1 === 'Y' || k2 === 'X' || k2 === 'Y') {
    if ((k1 === 'X' || k1 === 'Y') && (k2 === 'X' || k2 === 'Y')) {
      // Both are X, Y, Y comes second.
      return k1 === 'Y' ? 1 : -1;
    } else {
      // Then just one of them is X or Y, whichever is comes second.
      return ['X', 'Y'].indexOf(k1) === -1 ? -1 : 1;
    }
  }

  k1 = parseInt(k1);
  k2 = parseInt(k2);

  return k1 > k2 ? 1 : -1;
}


function addPQArms(chromosome) {
  var bands = chromosome.values;

  var centerP = bands.filter(function(d) {
    return d.gstain === 'acen' && d.bandname[0] === 'p';
  });

  var centerQ = bands.filter(function(d) {
    return d.gstain === 'acen' && d.bandname[0] === 'q';
  });

  chromosome.pArm = { start: chromosome.start };
  chromosome.qArm = { end: chromosome.end };

  if (centerP.length > 0)
    chromosome.pArm.end = chromosome.start + centerP[0].end;
  if (centerQ.length > 0)
    chromosome.qArm.start = chromosome.start + centerQ[0].start;
}


function cytobandsToChromosomes(cytobands) {
  // Remove the contigs we don't care about.
  cytobands = cytobands.filter(function(d) {
    return INCLUDED_CHROMOSOME_NAMES.indexOf(d.chromosomeName) != -1;
  });

  // Group bands by chromosomes
  var chromosomes = d3.nest()
    .key(getter('chromosomeName'))
    .sortKeys(chromosomeComparator)
    .entries(cytobands);

  // Add metainformation to each chromosome
  var totalBases = 0;
  for (var i in chromosomes) {
    var bands = chromosomes[i].values;
    var chromosomeLength = d3.max(bands, getter('end'));
    chromosomes[i].basePairs = chromosomeLength;
    chromosomes[i].start = totalBases;
    totalBases += chromosomeLength;
    chromosomes[i].end = totalBases;

    addPQArms(chromosomes[i]);
    bands.map(function(d) {
      d.chromosome = chromosomes[i];
    });
    chromosomes[i].center = chromosomes[i].pArm.end;
  }
  chromosomes.totalBases = totalBases;

  // TODO(ihodes): Debug statement below:
  window.c = chromosomes;

  return chromosomes;
}


function main(selector) {
  d3.tsv('cytoband.tsv',
         function(d) {
           return {
             chromosomeName: d.chromosomeName,
             start: parseInt(d.start, 10),
             end: parseInt(d.end, 10),
             bandname: d.bandname,
             gstain: d.gstain
           };
         },
         function(err, data) {
           if (err) {
             console.log('There was an error loading the cytoband data.');
           } else {
             drawChromosomes(selector, data);
           }
         });
}

main('body');

window.idiogrammatik = {};

})()
