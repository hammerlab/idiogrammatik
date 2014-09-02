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
var HIGHLIGHT_HEIGHT = 21;
var CENTROMERE_RADIUS = 1.5;
var ARM_CLIP_RADIUS = 10;
var INITIAL_SCALE = 1;
var MAX_ZOOM_SCALE = 1000;
var CHR_1 = 'chr1', CHR_Y = 'chrY';


function _idiogrammatik() {
  var width = 800,
      height = 100,
      margin = {top: 50, bottom: 20, left: 20, right: 50},
      xscale = d3.scale.linear(), // scale to map x-pos to base pair
      fullXDomain, // used for scaling
      curScale = INITIAL_SCALE, // used for scaling
      lastBp, // used for dragging
      deferred = [], // list of functions to be called upon draw
      customRedraw = identity, // additional function to be called upon redraw
      drawn = false, // true once the kgram has been called once (so, drawn)
      // Aesthetics:
      bandStainer = gstainFiller,
      idiogramHeight = IDIOGRAM_HEIGHT,
      centromereRadius = CENTROMERE_RADIUS,
      highlightHeight = HIGHLIGHT_HEIGHT,
      // Closed-over customizable vars:
      svg, chromosomes, listener, data, highlights = [],
      events = {'click': identity, 'mousemove': identity,
                'drag': identity, 'zoom': identity,
                'dragstart': identity, 'dragend': identity};


  function kgram(selection) {
    // Function which actually renders and begins the visualization.
    //
    // Closes around everything.
    data = selection.datum();
    xscale.domain([0, data.totalBases])
        .range([0, width - margin.left - margin.right]);
    fullXDomain = xscale.domain();

    svg = appendSvg(selection, width, height, margin),
    chromosomes = appendChromosomes(svg, data, bandStainer, idiogramHeight),
    listener = appendListenerBox(svg, width, height, margin);
    appendArmClips(chromosomes, idiogramHeight);
    initializeMouseListener(listener);

    deferred.map(function(callable) { callable(); });

    redraw(curScale, data.totalBases/2, null, true);

    drawn = true;
  }
  kgram.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return kgram;
  };
  kgram.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return kgram;
  };
  kgram.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return kgram;
  };
  kgram.on = function(type, callback) {
    events[type] = callback || identity;
    return kgram;
  };
  kgram.highlight = function() {
    if (!arguments.length) return highlights;
    var args = Array.prototype.slice.call(arguments);

    var futureHighlight = function() {
      var highlight = parseHighlight(data, args);

      highlight.remove = function() {
        var idx = highlights.indexOf(highlight);
        highlights.splice(idx, 1);
        if (drawn) redraw(null, null, null, true);
        highlight.remove = null;
        return kgram;
      }
      highlights.push(highlight);

      return highlight;
    }

    if (drawn) {
      var result = futureHighlight();
      redraw(null, null, null, true);
      return result;
    } else {
      deferred.push(futureHighlight);
      return kgram;
    }
  };
  kgram.highlights = function() {
    return highlights;
  };
  kgram.svg = function() {
    return svg;
  };
  kgram.scale = function() {
    return xscale;
  };
  kgram.redraw = function(_) {
    if (!arguments.length) return customRedraw;
    customRedraw = _;
    return kgram;
  };
  kgram.forceRedraw = function() {
    redraw(null, null, null, true);
    // if (!arguments.length) redraw(null, null, null, true);
    // else redraw.apply(this, Array.prototype.slice.call(arguments));
  };

  // Aesthetics:
  kgram.stainer = function(_) {
    if (!arguments.length) return bandStainer;
    bandStainer = _;
    return kgram;
  };
  kgram.highlightHeight = function(_) {
    if (!arguments.length) return highlightHeight;
    highlightHeight = _;
    return kgram;
  };
  kgram.idiogramHeight= function(_) {
    if (!arguments.length) return idiogramHeight;
    idiogramHeight = _;
    return kgram;
  }
  kgram.centromereRadius = function(_) {
    if (!arguments.length) return centromereRadius;
    centromereRadius = _;
    return kgram;
  };

  // Utilities:
  kgram.positionFromAbsoluteBp = function(bp) {
    // Returns the position at a given absolute base pair.
    if (arguments.length != 1)
      throw "Must pass argument `absolute bp position`.";
    return positionFromAbsoluteBp(data, bp);
  };
  kgram.positionFromRelative = function(name, bp) {
    // Returns the position at a relative base position within a chromosome
    // given by the string name.
    if (arguments.length !== 2)
      throw "Must pass arguments `name of chromosome` and `relative bp position`.";
    var chr = chromosomeFromName(data, name);
    bp = chr.start + bp;
    return positionFromAbsoluteBp(data, bp);
  };


  highlights.remove = function() {
    // This allows us to remove all highlights at once from the highlight array
    // itself.
    highlights.map(function(highlight) {
      return highlight.remove;
    }).map(function(remove) { remove() });
  };


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
      resizeBands(chromosomes, xscale, idiogramHeight, centromereRadius);
      renderHighlights(svg, data, highlights, xscale, idiogramHeight, highlightHeight);
      reattachListenerToTop(svg);
    }

    customRedraw(svg, xscale);
  }


  function initializeMouseListener(listener) {
    //
    // Closes around xscale, lastBp.
    var zoomer = d3.behavior.zoom()
          .scaleExtent([1, MAX_ZOOM_SCALE])
          .on('zoom', zoom)
          .on('zoomstart', dispatchEvent('zoomstart'))
          .on('zoomend', dispatchEvent('zoomend')),
        dragger = d3.behavior.drag()
          .on('dragstart', function() {
            var position = positionFrom(data, d3.mouse(this), xscale);
            lastBp = position.absoluteBp;
            if (events['dragstart'])
              events['dragstart'](position);
          })
          .on('dragend', dispatchEvent('dragend'))
          .on('drag', drag);

    listener
        .on('mousemove', dispatchEvent('mousemove'))
        .on('mousedown', dispatchEvent('mousedown'))
        .on('mouseup', dispatchEvent('mouseup'))
        .on('click', dispatchEvent('click'))
        .call(zoomer)
        .call(dragger);

    function zoom() {
      var position = positionFrom(data, d3.mouse(this), xscale);
      if (!position.chromosome) return;
      redraw(d3.event.scale, position.absoluteBp);
      events['zoom'](position, kgram);
    }
    function drag() {
      var position = positionFrom(data, d3.mouse(this), xscale);
      redraw(null, position.absoluteBp, position.absoluteBp - lastBp);
      events['drag'](position, kgram);
    }
    function dispatchEvent(type) {
      return function() {
        if (events[type]) {
          var position = positionFrom(data, d3.mouse(this), xscale);
          events[type](position, kgram);
        }
      }
    }
  }

  return kgram;
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


