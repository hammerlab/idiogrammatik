### Idiogrammatik
###### An extensible, embeddable karyogram for the browser.

Idiogrammatik provides a small, fast, extensible idiogram (alternatively, [karyogram](http://en.wikipedia.org/wiki/Karyogram)) that can be embedded in any webpage.

![](http://cl.ly/image/212O3M0h1I2M/Screen%20Recording%202014-08-29%20at%2004.57%20PM.gif)

The goal of project is to provide an easily navigable map of the human genome. The map should be speedy, intuitive, and provide enough hooks in and events out to handle most reasonable tasks related to navigating a genome. The current genome used is GRCh38, with staining mimicking Giemsa cytoband staining in order to provide important visuospacial orientation.

#### Roadmap

- [X] Speed up panning (fps to 30 on a MBA).
- [X] Zoom.
- [X] d3-eqsue API.
- [ ] Better events: pass more information in the `position` argument to event handlers.
- [ ] Display data (line chart, bar chart, box plot, tbd) alongside the kareogram. 
- [ ] Aesthetic customization (bands, cytobands) and tweaks.
- [ ] Tooltip & data display, associated customization.
- [ ] Range selection & highlighting. 
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
        console.log('clicked at ' + position.absBp);
      })
      .on('mouseover', function(position) {
        console.log(position.absBp);
      });
      .on('drag', function(position) {
        console.log(position.absBp);
      });
      .on('zoom', function(position) {
        console.log(position.absBp);
      });

  d3.select('body')
      .datum(data)
      .call(kgram);
});
```
