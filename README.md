### Idiogrammatik
###### An extensible, embeddable karyogram for the browser.

Idiogrammatik provides a small, fast, extensible idiogram (alternatively, [karyogram](http://en.wikipedia.org/wiki/Karyogram)) that can be embedded in any webpage.

![](http://cl.ly/image/212O3M0h1I2M/Screen%20Recording%202014-08-29%20at%2004.57%20PM.gif)

The goal of project is to provide an easily navigable map of the human genome. The map should be speedy, intuitive, and provide enough hooks in and events out to handle most reasonable tasks related to navigating a genome. The current genome used is GRCh38, with staining mimicking Giemsa cytoband staining in order to provide important visuospacial orientation.

#### Roadmap

- [X] Speed up panning (fps to 30 on a MBA).
- [X] Zoom.
- [X] d3-eqsue API.
- [X] Better events: pass more information in the `position` argument to event handlers.
- [ ] Display data (line chart, bar chart, box plot, tbd) alongside the kareogram.
- [ ] Aesthetic customization (bands, cytobands) and tweaks.
- [ ] Tooltip & data display, associated customization.
- [ ] Programamtic pan and zoom.
- [X] Hooks into the SVG (custom elements, etc.).
- [ ] Range selection.
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

Note the `load` function, which asynchronously loads the cytobands data (and caches it, so subsequent calls to load are instantaneous).

The below code demonstrates all of the current functionality:

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
      .highlight('chrX', 0, 'chrY', 0);

  d3.select('body')
      .datum(data)
      .call(kgram);


  kgram.highlight({chromosome: 'chr15', bp: 0},
                 {chromosome: 'chr17', bp: 1000000});
  var h = kgram.highlight(0,
                         2000000,
                         {color: 'red', opacity: 0.5}); // Absolute basepairs.

  // You can remove highlights by the return value of highlight() calls after the
  // graph is drawn, or can remove whichever highlights you want with
  // kgram.highlights()[n].remove()
  h.remove();
  // kgram.highlights().remove(); // remove all highlights;
});
```

If you wanted to add elements to the graph and have them update when the graph redraws, you might do something like the below (which adds red circles to the end of each chromosome):

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

The `position` object passed to event callbacks has the following properties: `absoluteBp`, which is the base pair from the offset of the genome, `relativeBp` which is the base pair from the offset of the chromosome, `chromosome` which is the chromosome object at that base pair position, and `fmtAbsoluteBp` & `fmtRelativeBp` which is the formatted string version of `absoluteBp` and `relativeBp`, respectively.
