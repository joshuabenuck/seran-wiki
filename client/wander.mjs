// Copyright Eric Dobbs
// Check with him for licensing restrictions

function handleClick(dom, selector, fn) {
  dom.querySelectorAll(selector).forEach(el => el.addEventListener('click', fn))
}

export class TurtleWander extends HTMLElement {
  connectedCallback() {
    if (this.inited) return;
    this.inited = true;
    let shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `
    <style type="text/css">
            :host {
                display: block;
            }

            body {min-height: 400px;}
            canvas {border: 1px solid black;}
            .tracks {margin-bottom: 5px;}
            .controls a {margin-right: 4px;}
    </style>
    <div class="tracks"><canvas width="300" height="250" class="turtle"></canvas></div>
    <div class="controls"><!--

    --><a href="" class="link-turtle-turn-left"><canvas width="32" height="32" class="turtle-turn-left"></canvas></a><!--

    --><a href="" class="link-turtle-move"><canvas width="32" height="32" class="turtle-move"></canvas></a><!--

    --><a href="" class="link-turtle-turn-right"><canvas width="32" height="32" class="turtle-turn-right"></canvas></a><!--

    --><a href="" class="link-turtle-setmovesize"><canvas width="32" height="32" class="turtle-setmovesize"></canvas></a><!--

    --><a href="" class="link-turtle-setturnsize-numerator"><canvas width="32" height="32" class="turtle-setturnsize-numerator"></canvas></a><!--

    --><a href="" class="link-turtle-setturnsize-denominator"><canvas width="32" height="32" class="turtle-setturnsize-denominator"></canvas></a><!--

    --><a href="" class="link-turtle-clear"><canvas width="32" height="32" class="turtle-clear"></canvas></a><!--

    --><a href="" class="link-turtle-save-history"><canvas width="32" height="32" class="turtle-save-history"></canvas></a><!--

    --></div>
    <div class="history controls">
    </div>
        `;
    turtlespace.initialize_ui(shadow);
    turtlespace.update_ui(shadow);
  }

  render(json) {
  }
}
registerPlugin("turtle-wander", TurtleWander);

