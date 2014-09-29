## Idiogrammatik

### Contents

The following two sections should get you up and running quickly, with a good
handle on how idiogrammatik works. The section that follows is a simple
description of the API exposed by idiogrammatik. The final section includes a
few "recipes" for quickly and easily adding useful functionaly to Idiogrammtik
using its extensible API. The code itself is small and rather self-contained at
less than 600 commented source lines of code.

The API is inspired by Mike Bostock's
["Towards Resuable Charts"](http://bost.ocks.org/mike/chart/), with some
liberties taken with the functionaly purity (as much as rendering data-bound
SVGs allows) in order to make Idiogrammtik more pleasant to work with as an
embeddable visualization.

The project is in use at [Hammerlab](https://github.com/hammerlab), and thus
PRs, issues, comments, etc. are much appreciated.

### Introductions

#### Short Introduction

After loading idiogrammatik.js and [d3.js](http://d3js.org/), you'll want to
load chromosome & band data, then call a configured karyogram chart on the
selection where you'd like to render the chart. From there you can further
extend and customize the karyogram. A minimal example follows.

```javascript
// Initialize and configure a karyogram.
var kgram = idiogrammatik()
    .on('click', function(position, kgram) {
      console.log(position);
    })
    .on('mouseover', function(position, kgram) {
      console.log(position);
    })
    .redraw(function(svg, scale) {
      var data = svg.selectAll('.chromosome').data();

      svg.selectAll('.cname')
          .data(data, function(d) { return d.key; })
        .enter().append('text')
          .attr('class', 'cname')
          .attr('y', -9)
          .text(function(d) { return d.key; });

      svg.selectAll('.cname')
          .attr('x', function(d) { return scale(d.start); });
    });

d3.json('./data/gstained-chromosomes.json', function(err, data) {
  if (err)  return console.error(err);

  // Render the karyogram in <body>.
  d3.select('body')
      .datum(data)
      .call(kgram);

  // Add a highlight to the rendered karyogram (all of chromosome four).
  var highlightChr4 = kgram.highlight('chr4', {color: 'blue'});

  // Pan & zoom to a particular position in the karyogram.
  kgram.zoom('chr7', 'p21.3');
});
```

#### Complete Introduction

Idiogrammtik works in three stages:

1. Initialize and customize a karyogram object.
2. Bind the data to a [d3.js](http://d3js.org/) selection & call the karyogram
   on the selection.
3. Manipulate the drawn chart with the resultant object.

We'll want to configure our karyogram.

```javascript
var kgram = idiogramamtik();
```

We could customize it, as in the example above, but this'll do for now.

Next, we'll want to bind the data (once loaded) to the element we'll want the
chart to occupy, in the style of d3. We can then call the kgram we initialized
to render it with that data in that element.

```javascript
d3.select('#kgram')
    .datum(chromosomes)
    .call(kgram);
```

At this point, a nice and simple karyogram will be rendered. Now we can further
customize it and interact with it. For example, we can highlight chromosome one,
or zoom in on it.

```javascript
var h1 = kgram.highlight('chr1');
// And then remove the highlight:
h1.remove();
// And zoom in on chromosome twelve:
kgram.zoom('chr12');
```

### Note on data

The flexibility of idiogrammatik extends to admissible chromosome data, allowing
the user to display any sort of genome in this fashion.

Two datasets of chromosomes and their bands are included with this repository,

1. gstained-chromosomes.json
2. basic-chromosomes.json

The basic form of admissible chromosome data is simple:

```json
[
  {name: 'chromosome1', bands: [{ name: 'something band 1', value: 23, start: 0, end: 123412}, ...]},
  ...
]
```

Look at the included files for more information. Note that `kgram.stainer(..)` must be set to a stainer (a function which dispatches on a bar, returning the SVG color that it will be "stained") that can handle the bars you pass in.


### API

* **idiogrammatik**()

Constructs a new idiogrammatik object. The below functions work on the resultant object, called `kgram`.

##### Configuration

Configuration must occur before the karyogram is called and drawn for the first
time.

* kgram.**width**([*width*])

If a width is provided, sets the width of the SVG to be rendered. Otherwise,
returns the width of the SVG. *Default is 800.*

* kgram.**height**([*height*])

If a height is provided, sets the height of the SVG to be rendered. Otherwise,
returns the height of the SVG. *Default is 100.*

* kgram.**margin**([*margin*])

If a margin is provided, sets the margin of the SVG to be rendered. Otherwise,
returns the margin of the SVG. *Default is {top: 50, bottom: 20, left: 20,
right: 20}.* Must have keys `top`, `bottom`, `right`, `left`.

* kgram.**stainer**([*stainer*])

Function which dispatches on a bar object, and must return the SVG color that it
will be "stained")

Default is a function which determines the colors of the
[Giemsa stained](http://en.wikipedia.org/wiki/Giemsa_stain) karyogram
included in `gstained-chromosomes.json`.

* kgram.**idiogramHeight**([*height*])

If a height is provided, sets the height of the actual idiogram to be
rendered. Otherwise, returns the height. *Default is 7.*

* kgram.**highlightHeight**([*height*])

If a height is provided, sets the height of the highlights to be
rendered. Otherwise, returns the height of the highlights. *Default is 21.*

* kgram.**clipRadius**([*radius*])

If a radius is provided, sets the radius of the pinched chromosomes to be
rendered. Otherwise, returns the radius. *Default is 7.*

##### Hooks

* kgram.**svg**()

Return the d3 SVG selection the karyogram is rendered in.

* kgram.**scale**()

Return the d3
[linear scale](https://github.com/mbostock/d3/wiki/Quantitative-Scales#linear-scales)
mapping absolute base pair positions to X coordinates on the SVG plane.

* kgram.**zoom**(chromosomeName, [*bandName*], [*start*, *end*])

Pans and zooms the karyogram to display the rangeselected.

```javascript
kgram.zoom('chr1')
kgram.zoom('chr8, 15000, 2000000)
kgram.zoom('chr9', 'q21.2')
```

* kgram.**highlight**(chromosomeName, [*bandName*], [*start*, *end*], [*options*])

Adds a highlight to the karyogram.

```javascript
kgram.zoom('chr1', {color; 'blue'})
kgram.zoom('chr8, 15000, 2000000)
kgram.zoom('chr9', 'q21.2')
```

`options` is an optional object with possible keys `color` and `opacity`, a SVG color string and a float 0-1 respectively. *Default is `{color: 'yellow', opacity: 0.2}`.*

This returns a highlight object which has a method `remove()` which removes the highlight from the karyogram.

* kgram.**on**(type, callback)

Registers event listeners on the karyogram.

Possible `type`s are "zoom", "zoomstart", "zoomend", "mousemove", "mousedown", "mousedown", "click".

You can also label a type with a "subtype", e.g. "click.doSomethingClick" and
"click.doSomethingElse" so that you can add and remove different event listeners
on the same event.

If `callback` is `null`, the event listener is removed.

`callback` is passed `position`, an object like the following:

```javascript
{ chromosome: {totalBases: 145138636, name: "chr8",
               absoluteEnd: 1536488912, absoluteStart: 1391350276,
               bands: [...]},
  basePair: 108649724 }
```

And `kgram`, a reference to the current kgram, and `event`, the raw event
object.

* kgram.**redraw**(*redrawFunction*)

If `redrawFunction` is passed, sets it to be called every time the karyogram is
redrawn. `redrawFunction` is called after all other redrawing is done, and is
passed the D3 `svg` selection and the current `xscale`. If not, forces a
redrawing of the karyogram.

* kgram.**zoomBehavior**()

Returns the D3 zoom behavior. Useful for temporarily disabling or modifying the
behavior.

##### Utility

* kgram.**positionFromAbsolute**(bp)

Returns a position object (as described above) from a given absolute base
position.

* kgram.**positionFromRelative**(chromozomeName, bp)

Returns a position object (as described above) from a given relative base
position within a given chromosome (described by name, e.g. "chr22" or "chrX").

* kgram.**positionFromRelative**(chromosomeName, [*bandName*])

Returns the chromosome (or band of a chromosome) desired.

e.g. `kgram.get('chr1') => {name: 'chr1', bands: [...], totalBases: ...}`

##### Highlights (Management)

* kgram.**highlights**()

Return an array of all highlight objects. They can be accessed individually, and
removed by calling `h.remove()` for a given highlight, `h`.

* kgram.highlights().**remove**()

Removes all highlights from the karyogram (by calling `.remove()` on all of
them).


### Examples & Recipes

##### Selecting ranges

It's easy enough to select and highlight ranges of the genome by extending the
kgram itself. The below code shows an example using the highlight API and
events. In this manner, ranges can be selected by shift-clicking the region
start and end-points.

```javascript
  var firstPos = null,
      selection = {},
      shifted = false;

  window.onkeydown = function(e) {
    if (e.shiftKey) {
      document.getElementsByTagName("body")[0].style.cursor="text";
      shifted = true;
      try {
        kgram.zoomBehavior().x(null);
      } catch(err) {}
    }
  };
  window.onkeyup = function(e) {
    document.getElementsByTagName("body")[0].style.cursor="default";
    if (shifted && !e.shiftKey) {
      shifted = false;
      kgram.zoomBehavior().x(kgram.scale());
    }
  };

  var kgram = idiogrammatik()
      .on('dragstart', function(position, kgram) {
        if (!position.chromosome || !shifted) return;
        firstPos = position;
      })
      .on('drag', function(pos, kgram) {
        if (!pos.chromosome || !shifted || pos.chromosome !== firstPos.chromosome)
          return;
        var chr = pos.chromosome.name, start = firstPos.basePair, end = pos.basePair;
        if (start > end) var temp = start, start = end, end = temp;

        if (selection.remove) selection.remove();
        selection = kgram.highlight(chr, start, end);
      })
      .on('dragend', function(pos, kgram) {
        if (!pos.chromosome || !shifted || pos.chromosome !== firstPos.chromosome)
          return;
        var chr = pos.chromosome.name, start = firstPos.basePair, end = pos.basePair;
        if (start > end) var temp = start, start = end, end = temp;

        if (selection.remove) selection.remove();
        selection = kgram.highlight(chr, start, end);
      });

```

In a similar manner, tooltips can be drawn on the karyogram (using the
'mouseover' event instead of the 'click' event, and appending SVG elements to
the `kgram.svg()` object).


##### Custom redraw functionality

If you wanted to add elements to the graph and have them update when the graph
redraws, you might do something like the below (which adds labels above each
chromosome).

```javascript
// svg is the d3 selection of the svg this karyogram belongs to.
// scale is the linear d3 scale mapping absolute base pairs to x
//     coordinates in the SVG.
kgram.redraw(function(svg, scale) {
  // Extract the actual chromosome data.
  var data = svg.selectAll('.chromosome').data();

  // Appends the elements once.
  svg.selectAll('.cname')
      .data(data, function(d) { return d.key; })
    .enter().append('text')
      .attr('class', 'cname')
      .attr('y', -9)
      .text(function(d) { return d.key; });

  // Places the text with the scale.
  svg.selectAll('.cname')
      .attr('x', function(d) { return scale(d.start); });
});
```

##### Extensive customization and event-driven hooks

The below code demonstrates some of the current functionality:

```javascript
d3.json(gstained-chromosomes.json', function(err, data) {
  if (err) return console.error(err);

  var kgram = idiogrammatik()
      .width(1000)
      .height(85)
      .on('click', function(position) {
        console.log('clicked at ' + position.absoluteBp);
        if (position.chromosome) console.log(position.chromosome);
      })
      .on('mouseover', function(position) {
        console.log(position);
      })
      .on('drag', function(position) {
        console.log(position);
      })
      .on('zoom', function(position) {
        console.log(position);
      })
      .highlight('chrX', 0, 'chrY', 0)
      .highlightHeight(25)
      .centromereRadius(0) // removes the centromere dots.
      .idiogramHeight(11);

  d3.select('body')
      .datum(data)
      .call(kgram);


  // We can also add highlights after the idiogram has been displayed:
  kgram.highlight({chromosome: 'chr15', bp: 0},
                 {chromosome: 'chr17', bp: 1000000});

  var h = kgram.highlight(0,
                         2000000,
                         {color: 'red', opacity: 0.5}); // Absolute basepairs.

  // We can remove highlights wirh the return value of highlight() calls after the
  // graph is drawn, or can remove whichever highlights you want with
  // kgram.highlights()[n].remove()
  h.remove();
  kgram.highlights().remove(); // remove all highlights;

  // We can get the position information of a certain base pair like so:
  kgram.positionFromAbsoluteBp(1500000000);
  // { absoluteBp: 1500000000, chromosome: {key: 'chr8', start: ..., ...},
  //   fmtAbsoluteBp: "1,500,000,000",fmtRelativeBp: "108,649,724", relativeBp: 108649724 }

  // Or, similarly, from a relative position:
  kgram.positionFromRelativeBp('chr8', 108649724) // -> the same result as above

  // We can zoom to a particular position with kgram.zoom(abs1, abs2);
  // e.g.
  kgram.zoom(1400000000, 1650000000);
});
```