function resizeBands(chromosomes, xscale, idiogramHeight, centromereRadius) {
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
      .attr('cy', idiogramHeight/2)
      .attr('fill', '#FF3333')
      .attr('r', centromereRadius);
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


function appendChromosomes(svg, data, bandStainer, idiogramHeight) {
  var chromosomes = svg.selectAll('.chromosome')
      .data(data)
    .enter().append('g')
      .attr('class', 'chromosome');

  chromosomes.selectAll('.band')
      .data(function(d) { return d.values; })
    .enter().append('rect')
      .attr('class', 'band')
      .attr('fill', bandStainer)
      .attr('y', 0)
      .attr('height', idiogramHeight);

  chromosomes.selectAll('.centromere')
      .data(function(d) { return [d]; })
    .enter().append('circle')
      .attr('class', 'centromere');

  return chromosomes;
}


function appendArmClips(chromosomes, idiogramHeight) {
  chromosomes
    .append('g')
    .append('clipPath')
      .attr('id', function(d) {
        return d.key + '-clipper-P';
      })
    .append('rect')
      .attr('class', 'clipper-p')
      .attr('y', 0)
      .attr('height', idiogramHeight)
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
      .attr('height', idiogramHeight);
}


function appendListenerBox(svg, width, height, margin) {
  return svg.append('rect')
    .attr('id', 'listener')
    .attr('width', width)
    .attr('height', height)
    .attr('x', -margin.left)
    .attr('y', -margin.top)
    .attr('opacity', 0);
}

function renderHighlights(svg, data, highlights, xscale, idiogramHeight, highlightHeight) {
  var highlight = svg.selectAll('.highlight')
        .data(highlights, highlightKey),
      xMin = xscale.domain()[0],
      xMax = xscale.domain()[1];

  highlight
    .enter().append('rect')
      .attr('class', 'highlight')
      .attr('height', highlightHeight);

  highlight
      .attr('x', function(d) {
        return xscale(d.start);
      })
      .attr('y', -(highlightHeight/2)+(idiogramHeight/2))
      .attr('width', function(d) {
        return xscale(xMin + d.end - d.start);
      })
      .attr('fill', getter('color'))
      .attr('opacity', getter('opacity'));

  highlight.exit().remove();

  function highlightKey(d) {
    return d.chrStart + ':' + d.start + '-' + d.chrEnd + ':' + d.end;
  }
}

function parseHighlight(data, args) {
  // Parses a highlight object from an argument array.
  //
  // Or, if already parsed, returns the object.
  // Returns {chrStart: chr, chrEnd: chr, start: numberInAbsoluteBp,
  //          end: numberInAbsoluteBp, color: 'color', opacity: opacity}
  if (!Array.isArray(args)) return args;

  var chrStart, chrEnd, start, end, opts,
      color = 'yellow', opacity = 0.2;

  if (typeof args[0] === 'string') {
    // We assume agr 1 is chr name string, arg 2 is relative bp,
    // args 3 is chr name string 2, arg 4 is relative bp within that chr,
    // then opts (opts is always assumed last).
    chrStart = chromosomeFromName(data, args[0]);
    chrEnd = chromosomeFromName(data, args[2]);
    start = args[1] + chrStart.start;
    end = args[3] + chrEnd.start;
    opts = args[4];
  } else if (typeof args[0] === 'number') {
    // Then we assume args 1 and 2 are the absolute base pairs
    start = args[0];
    end = args[1];
    chrStart = chromosomeFromAbsoluteBp(data, start);
    chrEnd = chromosomeFromAbsoluteBp(data, end);
    opts = args[2];
  } else if (typeof args[0].chromosome === 'string') {
    // Else we assume args 1, 2 like {bp: relativeBp, chromsome: 'chr1-Y'}
    chrStart = chromosomeFromName(data, args[0].chromosome);
    chrEnd = chromosomeFromName(data, args[1].chromosome);
    start = args[0].bp + chrStart.start;
    end = args[1].bp + chrEnd.start;
    opts = args[2];
  } else {
    // Else we assume it's a position object (as passed to the event handlers)
    // {absoluteBp: xyz, chromsome: { chr object ... }, etc}
    chrStart = args[0].chromosome;
    chrEnd = args[1].chromosome;
    start = args[0].absoluteBp;
    end = args[1].absoluteBp;
    opts = args[2];
  }
  if (opts && opts.color) color = opts.color;
  if (opts && opts.opacity) opacity = opts.opacity;

  var tmp;
  // Order the start and end.
  if (start > end) {
    tmp = start;
    start = end;
    end = tmp;
    tmp = chrStart;
    chrStart = chrEnd;
    chrEnd = tmp;
  }

  return {
    chrStart: chrStart,
    chrEnd: chrEnd,
    start: start,
    end: end,
    color: color,
    opacity: opacity
  }
}


function positionFrom(data, mouse, xscale) {
  var bp = bpFromMouse(mouse, xscale);
  return positionFromAbsoluteBp(data, bp);
}


function positionFromAbsoluteBp(data, absoluteBp) {
  var fmtBp = d3.format(','),
      chromosome = chromosomeFromAbsoluteBp(data, absoluteBp),
      position = { absoluteBp: absoluteBp,
                   fmtAbsoluteBp: fmtBp(absoluteBp) };

  if (chromosome) {
    position.chromosome = chromosome;
    position.relativeBp = absoluteBp - chromosome.start;
    position.fmtRelativeBp = fmtBp(position.relativeBp);
  }
  return position;
}


function bpFromMouse(mouse, xscale) {
  return Math.round(xscale.invert(mouse[0]));
}


function chromosomeFromAbsoluteBp(data, bp) {
  return data.filter(function(chr) {
    return chr.start <= bp && chr.end > bp;
  })[0];
}


function chromosomeFromName(data, name) {
  return data.filter(function(chr) {
    return chr.key === name;
  })[0];
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
