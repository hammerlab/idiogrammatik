### Idiogrammatik
###### An extensible, embeddable karyogram for the browser.

Idiogrammatik provides a simple, small, fast, and highly extensible idiogram
(alternatively, [karyogram](http://en.wikipedia.org/wiki/Karyogram)) that can be
embedded in any webpage.

![](http://cl.ly/image/3k452P1D2V35/Screen%20Recording%202014-09-02%20at%2011.53%20PM.gif)

The goal of project is to provide an easily navigable map of the human (or,
really, any) genome. The map should be speedy, intuitive, and provide enough
hooks in and events out to handle most reasonable tasks related to navigating a
genome without requiring a bloated library that handles every case for every
user built-in.

The example genome used is from GRCh38, with Giemsa cytoband staining in order
to provide important visuospacial orientation. This data can be found in
`gstained-chromosomes.json`, but any data of that form can be loaded (or
hard-coded). This enables any sort of chromosomes with any sort of banding to be
easily displayed; thus, idiogrammatik can be used for mouse, fruit fly, or alien
genome navigation. Handy.

[D3.js](http://d3js.org/) is required for this software to work. Just include it
earlier in the page, and all will be well.

A running demo can be found at
[www.isaachodes.io/idio](http://www.isaachodes.io/idio). Shift-dragging ranges
selects/highlights them.

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
d3.json('data/gstrained-chromosomes.json', function(err, chromosomes) {
  if (err) return console.error(err);

  d3.select('body')
      .datum(chromosomes)
      .call(idiogrammatik());
});
```

Note that D3.js must be included in the page before idiogrammatik.js.


#### Running tests

Idiogrammatik is tested using [dpxdt](https://github.com/bslatkin/dpxdt),
allowing arbitrary code to be run, testing the features of the idiogram, and
then taking screenshot of the result and comparing it against a golden master of
the expected visual outcome.

To run tests, install dpxdt, (in a virtual environment, if you like), and run it with

```
dpxdt test tests/pdiff
```

To update the screenshots, assuming a change has been made, run

```
dpxdt update tests/pdiff
```

You can easilys ee the different by using `git webdiff`, assuming you have
[that awesome tool installed](https://github.com/danvk/webdiff).

#### License

Licensed under the [Apache License](LICENSE.txt), Version 2.0.
