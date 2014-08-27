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


function drawChromosomes(selector, cytobands) {
  var width = 1300, height = 500, margin = {top: 50, bottom: 20, left: 20, right: 50};

  // Remove the contigs we don't care about.
  cytobands = cytobands.filter(function(d) {
    return INCLUDED_CHROMOSOME_NAMES.indexOf(d.chromosome) != -1;
  });


  var chromosomes = d3.nest()
    .key(getter('chromosome'))
    .sortKeys(chromosomeComparator)
    .entries(cytobands);

  window.c = chromosomes;

  var totalBases = 0;
  for (var i in chromosomes) {
    var chromosomeLength = d3.max(chromosomes[i].values, getter('end'));
    chromosomes[i].basePairs = chromosomeLength;
    chromosomes[i].start = totalBases;
    totalBases += chromosomeLength;
    chromosomes[i].end = totalBases;
  }

  // Now we do d3 viz codez.
  var data = chromosomes;

  var xscale = d3.scale.linear()
      .domain([0, totalBases])
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
        return d.key + '-clipper';
      })
    .append('rect')
      .attr('y', 0)
      .attr('height', IDIOGRAM_HEIGHT)
      .attr('x', 0)
      .attr('width', function(d) { return xscale(d.end - d.start); })
      .attr('rx', 20)
      .attr('ry', 20);

  var bands = chromosomes.selectAll('.band')
      .data(function(d) { return d.values; })
    .enter().append('rect')
      .attr('class', 'band')
      .attr('fill', gstainFiller)
      .attr('y', 0)
      .attr('height', IDIOGRAM_HEIGHT)
      .attr('x', function(d) { return xscale(d.start); })
      .attr('width', function(d) { return xscale(d.end - d.start); })
      .attr('clip-path', function(d) {
        return 'url(#' + d.chromosome + '-clipper' + ')';
      })


}


function getter(attr) {
  return function(d) {
    return d[attr];
  }
}

function gstainFiller(d) {
  var stain = d.gstain;
  if (stain === 'gneg') {
    return 'white';
  } else if (stain === 'gpos') {
    return 'black';
  } else if (stain === 'acen') {
    return 'red';
  } else if (stain === 'gvar') {
    return 'silver';
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











function main(selector) {
  d3.tsv('cytoband.tsv',
         function(d) {
           return {
             chromosome: d.chromosome,
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