var turtlespace = {
  named: {
    origin: {
      name: "origin",
      x: 0,
      y: 0,
      direction: -Math.PI / 2,
      pensize: 1,
      pencolor: "black",
      movesize: 30,
      turnsize: Math.PI / 3,
      turnsize_numerator: 1,
      turnsize_denominator: 6
    },
    controls: {
      movesize: 30,
      movesize_options: [],
      turnsize: Math.PI / 3,
      turnsize_numerator: 1,
      turnsize_numerator_options: [],
      turnsize_denominator: 6,
      turnsize_denominator_options: [],
      pensize: 1,
      pencolor: "black"
    }
  },

  history: {},

  change: function change(that, fields, fn, args) {
    if (typeof fields.x !== "undefined") {
      that.x = parseFloat(fields.x);
    }
    if (typeof fields.y !== "undefined") {
      that.y = parseFloat(fields.y);
    }
    if (typeof fields.direction !== "undefined") {
      var newdirection = parseFloat(fields.direction);
      var circumference = parseFloat(2 * Math.PI);
      while (newdirection > circumference) {
        newdirection = newdirection - circumference;
      }
      while (newdirection < 0) {
        newdirection = newdirection + circumference;
      }
      that.direction = newdirection;
    }
  },

  saveAnd: function saveAnd(fn, that, args) {
    var before = Object.assign({}, that);
    args = Array.isArray(args) ? args : [args];
    fn.apply(undefined, [that].concat(args));
    var moment = {
      fn: fn,
      args: args,
      beforestate: {
        x: before.x,
        y: before.y,
        direction: before.direction
      },
      state: {
        x: that.x,
        y: that.y,
        direction: that.direction
      }
    };
    turtlespace.history[before.name].unshift(moment);
    turtlespace.history[COMMAND_BUFFER].unshift(moment);
  },

  change_controls: function change_controls(that, fields) {
    if (fields.movesize) {
      that.movesize = parseFloat(fields.movesize);
    }
    if (fields.movesize_options) {
      that.movesize_options = fields.movesize_options;
    }
    if (fields.turnsize_numerator_options) {
      that.turnsize_numerator_options = fields.turnsize_numerator_options;
    }
    if (fields.turnsize_denominator_options) {
      that.turnsize_denominator_options = fields.turnsize_denominator_options;
    }

    var numerator = parseFloat(fields.turnsize_numerator);
    var denominator = parseFloat(fields.turnsize_denominator);
    if (!isNaN(numerator) && !isNaN(denominator) && denominator != 0) {
      that.turnsize_denominator = denominator;
      that.turnsize_numerator = (numerator || 1);
      that.turnsize = 2 * Math.PI * that.turnsize_numerator /
        that.turnsize_denominator;
    }
    if (fields.turnsize) {
      that.turnsize = parseFloat(fields.turnsize);
    }
    for (var key in turtlespace.named.origin) {
      if (that[key] instanceof Function) {
        continue;
      }
      turtlespace.named[that.name][key] = that[key];
    }
  },

  move: function move(that, pixels) {
    var p = parseFloat(pixels);
    turtlespace.change(that, {
      x: Math.cos(that.direction) * p + that.x,
      y: Math.sin(that.direction) * p + that.y
    }, turtlespace.move, [pixels]);
    if (that.after_move && that.after_move.call) {
      that.after_move(that);
    }
    return that;
  },

  turn: function turn(that, radians) {
    turtlespace.change(that, {
      direction: that.direction + parseFloat(radians)
    }, turtlespace.turn, [radians]);
    return that;
  },

  setmovesize: function setmovesize(that, pixels) {
    turtlespace.change_controls(that, { movesize: pixels });
    return that;
  },

  setturnsize_numerator_denominator:
    function setturnsize_numerator_denominator(
      that,
      numerator,
      denominator
    ) {
      turtlespace.change_controls(that, {
        turnsize_numerator: numerator || that.turnsize_numerator,
        turnsize_denominator: denominator || that.turnsize_denominator
      });
    },

  turtle: function turtle(options) {
    if (!options) {
      options = {};
    }
    if (!options.name) {
      options.name = "c_turtle_" + (Object.keys(turtlespace.named).length + 1);
    }
    var that = turtlespace.named[options.name] ||
      Object.assign({}, turtlespace.named.origin);
    Object.assign(that, options);
    if (turtlespace.named[that.name] === undefined) {
      turtlespace.named[that.name] = that;
    }
    if (turtlespace.history[that.name] === undefined) {
      turtlespace.history[that.name] = [];
    }
    Object.assign(that, {
      change: function change(fields) {
        turtlespace.saveAnd(turtlespace.change, that, fields);
      },
      move: function move(pixels) {
        turtlespace.saveAnd(turtlespace.move, that, pixels);
        return that;
      },
      turn: function turn(radians) {
        turtlespace.saveAnd(turtlespace.turn, that, radians);
        return that;
      }
    });
    return that;
  },

  controls: function controls(options) {
    if (!options) {
      options = {};
    }
    if (!options.name) {
      options.name = "controls";
    }
    var that = Object.assign(
      {},
      turtlespace.named[options.name] || {},
      options
    );
    if (turtlespace.named[that.name] === undefined) {
      turtlespace.named[that.name] = Object.assign({}, that);
    }
    Object.assign(that, {
      change: function change(fields) {
        turtlespace.change_controls(that, fields);
      },
      next_movesize: function next_movesize() {
        var current = that.movesize;
        var options = [].concat(that.movesize_options);
        for (var i = 0, j = 1; i < options.length; i++, j++) {
          if (current != parseInt(options[i])) {
            continue;
          }
          turtlespace.setmovesize(that, options[j] || options[0]);
          break;
        }
      },
      next_turnsize_numerator: function next_turnsize_numerator() {
        var current = that.turnsize_numerator;
        var options = [].concat(that.turnsize_numerator_options);
        for (var i = 0, j = 1; i < options.length; i++, j++) {
          if (options[i] == that.turnsize_denominator) {
            turtlespace.setturnsize_numerator_denominator(that, options[0]);
            break;
          }
          if (current != parseInt(options[i])) {
            continue;
          }
          turtlespace.setturnsize_numerator_denominator(
            that,
            options[j] || options[0]
          );
          break;
        }
      },
      next_turnsize_denominator: function next_turnsize_denominator() {
        var current = that.turnsize_denominator;
        var options = [].concat(that.turnsize_denominator_options);
        for (var i = 0, j = 1; i < options.length; i++, j++) {
          if (current != parseInt(options[i])) {
            continue;
          }
          turtlespace.setturnsize_numerator_denominator(
            that,
            undefined,
            options[j] || options[0]
          );
          if (that.turnsize_denominator < that.turnsize_numerator) {
            turtlespace.setturnsize_numerator_denominator(that, 1);
          }
          break;
        }
      }
    });
    return that;
  },

  save_history: function save_history(that, name) {
    turtlespace.history[name] = [].concat(turtlespace.history[that.name]);
  },

  repeat_history: function repeat_history(that, name) {
    history_iter(name, function(moment) {
      var args = [that].concat(moment.args);
      moment.fn.apply(undefined, args);
    });
  },

  update_ui: function update_ui(shadow) {
    var controls = turtlespace.controls();
    function drawTurtleShape(context, turtle_name) {
      var position = turtlespace.history[turtle_name][0];
      if (position) {
        context.translate(position.state.x, position.state.y);
        context.rotate(position.state.direction);
      } else {
        context.translate(
          turtlespace.named.origin.x,
          turtlespace.named.origin.y
        );
        context.rotate(turtlespace.named.origin.direction);
      }
      var nudge = 4;
      context.beginPath();
      context.moveTo(0 - nudge, 0);
      context.lineTo(0 - nudge, 5);
      context.lineTo(13 - nudge, 0);
      context.lineTo(0 - nudge, -5);
      context.closePath();
      context.stroke();
    }
    function turtlePathBoundingBox(turtle_name) {
      var MAXINT = Math.pow(2, 52); // intentionally half the max allowed by ECMAscript
      var Xmin = 0, Ymin = 0, Xmax = 0, Ymax = 0;
      var visitor = Object.assign({}, turtlespace.named.origin, {
        name: "turtlePathBoundingBoxVisitor",
        after_move: function after_move(that) {
          Xmin = Math.min(Math.ceil(that.x), Xmin);
          Ymin = Math.min(Math.ceil(that.y), Ymin);
          Xmax = Math.max(Math.floor(that.x), Xmax);
          Ymax = Math.max(Math.floor(that.y), Ymax);
        }
      });
      turtlespace.repeat_history(visitor, turtle_name);
      return { Xmin: Xmin, Ymin: Ymin, Xmax: Xmax, Ymax: Ymax };
    }
    function drawTurtlePathIcon(context, turtle_name) {
      var boundaries = turtlePathBoundingBox(turtle_name);
      var canvas = context.canvas;
      var padding = 30;
      var width = padding + boundaries["Xmax"] - boundaries["Xmin"];
      var height = padding + boundaries["Ymax"] - boundaries["Ymin"];
      var scale = Math.max(canvas.width, canvas.height) /
        Math.max(width, height);
      context.save();
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.scale(scale, scale);
      context.translate(
        -(boundaries["Xmin"] - padding / 2) +
          Math.max((height - width) / 2, 0),
        -(boundaries["Ymin"] - padding / 2) + Math.max((width - height) / 2, 0)
      );
      context.beginPath();
      context.lineWidth = 1 / scale;
      context.moveTo(0, 0);
      var pen = Object.assign({}, turtlespace.named.origin, {
        name: "turtle_icon_pen",
        after_move: function after_move(that) {
          context.lineTo(that.x, that.y);
        }
      });
      turtlespace.repeat_history(pen, turtle_name);
      context.stroke();
      drawTurtleShape(context, turtle_name);
      context.restore();
    }
    function drawTurtlePath(context, turtle_name) {
      if (!turtle_name) {
        turtle_name = "turtle";
      }
      var canvas = context.canvas;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.translate(canvas.width / 2, canvas.height / 2);
      context.beginPath();
      context.moveTo(0, 0);
      var pen = Object.assign({}, turtlespace.named.origin, {
        name: "turtle_pen",
        after_move: function after_move(that) {
          context.lineTo(that.x, that.y);
        }
      });
      turtlespace.repeat_history(pen, turtle_name);
      context.stroke();
      drawTurtleShape(context, turtle_name);
      context.restore();
    }
    function drawTurnsizeNumerator(context) {
      var radius = context.canvas.height / 2 - 2;
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(
        0,
        0,
        radius,
        0,
        2 * Math.PI * controls.turnsize_numerator /
          controls.turnsize_denominator
      );
      context.fillStyle = "#777";
      context.fill();
    }
    function drawTurnsizeDenominator(context) {
      var radius = context.canvas.height / 2 - 2;
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, radius, 0, 2 * Math.PI);
      context.closePath();
      for (var i = 0; i < controls.turnsize_denominator; i++) {
        context.moveTo(0, 0);
        context.lineTo(
          radius * Math.cos(i * 2 * Math.PI / controls.turnsize_denominator),
          radius * Math.sin(i * 2 * Math.PI / controls.turnsize_denominator)
        );
      }
      context.strokeStyle = "#aaa";
      context.stroke();
    }
    function drawTurnsize(context) {
      drawTurnsizeNumerator(context);
      drawTurnsizeDenominator(context);
    }
    function withTurnTransform(context, x, fn, flipVertical) {
      var canvas = context.canvas;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.translate(canvas.width / 2, canvas.height / 2);
      if (flipVertical) {
        context.scale(-1, 1);
      }
      context.rotate(-Math.PI / 2);
      fn(context);
      context.restore();
    }
    function drawHistories(history) {
      var turtle = turtlespace.named.turtle;
      history.innerHTML = "";
      for (var turtle_name in turtlespace.history) {
        if (turtlespace.named[turtle_name] &&
          turtlespace.named[turtle_name].exclude_from_draw_histories)
        {
          continue;
        }
        var moment = document.createElement("a");
        moment.setAttribute("href", "");
        moment.setAttribute("class", `turtle-play ${turtle_name}`);
        moment.setAttribute("data-turtle-name", turtle_name);
        moment.innerHTML = '<canvas width="32" height="32"></canvas>'
        var context = moment.querySelector("canvas").getContext("2d");
        drawTurtlePathIcon(context, turtle_name);
        history.appendChild(moment);
      }
      handleClick(shadow, "a.turtle-play", event => {
        event.preventDefault();
        let {turtleName} = event.target.parentElement.dataset
        turtlespace.saveAnd(
          turtlespace.repeat_history,
          turtlespace.named.turtle,
          [turtleName, 0]
        );
        turtlespace.update_ui(shadow);
        return false;
      });
    }
    function drawMove(context) {
      var moment = turtlespace.history.turtleMoveControl[0];
      moment.args[0] = turtlespace.named.controls.movesize;
      moment.state.y = -turtlespace.named.controls.movesize;
      drawTurtlePathIcon(context, "turtleMoveControl");
    }

    drawMove(
      shadow.querySelector(".controls canvas.turtle-move").getContext("2d")
    );

    var right = shadow.querySelector(".controls canvas.turtle-turn-right");
    withTurnTransform(right.getContext("2d"), 0, drawTurnsize);

    var left = shadow.querySelector(".controls canvas.turtle-turn-left");
    withTurnTransform(left.getContext("2d"), left.width, drawTurnsize, true);

    var numerator = shadow.querySelector(".controls canvas.turtle-setturnsize-numerator");
    withTurnTransform(numerator.getContext("2d"), 8, drawTurnsizeNumerator);

    var denominator = shadow.querySelector(".controls canvas.turtle-setturnsize-denominator");
    withTurnTransform(
      denominator.getContext("2d"),
      8,
      drawTurnsizeDenominator
    );

    var playground = shadow.querySelector(".tracks .turtle");
    drawTurtlePath(playground.getContext("2d"));

    drawHistories(shadow.querySelector(".history"));

    function textButton(text, context) {
      context.clearRect(0, 0, context.canvas.width, context.canvas.height);
      context.textAlign = "center";
      context.strokeText(text, 16, 20);
    }

    textButton(
      turtlespace.named.controls.movesize,
      shadow.querySelector(".controls canvas.turtle-setmovesize").getContext(
        "2d"
      )
    );
    textButton(
      "clear",
      shadow.querySelector(".controls canvas.turtle-clear").getContext("2d")
    );
    drawTurtlePathIcon(
      shadow.querySelector(".controls canvas.turtle-save-history").getContext(
        "2d"
      ),
      "turtle"
    );
  },

  initialize_ui: function initialize_ui(shadow) {
    var turtle = turtlespace.turtle({ name: "turtle" });
    turtlespace.named[COMMAND_BUFFER] = Object.assign(
      {},
      turtlespace.named.origin,
      {
        name: COMMAND_BUFFER,
        exclude_from_draw_histories: true
      }
    );
    turtlespace.named.turtle.exclude_from_draw_histories = true;
    turtlespace.history[COMMAND_BUFFER] = [];
    turtlespace.named.controls.turnsize_numerator_options = [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16
    ];
    turtlespace.named.controls.turnsize_denominator_options = [
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16
    ];
    turtlespace.named.controls.movesize_options = [
      5,
      10,
      15,
      20,
      25,
      30,
      35,
      40,
      45,
      50,
      55,
      60,
      65,
      70,
      75,
      80
    ];
    var moveButtonVisitor = turtlespace.named.turtleMoveControl;
    if (!moveButtonVisitor) {
      moveButtonVisitor = turtlespace.turtle({
        name: "turtleMoveControl",
        exclude_from_draw_histories: true
      });
      var cbh = turtlespace.history[COMMAND_BUFFER];
      turtlespace.history[COMMAND_BUFFER] = [];
      moveButtonVisitor.move(turtlespace.named.controls.movesize);
      turtlespace.history[COMMAND_BUFFER] = cbh;
    }
    var controls = turtlespace.controls();
    handleClick(shadow, ".controls .link-turtle-move", event => {
      event.preventDefault();
      turtle.move(controls.movesize);
      turtlespace.update_ui(shadow);
      return false;
    });
    handleClick(shadow, ".controls .link-turtle-turn-left", event => {
      event.preventDefault();
      turtle.turn(-controls.turnsize);
      turtlespace.update_ui(shadow);
      return false;
    });
    handleClick(shadow, ".controls .link-turtle-turn-right", event => {
      event.preventDefault();
      turtle.turn(controls.turnsize);
      turtlespace.update_ui(shadow);
      return false;
    });
    handleClick(shadow, ".controls .link-turtle-setmovesize", event => {
      event.preventDefault();
      controls.next_movesize();
      turtlespace.update_ui(shadow);
      return false;
    });
    handleClick(shadow, ".controls .link-turtle-setturnsize-numerator", event => {
      event.preventDefault();
      controls.next_turnsize_numerator();
      turtlespace.update_ui(shadow);
      return false;
    });
    handleClick(shadow, ".controls .link-turtle-setturnsize-denominator", event =>{
      event.preventDefault();
      controls.next_turnsize_denominator();
      turtlespace.update_ui(shadow);
      return false;
    });
    handleClick(shadow, ".controls .link-turtle-clear", event => {
      event.preventDefault();
      var canvas = shadow.querySelector(".tracks .turtle");
      var context = canvas.getContext("2d");
      turtlespace.change(turtlespace.named.turtle, {
        x: turtlespace.named.origin.x,
        y: turtlespace.named.origin.y,
        direction: turtlespace.named.origin.direction
      });
      turtlespace.history.turtle = [];
      turtlespace.history[COMMAND_BUFFER] = [];
      turtlespace.update_ui(shadow);
      return false;
    });
    handleClick(shadow, ".controls .link-turtle-save-history", event => {
      event.preventDefault();
      var count = Object.keys(turtlespace.history).length;
      turtlespace.save_history({ name: COMMAND_BUFFER }, "turtle_" + count);
      turtlespace.update_ui(shadow);
      return false;
    });
  }
};

var COMMAND_BUFFER = "command_buffer";

function history_iter(name, fn, prepareFn, concludeFn) {
  var history = turtlespace.history[name];
  if (prepareFn && typeof prepareFn.call != "undefined") {
    prepareFn();
  }
  for (var i = history.length; --i >= 0;) {
    fn(history[i]);
  }
  if (concludeFn && typeof concludeFn.call != "undefined") {
    concludeFn();
  }
}
