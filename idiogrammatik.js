(function() {
"use strict";

// Data from GRCh38 [cytobands.tsv]
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
var INITIAL_SCALE = 1;
var MAX_ZOOM_SCALE = 1000;


function _idiogrammatik() {
  var width = 800,
      height = 100,
      margin = {top: 50, bottom: 20, left: 20, right: 50},
      xscale = d3.scale.linear(),
      fullXDomain, // used for scaling
      curScale, // used for scaling
      lastBp, // used for dragging
      svg, chromosomes, listener, data,
      events = {'click': identity, 'mousemove': identity,
                'drag': identity, 'zoom': identity};


  function draw(selection) {
    // Function which actually renders and begins the visualization.
    //
    // Closes around everything.
    data = selection.datum();

    xscale.domain([0, data.totalBases])
        .range([0, width - margin.left - margin.right]);
    fullXDomain = xscale.domain();

    svg = appendSvg(selection, width, height, margin),
    chromosomes = appendChromosomes(svg, data),
    listener = appendListenerBox(svg, width, height, margin);

    appendArmClips(chromosomes);
    initializeMouseListener(listener);

    redraw(curScale, data.totalBases/2, null, true);
  }


  draw.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return draw;
  }
  draw.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return draw;
  }
  draw.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return draw;
  }
  draw.on = function(type, callback) {
    events[type] = callback || identity;
    return draw;
  }


  function redraw(scale, pivot, shiftBp, forceDraw) {
    // Redraws (mostly this means repositions and changes the width of chromosomes
    // and their bands) the karyogram, taking into account the difference in scale
    // and the number of base pairs (bp) the karyogram should shift.
    //
    // Closes around xscale, curScale.
    var chromosomes = svg.selectAll('.chromosome'),
        xMin = xscale.domain()[0],
        xMax = xscale.domain()[1];

    if (scale) { // then we should see if we need to scale up or down
      if (!curScale) {
        // pass (we haven't yet initialized curScale)
      } else if (curScale < scale) { // scaling up
        var tscale = scale / curScale;
        xMin = pivot - ((pivot - xscale.domain()[0]) / tscale);
        xMax = ((xscale.domain()[1] - pivot) / tscale) + pivot;
      } else if (curScale > scale) { // scaling down
        var tscale = curScale / scale;
        xMin = pivot - ((pivot - xscale.domain()[0]) * tscale);
        xMax = ((xscale.domain()[1] - pivot) * tscale) + pivot;
      }
    }
    curScale = scale;

    if (shiftBp) {
      xMin -= shiftBp;
      xMax -= shiftBp;
    }

    if (shiftBp || scale || forceDraw) {
      xscale.domain([xMin, xMax]);
      resizeArmClips(chromosomes, xscale);
      resizeBands(chromosomes, xscale);
      reattachListenerToTop(svg);
    }
  }


  function initializeMouseListener(listener) {
    //
    // Closes around xscale, lastBp.
    var zoomer = d3.behavior.zoom()
          .scaleExtent([1, MAX_ZOOM_SCALE])
          .on("zoom", zoom),
        dragger = d3.behavior.drag()
          .on("dragstart", function() {
            lastBp = bpFromMouse(d3.mouse(this), xscale);
          })
          .on("drag", drag);

    listener
        .on('mousemove', move)
        .on('click', click)
        .call(zoomer)
        .call(dragger);

    function zoom() {
      var position = positionFromMouse(d3.mouse(this), xscale);
      redraw(d3.event.scale, position.absBp);
      events['zoom'](position);
    }
    function drag() {
      var position = positionFromMouse(d3.mouse(this), xscale);
      redraw(null, position.absBp, position.absBp - lastBp);
      events['drag'](position);
    }
    function move() {
      var position = positionFromMouse(d3.mouse(this), xscale);
      events['mousemove'](position);
    }
    function click() {
      var position = positionFromMouse(d3.mouse(this), xscale);
      events['click'](position);
    }
  }

  return draw;
}


