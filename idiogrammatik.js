(function() {
"use strict";

// Check for the existence (or require) d3.js, which is required for
// idiogrammatik. Set _d3 to mirror it, so we don't put d3 into the global
// namespace by accident.
if (typeof d3 === 'undefined') {
  if (typeof require === 'function') {
    // Don't overwrite a global d3 instance.
    var _d3 = require('d3');
  } else {
    throw "d3.js must be included before idiogrammatik.js.";
  }
} else {
  var _d3 = d3;
}


var IDIOGRAM_HEIGHT = 7,
    CLIP_RADIUS = 7,
    HIGHLIGHT_HEIGHT = 21,
    HIGHLIGHT_COLOR = 'yellow',
    HIGHLIGHT_OPACITY = 0.2,
    WIDTH = 800,
    HEIGHT = 100,
    MARGIN = {top: 50, bottom: 20, left: 20, right: 20},
    ALL_CHROMOSOMES = null;


// This is the primary export of this file. Calling this function returns an
// instance of an idiogram, which can be configured and then called on a d3
// selection.
function _idiogrammatik() {
  var width = WIDTH,
      height = HEIGHT,
      margin = MARGIN,
      xscale = _d3.scale.linear(), // Scale to map x-pos to base pair.
      deferred = [], // List of functions to be called upon draw.
      customRedraw = identity, // Additional function to be called upon redraw.
      drawn = false, // True once the kgram has been called once (so, drawn).
      // Aesthetics:
      bandStainer = gstainFiller,
      idiogramHeight = IDIOGRAM_HEIGHT,
      clipRadius = CLIP_RADIUS,
      highlightHeight = HIGHLIGHT_HEIGHT,
      zoom, // Zoom behavior reference.
      // Closed-over customizable vars:
      svg, chromosomes, listener, data, highlights = [], events = {};

  function kgram(selection) {
    // Function which actually renders and begins the visualization.
    //
    // Closes around nearly everything above.
    data = preprocessChromosomes(selection.datum());

    xscale.domain([0, data.totalBases])
        .range([0, width - margin.left - margin.right]);

    svg = appendSvg(selection, width, height, margin),
    chromosomes = appendChromosomes(svg, data, bandStainer, idiogramHeight),
    listener = appendListenerBox(svg, width, height, margin);
    initializeMouseListener(listener);
    appendChromosomeClips(chromosomes, idiogramHeight);

    deferred.map(function(callable) { callable(); });

    redraw();

    drawn = true;
  }
  // Aesthetics:
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
  };
  kgram.clipRadius= function(_) {
    if (!arguments.length) return clipRadius;
    clipRadius = _;
    return kgram;
  };

  // Utilities:
  kgram.positionFromAbsoluteBp = function(bp) {
    // Returns the position at a given absolute base pair.
    if (arguments.length !== 1)
      throw "Must pass argument `absolute bp position`.";
    return positionFromAbsoluteBp(data, bp);
  };
  kgram.positionFromRelative = function(name, bp) {
    // Returns the position at a relative base position within a chromosome
    // given by the string name.
    if (arguments.length !== 2)
      throw "Must pass arguments `name of chromosome` and `relative bp position`.";
    var chr = chromosomeFromName(data, name);
    if (bp === null) bp = chr.end;
    else bp = chr.start + bp;
    return positionFromAbsoluteBp(data, bp);
  };
  kgram.data = function() {
    return data;
  };
  kgram.ALL_CHROMOSOMES = ALL_CHROMOSOMES;
  kgram.get = function(chr, bandName) {
    var chromosome = chromosomeFromName(data, chr);
    if (!bandName) {
      return chromosome;
    } else {
      return chromosome.bands.filter(function(band) {
        if (band.name === bandName) return true;
      })[0];
    }
  }

  // Interact
  kgram.svg = function() {
    return svg;
  };
  kgram.scale = function() {
    return xscale;
  };
  kgram.zoom = function(/* args */) {
    var args = Array.prototype.slice.call(arguments),
        range = rangeFromArgs(args, data),
        absoluteStart = range.chromosome.absoluteStart + range.start,
        absoluteEnd = range.chromosome.absoluteStart + range.end;
    _d3.transition().tween('zoom', function() {
      var interpolatedX = _d3.interpolate(xscale.domain(),
                                          [absoluteStart, absoluteEnd]);
      return function(t) {
        zoom.x(xscale.domain(interpolatedX(t)));
        redraw();
      };
    });
    return kgram;
  };
  kgram.redraw = function(_) {
    if (!arguments.length) return redraw();
    customRedraw = _;
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
      var highlight = parseHighlight(args, data);

      highlight.remove = function() {
        var idx = highlights.indexOf(highlight);
        highlights.splice(idx, 1);
        if (drawn) redraw();
        highlight.remove = null;
      }
      highlights.push(highlight);

      return highlight;
    }

    if (drawn) {
      var result = futureHighlight();
      redraw();
      return result;
    } else {
      deferred.push(futureHighlight);
      return kgram;
    }
  };
  kgram.highlights = function() {
    return highlights;
  };
  kgram.zoomBehavior = function() {
    return zoom;
  }


  highlights.remove = function() {
    // This allows us to remove all highlights at once from the highlight array
    // itself.
    highlights.map(function(highlight) {
      return highlight.remove;
    }).map(function(remove) { remove() });
  };


  function redraw() {
    // Redraws (mostly this means repositions and changes the width of chromosomes
    // and their bands) the karyogram.
    //
    // Closes around xscale.
    var chromosomes = svg.selectAll('.chromosome');

    resizeBands(chromosomes, xscale, idiogramHeight);
    resizeChromosomeClips(chromosomes, xscale, clipRadius);
    renderHighlights(svg, data, highlights, xscale, idiogramHeight, highlightHeight);
    customRedraw(svg, xscale);
    reattachListenerToTop(svg);

    return kgram;
  }


  function initializeMouseListener(listener) {
    // Initializes all event & behavior listeners on an invisible rectangle on
    // top of all the SVG elements.
    //
    // Closes around xscale, zoom.
    zoom = _d3.behavior.zoom()
          .x(xscale)
          .on('zoom', onzoom)
          .on('zoomstart', dispatchEvent('zoomstart'))
          .on('zoomend', dispatchEvent('zoomend'));

    var drag = _d3.behavior.drag()
          .on('drag', dispatchEvent('drag'))
          .on('dragstart', dispatchEvent('dragstart'))
          .on('dragend', dispatchEvent('dragend'));

    listener
        .on('mousemove', dispatchEvent('mousemove'))
        .on('mousedown', dispatchEvent('mousedown'))
        .on('mouseup', dispatchEvent('mouseup'))
        .on('click', dispatchEvent('click'))
        .call(zoom)
        .call(drag);

    function onzoom(event) {
      var position = positionFrom(data, _d3.mouse(this), xscale);
      redraw();
      events['zoom'] && events['zoom'](position, kgram, event);
    }
    function dispatchEvent(type) {
      return function(event) {
        if (events[type]) {
          var position = positionFrom(data, _d3.mouse(this), xscale);
          events[type](position, kgram, event);
        }
      }
    }
  }

  return kgram;
}


