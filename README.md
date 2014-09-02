### Idiogrammatik
###### An extensible, embeddable karyogram for the browser.

Idiogrammatik provides a small, fast, extensible idiogram (alternatively,
[karyogram](http://en.wikipedia.org/wiki/Karyogram)) that can be embedded in any
webpage.

![](http://cl.ly/image/3c2p3p3S0942/Screen%20Recording%202014-08-30%20at%2005.22%20PM.gif)

The goal of project is to provide an easily navigable map of the human
genome. The map should be speedy, intuitive, and provide enough hooks in and
events out to handle most reasonable tasks related to navigating a genome. The
current genome used is GRCh38, with staining mimicking Giemsa cytoband staining
in order to provide important visuospacial orientation.

#### Roadmap

- [X] Speed up panning (fps to 30 on a MBA).
- [X] Zoom.
- [X] d3-eqsue API.
- [X] Better events: pass more information in the `position` argument to event handlers.
- [ ] Display data (line chart, bar chart, box plot, tbd) alongside the kareogram.
- [X] Aesthetic customization (bands, cytobands) and tweaks.
- [X] Tooltip display, associated customization (can do via hooks).
- [ ] Programamtic pan and zoom.
- [X] Hooks into the SVG (custom elements, etc.).
- [X] Range selection. (can do via hooks).
- [X] Range highlighting.
- [ ] ~~Ongoing: keep the README.md up-to-date.~~

#### Example usage
The minimum viable example:

![](http://cl.ly/image/0M371r0O3R1k/Screen%20Shot%202014-08-29%20at%205.19.56%20PM.png)

```javascript
idiogrammatik.load(function(err, data) {
  if (err) return console.log('error: ', err);

  d3.select('body')
      .datum(data)
      .call(idiogrammatik());
});
```

Note the `load` function, which asynchronously loads the cytobands data (and
caches it, so subsequent calls to load are instantaneous).

###### Extensive customization and event-driven hooks

The below code demonstrates some of the current functionality:

```javascript
idiogrammatik.load(function(err, data) {
  if (err) return console.log('error: ', err);

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
});
```

###### Custom redraw functionality

If you wanted to add elements to the graph and have them update when the graph
redraws, you might do something like the below (which adds red circles to the
end of each chromosome):

```javascript
// svg is the d3 selection of the svg this karyogram belongs to.
// scale is the linear d3 scale mapping absolute base pairs to x
//     coordinates in the SVG.
kgram.redraw(function(svg, scale) {
  // Extract the actual chromosome data.
  var data = svg.selectAll('.chromosome').data();

  // Appends the elements once.
  svg.selectAll('.c-end')
      .data(data)
    .enter().append('circle')
      .attr('class', 'c-end')
      .attr('cy', 3)
      .attr('r', 10)
      .attr('fill', 'red');

  // Places and sizes them when redrawn.
  svg.selectAll('.c-end')
      .attr('cx', function(d) { return scale(d.end); });
});
```

The `position` object passed to event callbacks has the following properties:
`absoluteBp`, which is the base pair from the offset of the genome, `relativeBp`
which is the base pair from the offset of the chromosome, `chromosome` which is
the chromosome object at that base pair position, and `fmtAbsoluteBp` &
`fmtRelativeBp` which is the formatted string version of `absoluteBp` and
`relativeBp`, respectively.

###### Selecting ranges

It's easy enough to select and highlight ranges of the genome by extending the
kgram itself. The below code shows an example using the highlight API and
events. In this manner, ranges can be selected by shift-clicking the region
start and end-points.

```javascript
idiogrammatik.load(function(err, data) {
  var lastPos = null, selection = null, shifted = false;

  window.onkeydown = function(e) { if (e.shiftKey) shifted = true; };
  window.onkeyup = function(e) { if (shifted && !e.shiftKey) { shifted = false; lastPos = null; } };

  var kgram = idiogrammatik()
    .on('click', function(position, kgram) {
      if (!position.chromosome) return;

      if (shifted) {
        if (selection) {
          selection.remove();
          selection = null;
        }

        if (lastPos) {
          selection = kgram.highlight(lastPos, position);
          lastPos = null;
        } else {
          lastPos = position;
        }
      }
  });
});
```

In a similar manner, tooltips can be drawn on the karyogram (using the
'mouseover' event instead of the 'click' event.)
