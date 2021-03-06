'use strict';

var fs = require('fs');
var assert = require('chai').assert;
var Bounds = require('../src/util/Bounds');
var Renderer = require('../src/render/svg').string.Renderer;
var Util = require('../src/util/scene');
var res = './test/resources/';

var GENERATE = require('./resources/generate-tests');

function generate(path, str) {
  if (GENERATE) fs.writeFileSync(res + path, str);
}

function load(file) {
  return fs.readFileSync(res + file, 'utf8');
}

function loadScene(file) {
  return Util.fromJSON(load(file));
}

function render(scene, w, h) {
  return new Renderer()
    .initialize(null, w, h)
    .render(scene)
    .svg();
}

describe('svg-string renderer', function() {
  var r = new Renderer();
  var marks = JSON.parse(load('marks.json'));
  for (var name in marks) { Util.fromJSON(marks[name]); }

  it('should build empty group for item-less area mark', function() {
    var str = r.reset().mark({marktype: 'area', items:[]});
    generate('svg/marks-itemless-area.svg', str);
    var test = load('svg/marks-itemless-area.svg');
    assert.strictEqual(str, test);
  });

  it('should build empty group for item-less line mark', function() {
    var str = r.reset().mark({marktype: 'line', items:[]});
    generate('svg/marks-itemless-line.svg', str);
    var test = load('svg/marks-itemless-line.svg');
    assert.strictEqual(str, test);
  });

  // ----

  it('should render scenegraph to SVG string', function() {
    var scene = loadScene('scenegraph-rect.json');
    var str = render(scene, 400, 200);
    generate('svg/scenegraph-rect.svg', str);
    var test = load('svg/scenegraph-rect.svg');
    assert.strictEqual(str, test);
  });

  it('should support clipping and gradients', function() {
    var scene = loadScene('scenegraph-defs.json');
    var str = render(scene, 102, 102);
    generate('svg/scenegraph-defs.svg', str);
    var test = load('svg/scenegraph-defs.svg');
    assert.strictEqual(str, test);

    var scene2 = loadScene('scenegraph-defs.json');
    delete scene2.items[0].clip;
    scene2.items[0].fill = 'red';
    str = render(scene2, 102, 102);
    generate('svg/scenegraph-defs2.svg', str);
    test = load('svg/scenegraph-defs2.svg');
    assert.strictEqual(str, test);
  });

  it('should support axes, legends and sub-groups', function() {
    var scene = loadScene('scenegraph-barley.json');
    var str = render(scene, 360, 740);
    generate('svg/scenegraph-barley.svg', str);
    var test = load('svg/scenegraph-barley.svg');
    assert.equal(str, test);
  });

  it('should support full redraw', function() {
    var scene = loadScene('scenegraph-rect.json');
    var r = new Renderer()
      .initialize(null, 400, 200)
      .background('white')
      .render(scene);

    var mark = scene.items[0].items[0].items;
    var rect = mark[1]; rect.fill = 'red'; rect.width *= 2;
    mark.push({
      mark:mark, x:0, y:0, width:10, height:10, fill:'purple'
    });
    r.render(scene);
  
    var str = r.svg();
    generate('svg/scenegraph-full-redraw.svg', str);
    var test = load('svg/scenegraph-full-redraw.svg');
    assert.equal(str, test);

    mark.pop();
    r.render(scene);

    str = r.svg();
    generate('svg/scenegraph-single-redraw.svg', str);
    test = load('svg/scenegraph-single-redraw.svg');
    assert.equal(str, test);
  });

  it('should support enter-item redraw', function() {
    var scene = loadScene('scenegraph-rect.json');
    var r = new Renderer()
      .initialize(null, 400, 200)
      .background('white')
      .render(scene);

    var rects = scene.items[0].items[0];

    var rect1 = {x:10, y:10, width:50, height:50, fill:'red'};
    rect1.mark = rects;
    rect1.bounds = new Bounds().set(10, 10, 60, 60);
    rects.items.push(rect1);

    var rect2 = {x:70, y:10, width:50, height:50, fill:'blue'};
    rect2.mark = rects;
    rect2.bounds = new Bounds().set(70, 10, 120, 60);
    rects.items.push(rect2);

    var str = r.render(scene, [rect1, rect2]).svg();
    generate('svg/scenegraph-enter-redraw.svg', str);
    var test = load('svg/scenegraph-enter-redraw.svg');
    assert.equal(str, test);
  });

  it('should support exit-item redraw', function() {
    var scene = loadScene('scenegraph-rect.json');
    var r = new Renderer()
      .initialize(null, 400, 200)
      .background('white')
      .render(scene);
  
    var rect = scene.items[0].items[0].items.pop();
    rect.status = 'exit';
    r.render(scene, [rect]);
  
    var str = r.svg();
    generate('svg/scenegraph-exit-redraw.svg', str);
    var test = load('svg/scenegraph-exit-redraw.svg');
    assert.equal(str, test);
  });

  it('should support single-item redraw', function() {
    var scene = loadScene('scenegraph-rect.json');
    var r = new Renderer()
      .initialize(null, 400, 200)
      .background('white')
      .render(scene);
  
    var rect = scene.items[0].items[0].items[1];
    rect.fill = 'red';
    rect.width *= 2;
    r.render(scene, [rect]);
  
    var str = r.svg();
    generate('svg/scenegraph-single-redraw.svg', str);
    var test = load('svg/scenegraph-single-redraw.svg');
    assert.equal(str, test);
  });

  it('should support multi-item redraw', function() {
    var scene = Util.fromJSON(Util.toJSON(marks['line-1']));
    var r = new Renderer()
      .initialize(null, 400, 400)
      .background('white')
      .render(scene);

    var line1 = scene.items[1]; line1.y = 5;                        // update
    var line2 = scene.items.splice(2, 1)[0]; line2.status = 'exit'; // exit
    var line3 = {x:400, y:200}; line3.mark = scene;                 // enter
    scene.items.push(line3);

    var str = r.render(scene, [line1, line2, line3]).svg();
    generate('svg/scenegraph-line-redraw.svg', str);
    var test = load('svg/scenegraph-line-redraw.svg');
    assert.equal(str, test);
  });

  it('should support enter-group redraw', function() {
    var scene = loadScene('scenegraph-barley.json');
    var r = new Renderer()
      .initialize(null, 500, 600)
      .background('white')
      .render(scene);

    var group = Util.fromJSON(Util.toJSON(scene.items[0]));
    group.x = 200;
    group.mark = scene;
    scene.items.push(group);

    var str = r.render(scene, [group]).svg();
    generate('svg/scenegraph-enter-group-redraw.svg', str);
    var test = load('svg/scenegraph-enter-group-redraw.svg');
    assert.equal(str, test);
  });

  it('should handle empty item sets', function() {
    var scene = {marktype:'', items:[]};
    var types = [
      'arc',
      'area',
      'group',
      'image',
      'line',
      'path',
      'rect',
      'rule',
      'symbol',
      'text'
    ];
    var test, str;
    
    for (var i=0; i<types.length; ++i) {
      scene.marktype = types[i];
      test = 'svg/marks-empty-' + types[i] + '.svg';
      str = render(scene, 500, 500);
      generate(test, str);
      assert.equal(str, load(test));
    }
  });

  // ---

  it('should render arc mark', function() {
    var svg = render(marks.arc, 500, 500);
    generate('svg/marks-arc.svg', svg);
    var test = load('svg/marks-arc.svg');
    assert.equal(svg, test);
  });

  it('should render horizontal area mark', function() {
    var svg = render(marks['area-h'], 500, 500);
    generate('svg/marks-area-h.svg', svg);
    var test = load('svg/marks-area-h.svg');
    assert.equal(svg, test);
  });

  it('should render vertical area mark', function() {
    var svg = render(marks['area-v'], 500, 500);
    generate('svg/marks-area-v.svg', svg);
    var test = load('svg/marks-area-v.svg');
    assert.equal(svg, test);
  });

  it('should render group mark', function() {
    var svg = render(marks.group, 500, 500);
    generate('svg/marks-group.svg', svg);
    var test = load('svg/marks-group.svg');
    assert.equal(svg, test);
  });

  it('should render image mark', function() {
    var svg = render(marks.image, 500, 500);
    generate('svg/marks-image.svg', svg);
    var test = load('svg/marks-image.svg');
    assert.equal(svg, test);
  });

  it('should render line mark', function() {
    var svg = render(marks['line-1'], 500, 500);
    generate('svg/marks-line-1.svg', svg);
    var test = load('svg/marks-line-1.svg');
    assert.equal(svg, test);
  
    svg = render(marks['line-2'], 500, 500);
    generate('svg/marks-line-2.svg', svg);
    test = load('svg/marks-line-2.svg');
    assert.equal(svg, test);
  });

  it('should render path mark', function() {
    var svg = render(marks.path, 500, 500);
    generate('svg/marks-path.svg', svg);
    var test = load('svg/marks-path.svg');
    assert.equal(svg, test);
  });

  it('should render rect mark', function() {
    var svg = render(marks.rect, 500, 500);
    generate('svg/marks-rect.svg', svg);
    var test = load('svg/marks-rect.svg');
    assert.equal(svg, test);
  });

  it('should render rule mark', function() {
    var svg = render(marks.rule, 500, 500);
    generate('svg/marks-rule.svg', svg);
    var test = load('svg/marks-rule.svg');
    assert.equal(svg, test);
  });

  it('should render symbol mark', function() {
    var svg = render(marks.symbol, 500, 500);
    generate('svg/marks-symbol.svg', svg);
    var test = load('svg/marks-symbol.svg');
    assert.equal(svg, test);
  });

  it('should render text mark', function() {
    var svg = render(marks.text, 500, 500);
    generate('svg/marks-text.svg', svg);
    var test = load('svg/marks-text.svg');
    assert.equal(svg, test);
  });

});