function identity(_) {
  return _;
}


function getter() {
  var attrs = Array.prototype.slice.call(arguments);
  return function(d) {
    var res = d;
    for (var i in attrs) {
      res = res[attrs[i]];
    }
    return res;
  }
}


function resizeBands(chromosomes, xscale, idiogramHeight) {
  var xMin = xscale.domain()[0],
      xMax = xscale.domain()[1];

  chromosomes
      .attr('transform', function(d) {
        return 'translate(' + xscale(d.absoluteStart) + ',0)';
      })
      .attr('clip-path', function(d) {
        return 'url(#' + d.name + ')';
      });

  chromosomes
    .selectAll('.band')
      // xMin required because these coords are within-chromosome
      .attr('x', function(d) { return xscale(xMin + d.start); })
      .attr('width', function(d) { return xscale(xMin + d.end - d.start); });
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
      .data(function(d) { return d.bands; })
    .enter().append('rect')
      .attr('class', 'band')
      .attr('fill', bandStainer)
      .attr('y', 0)
      .attr('height', idiogramHeight);

  return chromosomes;
}


function appendChromosomeClips(chromosomes, idiogramHeight) {
  chromosomes
    .append('g')
    .append('clipPath')
      .attr('id', function(d) {
        return d.name;
      })
    .append('rect')
      .attr('class', 'clipper')
      .attr('y', 0)
      .attr('height', idiogramHeight)
      .attr('x', 0);
}


function resizeChromosomeClips(chromosomes, xscale, clipRadius) {
  var xMin = xscale.domain()[0];

  chromosomes.selectAll('.clipper')
      // xMin required because these coords are within-chromosome
      .attr('width', function(d) { return xscale(xMin + d.totalBases); })
      .attr('rx', clipRadius)
      .attr('ry', clipRadius);
}


// This appends an invisible rectangle to the svg, which will listen for events.
function appendListenerBox(svg, width, height, margin) {
  return svg.append('rect')
    .attr('id', 'listener')
    .attr('width', width)
    .attr('height', height)
    .attr('x', -margin.left)
    .attr('y', -margin.top)
    .attr('opacity', 0);
}


