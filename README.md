### Idiogrammatik
###### An extensible, embeddable karyogram for the browser.

Idiogrammatik provides a simple, small, fast, and highly extensible idiogram
(alternatively, [karyogram](http://en.wikipedia.org/wiki/Karyogram)) that can be
embedded in any webpage.

![](http://cl.ly/image/3k452P1D2V35/Screen%20Recording%202014-09-02%20at%2011.53%20PM.gif)

The goal of project is to provide an easily navigable map of the human
genome. The map should be speedy, intuitive, and provide enough hooks in and
events out to handle most reasonable tasks related to navigating a genome
without requiring a bloated library that handles every case for every user
built-in.

The current genome used is GRCh38, with staining mimicking Giemsa cytoband
staining in order to provide important visuospacial orientation.

A running demo can be found at [www.isaachodes.io/idio](http://www.isaachodes.io/idio). Shift-clicking ranges selects/highlights them.

#### Documentation

Extensive documentation & more examples and recipes for adding functionality can
be found in [DOCUMENTATION.md](DOCUMENTATION.md), and a working example can be
run from a local server (e.g. `python -m SimpleHTTPServer`) at
[test.html](test.html).

An understanding of D3.js could be helpful for fully utilizing idiogrammatik,
but the documenation should cover all basic use-cases. The goal is that using
this library be very simple.

#### Quick Start

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

Note also that D3.js must be included in the page before idiogrammatik.js.