function identity(_) {
  return _;
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


function resizeArmClips(chromosomes, xscale) {
  var xMin = xscale.domain()[0];

  chromosomes.selectAll('.clipper-p')
      // xMin required because these coords are within-chromosome
      .attr('width', function(d) { return xscale(xMin + d.pArm.end - d.pArm.start); })
      .attr('rx', ARM_CLIP_RADIUS)
      .attr('ry', ARM_CLIP_RADIUS);

  chromosomes.selectAll('.clipper-q')
      // xMin required because these coords are within-chromosome
      .attr('x', function(d) { return xscale(xMin + d.pArm.end - d.pArm.start); })
      .attr('width', function(d) { return xscale(xMin + d.qArm.end - d.qArm.start); })
      .attr('rx', ARM_CLIP_RADIUS)
      .attr('ry', ARM_CLIP_RADIUS);
}


function resizeBands(chromosomes, xscale) {
  var xMin = xscale.domain()[0],
      xMax = xscale.domain()[1];

  chromosomes
      .attr('transform', function(d) {
        return 'translate(' + xscale(d.start) + ',0)';
      });

  chromosomes
    .selectAll('.band')
      // xMin required because these coords are within-chromosome
      .attr('x', function(d) { return xscale(xMin + d.start); })
      .attr('width', function(d) { return xscale(xMin + d.end - d.start); })
      .attr('clip-path', function(d) {
        if ((d.end + d.chromosome.start) <= d.chromosome.center) // then we're in the P arm
          return 'url(#' + d.chromosomeName + '-clipper-P' + ')';
        else // well, then we're in the Q arm
          return 'url(#' + d.chromosomeName + '-clipper-Q' + ')';
      });

  chromosomes
    .selectAll('.centromere')
      .attr('cx', function(d) {
        return xscale(xMin + d.center - d.start);
      })
      .attr('cy', IDIOGRAM_HEIGHT/2)
      .attr('fill', '#FF3333')
      .attr('r', CENTROMERE_RADIUS);
}


function reattachListenerToTop(svg) {
  svg.node().appendChild(svg.select('#listener').node());
}


function appendSvg(selector, width, height, margin) {
  return selector
    .append('svg')
      .attr('width', width)
      .attr('height', height)
    .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
}


function appendChromosomes(svg, data) {
  var chromosomes = svg.selectAll('.chromosome')
      .data(data)
    .enter().append('g')
      .attr('class', 'chromosome');

  chromosomes.selectAll('.band')
      .data(function(d) { return d.values; })
    .enter().append('rect')
      .attr('class', 'band')
      .attr('fill', gstainFiller)
      .attr('y', 0)
      .attr('height', IDIOGRAM_HEIGHT);

  chromosomes.selectAll('.centromere')
      .data(function(d) { return [d]; })
    .enter().append('circle')
      .attr('class', 'centromere');

  return chromosomes;
}


function appendArmClips(chromosomes) {
  chromosomes
    .append('g')
    .append('clipPath')
      .attr('id', function(d) {
        return d.key + '-clipper-P';
      })
    .append('rect')
      .attr('class', 'clipper-p')
      .attr('y', 0)
      .attr('height', IDIOGRAM_HEIGHT)
      .attr('x', 0);

  chromosomes
    .append('g')
    .append('clipPath')
      .attr('id', function(d) {
        return d.key + '-clipper-Q';
      })
    .append('rect')
      .attr('class', 'clipper-q')
      .attr('y', 0)
      .attr('height', IDIOGRAM_HEIGHT);
}


function appendListenerBox(svg, width, height, margin) {
  return svg.append('rect')
    .attr('id', 'listener')
    .attr('width', width)
    .attr('height', height)
    .attr('x', -margin.left)
    .attr('y', -margin.top)
    .attr('fill', 'blue')
    .attr('opacity', 0);
}


function positionFromMouse(mouse, xscale) {
  // TODO(ihodes): pass more position info
  var bp = bpFromMouse(mouse, xscale),
      fmtBp = d3.format(',')(bp),
      position = { absBp: bp, fmtAbsBp: fmtBp };
  return position;
}


function bpFromMouse(mouse, xscale) {
  return Math.round(xscale.invert(mouse[0]));
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


function chromosomeComparator(k1, k2) {
  // Orders chromosomes strings (e.g. chrX < chr19 etc).
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

  return parseInt(k1) > parseInt(k2) ? 1 : -1;
}


function parseCytoRow(row) {
  return {
    chromosomeName: row.chromosomeName,
    start: parseInt(row.start, 10),
    end: parseInt(row.end, 10),
    bandname: row.bandname,
    gstain: row.gstain
  };
}


function _init(callback) {
  if (window.idiogrammatik.__data__)
    callback(null, window.idiogrammatik.__data__);
  else
    d3.tsv('cytoband.tsv', parseCytoRow, function(err, data) {
      if (err) {
        callback(err);
      } else {
        window.idiogrammatik.__data__ = cytobandsToChromosomes(data);
        callback(null, window.idiogrammatik.__data__);
      }
    });
}


window.idiogrammatik = _idiogrammatik;
window.idiogrammatik.load = _init;


// Example usage:
//
//      idiogrammatik.load(function(err, data) {
//        d3.select('body')
//           .datum(data)
//           .call(idiogramatik());
//      });
//
// See more in `test.html`.


})();