function renderHighlights(svg, data, highlights, xscale,
                          idiogramHeight, highlightHeight) {
  var highlight = svg.selectAll('.highlight')
        .data(highlights, highlightKey),
      xMin = xscale.domain()[0];

  highlight
    .enter().append('rect')
      .attr('class', 'highlight')
      .attr('height', highlightHeight);

  highlight
      .attr('x', function(d) {
        return xscale(d.start + d.chromosome.absoluteStart);
      })
      .attr('y', -(highlightHeight/2)+(idiogramHeight/2))
      .attr('width', function(d) {
        return xscale(xMin + d.end - d.start);
      })
      .attr('fill', getter('options', 'color'))
      .attr('opacity', getter('options', 'opacity'));

  highlight.exit().remove();

  function highlightKey(d) {
    return d.chromosome.name + ':' + d.start + '-' +  d.end;
  }
}


function parseHighlight(args, data) {
  // Parses a highlight object from an argument array.
  var opts = {color: HIGHLIGHT_COLOR,
              opacity: HIGHLIGHT_OPACITY};

  if (typeof args[args.length - 1] === 'object' && args[args.length - 1] !== null) {
    var tempOpts = args[args.length - 1];
    opts.color = tempOpts.color || opts.color;
    opts.opacity = tempOpts.opacity || opts.opacity;
    args.splice(args.length - 1, 1);
  }

  var range = rangeFromArgs(args, data);

  return {
    start: range.start,
    end: range.end,
    chromosome: range.chromosome,
    options: opts
  }
}


function rangeFromArgs(args, data) {
  // Special case: args[0] === ALL_CHROMOSOMES;
  if (args[0] === ALL_CHROMOSOMES)
    return {start: 0, end: data.totalBases, chromosome: {absoluteStart: 0}};


  // The first argument is always the chromosome name.
  var chromosome = chromosomeFromName(data, args[0]),
      start, end;
  if (!chromosome) throw "Chromosome name must be a string.";

  if (args.length === 1) {
    // Then it's an entire chromosome we're highlighting here.
    // e.g. ('chr22')
    start = 0;
    end = chromosome.totalBases;
  } else if (args.length === 2) {
    // Then we're highlighting a certain band by name.
    // e.g. ('chr2', 'p1.13')
    var band = chromosome.bands.filter(function(band) {
      if (band.name === args[1]) return true;
    })[0];
    if (!band)
      throw "Band name does not exist in chromosome" + chromosome.name + ".";
    start = band.start;
    end = band.end;
  } else if (args.length === 3) {
    // Then we're highlighting a range within a chromosome
    // e.g. ('chr2', 10000, 2000000)
    start = args[1];
    end = args[2];
  } else {
    throw "Unrecognized arguments for highlight."
  }

  if (end > chromosome.totalBases)
    end = chromosome.totalBases;

  return {start: start, end: end, chromosome: chromosome};
}


function positionFrom(data, mouse, xscale) {
  var bp = bpFromMouse(mouse, xscale);
  return positionFromAbsoluteBp(data, bp);
}


function positionFromAbsoluteBp(data, absoluteBp) {
  var chromosome = chromosomeFromAbsoluteBp(data, absoluteBp),
      position = {};

  if (chromosome) {
    position.chromosome = chromosome;
    position.basePair = absoluteBp - chromosome.absoluteStart;
  }
  return position;
}


function bpFromMouse(mouse, xscale) {
  return Math.round(xscale.invert(mouse[0]));
}


function chromosomeFromAbsoluteBp(data, bp) {
  return data.filter(function(chr) {
    return chr.absoluteStart <= bp && chr.absoluteEnd > bp;
  })[0];
}


function chromosomeFromName(data, name) {
  return data.filter(function(chr) {
    return chr.name === name;
  })[0];
}


// Adds necesary information to make visualizing the chromosomes & bands easy.
function preprocessChromosomes(chromosomes) {
  var genomeBases = 0;
  for (var name in chromosomes) {
    var chromosome = chromosomes[name],
        bands = chromosome.bands,
        chromosomeLength = 0;
    for (var bandIdx in bands) {
      var band = bands[bandIdx],
          bandLength = band.end - band.start;

      chromosomeLength += bandLength;
      band.chromosome = chromosome;
    }
    chromosome.totalBases = chromosomeLength;
    chromosome.absoluteStart = genomeBases;
    genomeBases += chromosomeLength;
    chromosome.absoluteEnd = genomeBases;
  }
  chromosomes.totalBases = genomeBases;
  return chromosomes;
}


function gstainFiller(d) {
  var stain = d.value;
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


// Example usage:
//
//      d3.select('body')
//         .datum(CYTOBANDS)
//         .call(idiogramatik());
//
// See more in `test.html` & the README.md/DOCUMENTATION.md files.

_idiogrammatik.ALL_CHROMOSOMES = ALL_CHROMOSOMES;

// Export idiogrammatik for either node-type requires or for browers.
if (typeof exports !== 'undefined') {
  if (typeof module !== 'undefined' && module.exports) {
    exports = module.exports = _idiogrammatik;
  }
  exports = _idiogrammatik;
} else {
  this.idiogrammatik = _idiogrammatik;
}

}.call(this));
