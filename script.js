(function (document, window) {
  "use strict";

  var sin = Math.sin,
    cos = Math.cos,
    pi = Math.PI;

  var map = function (object, f) {
    var out = {};
    Object.keys(object).forEach(function (key) {
      out[key] = f(object[key], key);
    });
    return out;
  };

  var mapp = function (array, f) {
    var out = {};
    Object.keys(array).forEach(function (key) {
      out[array[key]] = f(array[key], key);
    });
    return out;
  };

  var list = function (α, β) {
    var out = new Array(β - α),
      i = 0;
    while (α <= β) out[i++] = α++;
    return out;
  };

  var mergeObjects = function () {
    var out = {};
    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      if (!object) continue;
      Object.keys(object).forEach(function (property) {
        out[property] = object[property];
      });
    }
    return out;
  };

  // flattenArray([ [ a, b ], c ])  ->  [ a, b, c ]
  var flattenArray = function (array) {
    return [].concat.apply([], array);
  };

  var animate = function (minTimeDelta, numSamples, func, fpsFunc) {
    var stop = true;
    var samples = 0,
      sampleTimeDelta = 0,
      fps = 0;
    var speed = 0;
    var time = 0;
    var requestFrame = function (prev, now) {
      if (now - prev >= minTimeDelta) {
        time += (now - prev) * speed;
        sampleTimeDelta += now - prev;
        if (++samples >= numSamples) {
          fps = (numSamples * 1e3) / sampleTimeDelta;
          samples = 0;
          sampleTimeDelta = 0;
          if (fpsFunc) fpsFunc(fps);
        }
        func(prev, time, fps);
        prev = now;
      }
      if (stop) {
        samples = 0;
        sampleTimeDelta = 0;
        fps = 0;
      } else
        window.requestAnimationFrame(function (next) {
          requestFrame(prev, next);
        });
    };
    return {
      getFPS: function () {
        return fps;
      },
      stop: function () {
        stop = true;
        speed = 0;
      },
      start: function () {
        window.requestAnimationFrame(function (time) {
          stop = false;
          speed = 1;
          requestFrame(time, time);
        });
        return this;
      },
      setSpeed: function (s) {
        speed = s;
      },
      getSpeed: function () {
        return speed;
      },
    };
  };

  var getPath = function (planet, target) {
    if (planet === target) return planet.name;

    var path;

    if (
      planet.satellites &&
      planet.satellites.some(function (satellite) {
        path = getPath(satellite, target);
        return path;
      })
    )
      return planet.name + "/" + path;
  };

  function getParent(planet, target, p) {
    if (planet === target) return p;

    var path;

    if (
      planet.satellites &&
      planet.satellites.some(function (satellite) {
        p = getParent(satellite, target, planet);
        return p;
      })
    )
      return p;
  }

  var getHTML = function (sun, planet) {
    const parent = getParent(sun, planet);
    var html = "";
    html += "<div class=planet>";
    if (parent)
      html +=
        '<div class=parent><a href="#' +
        getPath(sun, parent) +
        '">&lt;' +
        (parent.name_zh || "") +
        "</a></div>";
    html +=
      '<div class=name><a href="#' +
      getPath(sun, planet) +
      '">' +
      (planet.name_zh || "") +
      "</a></div>";
    html += "<dl>";
    html += [
      ["luminosity", "光照"],
      ["radius", "半径"],
      ["rotationPeriod", "自转周期"],
      ["orbitalPeriod", "公转周期"],
    ]
      .map(function (key) {
        if (planet[key[0]] === undefined) return "";
        return (
          "<dt>" +
          key[1] +
          "</dt><dd>" +
          planet[key[0]].toPrecision(4) +
          "</dd>"
        );
      })
      .join("");

    if (planet.satellites && planet.satellites.length > 0) {
      html += "<dt>公转星体</dt><dd>";
      html += "<ol class=satellites>";
      //html += Object.keys(planet.satellites).map(function (key) { return getHTML(sun, planet.satellites[key]); }).join("");
      html += Object.keys(planet.satellites)
        .map((key) => {
          return (
            '<li><a href="#' +
            getPath(sun, planet.satellites[key]) +
            '">' +
            planet.satellites[key].name_zh +
            "</a></li>"
          );
        })
        .join("");

      html += "</ol></dd>";
    }

    html += "</dl>";

    html += "</div>";
    return html;
  };

  var loadFiles = function (files, onLoad) {
    var out = {};
    var loadFile = function (files) {
      var keys = Object.keys(files);
      var key = keys[0];
      if (keys.length === 0) return false;

      var ajax = new XMLHttpRequest();
      ajax.open("GET", files[key], true);
      delete files[key];
      ajax.onload = function () {
        out[key] = ajax.responseText;

        if (!loadFile(files)) onLoad(out);
      };
      ajax.send();

      return true;
    };
    loadFile(files);
  };

  var loadImages = function (textures, onLoad) {
    var out = {};
    var loadImage = function (textures) {
      var keys = Object.keys(textures);
      var name = keys[0];
      if (keys.length === 0) return false;

      var imagesrc = textures[name];
      delete textures[name];

      var image = new Image();
      image.onload = function () {
        out[name] = image;
        if (!loadImage(textures)) onLoad(out);
      };
      image.src = imagesrc;
      return true;
    };
    loadImage(textures);
  };

  var loadTextures = function (gl, textures) {
    return map(textures, function (image, name) {
      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR
      );
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.bindTexture(gl.TEXTURE_2D, null);
      texture.ready = true;
      return texture;
    });
  };

  var setUniforms = function (gl, program, data) {
    Object.keys(data).forEach(function (key) {
      if (data[key].type == gl.uniformMatrix4fv)
        gl.uniformMatrix4fv(program.uniforms[key], false, data[key].data);
      else if (data[key].type == gl.uniform1i)
        gl.uniform1i(program.uniforms[key], data[key].data);
      else if (data[key].type == gl.uniform4fv)
        gl.uniform4fv(program.uniforms[key], data[key].data);
    });
  };

  var createPrograms = function (gl, shaders, shaderSources) {
    return map(shaders, function (config, programName) {
      var program = gl.createProgram();

      program.shaders = map(
        {
          vertex: gl.VERTEX_SHADER,
          fragment: gl.FRAGMENT_SHADER,
        },
        function (type, t) {
          if (!config[t]) return;

          var shaderSource = shaderSources[config[t]];
          var shader = gl.createShader(type);
          gl.shaderSource(shader, shaderSource);
          gl.compileShader(shader);
          gl.attachShader(program, shader);

          var log = gl.getShaderInfoLog(shader);
          if (log) console.error(log);
          return shader;
        }
      );

      //link the program
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        return;
      } else
        program.attributes = mapp(config.attributes, function (name) {
          var nameLocation = gl.getAttribLocation(program, name);
          return nameLocation;
        });
      program.uniforms = mapp(config.uniforms, function (name) {
        return gl.getUniformLocation(program, name);
      });

      return program;
    });
  };

  var createBuffer = function (gl, config) {
    config.buffer = gl.createBuffer();

    gl.bindBuffer(config.target, config.buffer);
    gl.bufferData(config.target, config.data, gl.STATIC_DRAW);

    return config;
  };

  var buildSphere = function (gl, program, latitudeBands, longitudeBands) {
    var position = [],
      index = [],
      texture = [];

    //calculate vertex positions
    for (var lat = 0; lat <= latitudeBands; lat++) {
      var θ = (lat * pi) / latitudeBands,
        sinθ = sin(θ),
        cosθ = cos(θ);

      for (var long = 0; long <= longitudeBands; long++) {
        var ϕ = (long * 2 * pi) / longitudeBands;
        position.push(cos(ϕ) * sinθ, cosθ, sin(ϕ) * sinθ);
      }
    }

    //create texture coordinate buffer
    for (var lat = 0; lat <= latitudeBands; lat++) {
      for (var long = 0; long <= longitudeBands; long++) {
        texture.push(long / longitudeBands, lat / latitudeBands);
      }
    }

    //create index buffer
    for (var lat = 0; lat < latitudeBands; lat++) {
      for (var long = 0; long <= longitudeBands; long++)
        index.push(
          (lat + 1) * longitudeBands + long,
          lat * longitudeBands + long
        );
    }

    return {
      numVertices: index.length,
      buffers: {
        vertexPosition: createBuffer(gl, {
          data: new Float32Array(position),
          target: gl.ARRAY_BUFFER,
          itemSize: 3,
        }),
        vertexNormal: createBuffer(gl, {
          data: new Float32Array(position), //position and normal vectors are identical for a unit sphere
          target: gl.ARRAY_BUFFER,
          itemSize: 3,
        }),
        vertexTexture: createBuffer(gl, {
          data: new Float32Array(texture),
          target: gl.ARRAY_BUFFER,
          itemSize: 2,
        }),
        index: createBuffer(gl, {
          data: new Uint16Array(index),
          target: gl.ELEMENT_ARRAY_BUFFER,
          itemSize: 3,
        }),
      },
      indexBuffer: "index",
      program: program,
      uniforms: { Model: { data: mat4.create(), type: gl.uniformMatrix4fv } },
      drawMode: gl.TRIANGLE_STRIP,
    };
  };

  var buildCircle = function (gl, program, segments) {
    var δ = (2 * pi) / segments;
    var positions = list(0, segments - 1).map(function (segment) {
      var θ = δ * segment;
      return [sin(θ), 0, cos(θ)];
    });

    return {
      numVertices: segments,
      buffers: {
        vertexPosition: createBuffer(gl, {
          data: new Float32Array(flattenArray(positions)),
          target: gl.ARRAY_BUFFER,
          itemSize: 3,
        }),
      },
      program: program,
      uniforms: { Model: { data: mat4.create(), type: gl.uniformMatrix4fv } },
      drawMode: gl.LINE_LOOP,
    };
  };

  var drawScene = function (gl, shape, uniforms) {
    var program = shape.program;
    gl.useProgram(program);
    uniforms = mergeObjects(uniforms, shape.uniforms);

    if (shape.textures)
      map(shape.textures, function (texture, name) {
        if (!texture || !texture.ready) return;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        uniforms[name] = { data: 0, type: gl.uniform1i };
      });

    setUniforms(gl, program, uniforms);

    if (shape.alpha) {
      gl.blendFunc(gl.SRC_ALPHA, gl.DST_ALPHA);
      gl.enable(gl.BLEND);
    }

    map(shape.buffers, function (buffer, name) {
      if (name === shape.indexBuffer) return;
      if (program.attributes[name] !== -1) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buffer);
        gl.vertexAttribPointer(
          program.attributes[name],
          buffer.itemSize,
          gl.FLOAT,
          false,
          0,
          0
        );
        gl.enableVertexAttribArray(program.attributes[name]);
      }
    });

    if (shape.indexBuffer) {
      gl.bindBuffer(
        gl.ELEMENT_ARRAY_BUFFER,
        shape.buffers[shape.indexBuffer].buffer
      );
      gl.drawElements(shape.drawMode, shape.numVertices, gl.UNSIGNED_SHORT, 0);
    } else {
      gl.drawArrays(shape.drawMode, 0, shape.numVertices);
    }

    if (shape.alpha) {
      gl.disable(gl.BLEND);
    }
  };

  function MouseDragListener(elem, callback) {
    function scale(point) {
      const rect = elem.getBoundingClientRect();
      const elemSize = [rect.right - rect.left, rect.bottom - rect.top];
      const halfElemSize = [elemSize[0] / 2, elemSize[1] / 2];
      const elemCenter = [
        rect.left + halfElemSize[0],
        rect.top + halfElemSize[1],
      ];
      return {
        x: (point.x - elemCenter[0]) / halfElemSize[0],
        y: -(point.y - elemCenter[1]) / halfElemSize[0],
      };
    }

    let point = undefined;

    elem.addEventListener("mousedown", (evt) => {
      point = scale({ x: evt.clientX, y: evt.clientY });
    });
    elem.addEventListener("mousemove", (evt) => {
      if (point === undefined) return;

      const p = scale({ x: evt.clientX, y: evt.clientY });
      callback(p, point);

      point = p;
    });
    elem.addEventListener("mouseup", (evt) => {
      if (point === undefined) return;

      const p = scale({ x: evt.clientX, y: evt.clientY });
      callback(p, point);

      point = undefined;
    });
  }

  function arcballVector(point) {
    const mSquared = point.x * point.x + point.y * point.y;
    if (mSquared <= 1) {
      return [point.x, point.y, Math.sqrt(1 - mSquared)];
    } else {
      const s = Math.sqrt(mSquared);
      return [point.x / s, point.y / s, 0];
    }
  }

  var main = function (shaderSources, textures) {
    // main()
    var canvas = document.getElementById("canvas");
    var gl = canvas.getContext("webgl2");

    // 确认WebGL支持性
    if (!gl) {
      alert("无法初始化WebGL, 你的浏览器, 操作系统或硬件可能不支持WebGL");
      return;
    }
    gl.enable(gl.DEPTH_TEST);

    let cameraRotation = quat.create();
    MouseDragListener(canvas, (point, lastPoint) => {
      const u = arcballVector(point);
      const v = arcballVector(lastPoint);
      quat.mul(
        cameraRotation,
        quat.rotationTo(quat.create(), v, u),
        cameraRotation
      );
    });
    let cameraZoom = 1;

    let viewDirection = "in";
    const $viewDirection = document.getElementById("viewDirection");
    if ($viewDirection)
      $viewDirection.addEventListener("change", (evt) => {
        viewDirection = $viewDirection.value;
      });

    let rotationLock = "galaxy";
    const $rotationLock = document.getElementById("rotationLock");
    if ($rotationLock)
      $rotationLock.addEventListener("change", (evt) => {
        rotationLock = $rotationLock.value;
      });

    textures = loadTextures(gl, textures);

    var programs = createPrograms(
      gl,
      {
        planet: {
          vertex: "planetVert",
          fragment: "planetFrag",
          attributes: ["vertexPosition", "vertexNormal", "vertexTexture"],
          uniforms: [
            "Model",
            "View",
            "Projection",
            "textureSampler",
            "lightPosition",
            "lightLuminosity",
          ],
        },
        skybox: {
          vertex: "skyboxVert",
          fragment: "skyboxFrag",
          attributes: ["vertexPosition", "vertexNormal", "vertexTexture"],
          uniforms: ["Model", "View", "Projection", "textureSampler"],
        },
        star: {
          vertex: "starVert",
          fragment: "starFrag",
          attributes: ["vertexPosition", "vertexNormal", "vertexTexture"],
          uniforms: ["Model", "View", "Projection", "textureSampler"],
        },
        simple: {
          vertex: "simpleVert",
          fragment: "simpleFrag",
          attributes: ["vertexPosition"],
          uniforms: ["Model", "View", "Projection", "Color"],
        },
      },
      shaderSources
    );

    var uniforms = {
      View: { data: mat4.create(), type: gl.uniformMatrix4fv },
      Projection: { data: mat4.create(), type: gl.uniformMatrix4fv },
      Color: { data: vec4.create(0.2, 0.2, 1.0, 1.0), type: gl.uniform4fv },
    };

    var shapes = {
      planet: buildSphere(gl, programs.planet, 48, 96),
      star: buildSphere(gl, programs.star, 48, 96),
      orbit: buildCircle(gl, programs.simple, 1024),
      halo: buildCircle(gl, programs.simple, 1024),
      skybox: buildSphere(gl, programs.skybox, 48, 96),
    };
    shapes.skybox.textures = { textureSampler: textures.stars };
    shapes.skybox.uniforms = {
      Model: { data: mat4.create(), type: gl.uniformMatrix4fv },
      Projection: {
        data: mat4.perspective(mat4.create(), pi / 2, 1024 / 768, 0.2, 2),
        type: gl.uniformMatrix4fv,
      },
    };
    shapes.halo.uniforms.Color = {
      data: vec4.create(1.0, 0.2, 0.2, 0.6),
      type: gl.uniform4fv,
    };

    var lights = {};

    var scaleDistance = function (d) {
      return Math.cbrt(d);
    };
    var scaleSpeed = function (s) {
      return s === 0 ? 0 : 1 / (Math.cbrt(s) * 1000);
    };

    var sun = {
      name: "Sun",
      name_zh: "太阳",
      luminosity: 3846e23,
      radius: 1392684,
      rotationPeriod: 24.47 * 24,
      orbitalPeriod: 0,
      texture: textures.sun,
      surface: "textures/sun.jpg",
      satellites: [
        {
          name: "Mercury",
          name_zh: "水星",
          radius: 4878 / 2,
          orbitalDistance: 579e5,
          orbitalPeriod: 0.24 * 365,
          rotationPeriod: 58.65,
          texture: textures.mercury,
          surface: "textures/mercury.jpg",
        },
        {
          name: "Venus",
          name_zh: "金星",
          radius: 12104 / 2,
          orbitalDistance: 1082e5,
          rotationPeriod: -243,
          orbitalPeriod: 0.62 * 365,
          tilt: 2.64,
          texture: textures.venus,
          surface: "textures/venus.jpg",
        },
        {
          name: "Earth",
          name_zh: "地球",
          radius: 12756 / 2,
          orbitalDistance: 1496e5,
          orbitalPeriod: 1 * 365,
          rotationPeriod: 1,
          texture: textures.earth,
          tile: 23.44,
          surface: "textures/earth.jpg",
          satellites: [
            {
              name: "Moon",
              name_zh: "月球",
              radius: 1737.1 / 2,
              orbitalDistance: 38e4,
              orbitalPeriod: 27.3,
              rotationPeriod: 0,
              tilt: 6.687,
              texture: textures.moon,
              surface: "textures/moon.jpg",
            },
          ],
        },
        {
          name: "Mars",
          name_zh: "火星",
          orbitalDistance: 2279e5,
          radius: 6787 / 2,
          rotationPeriod: 1.03,
          orbitalPeriod: 1.88 * 365,
          tilt: 25.19,
          texture: textures.mars,
          surface: "textures/mars.jpg",
          satellites: [
            {
              name: "phobos",
              name_zh: "火卫一",
              radius: 11.2667 / 2,
              orbitalDistance: 9400,
              orbitalPeriod: 7.65,
              rotationPeriod: 0,
              surface: "textures/phobos.jpg",
              texture: textures.phobos,
            },
          ],
        },
        {
          name: "Jupiter",
          name_zh: "木星",
          radius: 1427960 / 2,
          orbitalPeriod: 11.86 * 365,
          orbitalDistance: 7783e5,
          rotationPeriod: 0.41,
          tilt: 3.13,
          texture: textures.jupiter,
          surface: "textures/jupiter.jpg",
          //satellites: [ ... ]
        },
        {
          name: "Saturn",
          name_zh: "土星",
          radius: 120660 / 2,
          orbitalDistance: 1427e6,
          orbitalPeriod: 29.46 * 365,
          rotationPeriod: 0.44,
          texture: textures.saturn,
          tilt: 26.73,
          surface: "textures/saturn.jpg",
          //satellites: [ ... ]
        },
        {
          name: "Uranus",
          name_zh: "天王星",
          radius: 51118 / 2,
          orbitalDistance: 2871e6,
          orbitalPeriod: 84.01 * 365,
          rotationPeriod: -0.72,
          tilt: 97.77,
          texture: textures.uranus,
          surface: "textures/uranus.jpg",
          //satellites: [ ... ]
        },
        {
          name: "Neptune",
          name_zh: "海王星",
          radius: 48600 / 2,
          orbitalDistance: 44971e5,
          orbitalPeriod: 164.8 * 365,
          rotationPeriod: 0.72,
          tilt: 28.32,
          texture: textures.neptune,
          surface: "textures/neptune.jpg",
          //satellites: [ ... ]
        },
      ],
    };

    var findPlanet = function (planet, address) {
      var f = function (planet, names) {
        if (planet.name == names[0])
          if (names.length > 1) names.shift();
          else return planet;

        if (planet.satellites) {
          var match;
          planet.satellites.forEach(function (satellite) {
            match = f(satellite, names) || match;
          });
          return match;
        }
      };
      return f(planet, address.split("/"));
    };

    var selected;
    window.onhashchange = function () {
      var hash = window.location.hash.slice(1);
      selected = findPlanet(sun, hash) || findPlanet(sun, "Sun/Earth");
      document.getElementById("info").innerHTML = getHTML(sun, selected || sun);
    };
    window.onhashchange();

    document.getElementById("info").innerHTML = getHTML(sun, selected || sun);

    var draw = function (prev, now, fps) {
      const canvasBoundingRect = canvas.getBoundingClientRect();
      const aspectRatio = canvasBoundingRect.width / canvasBoundingRect.height;

      var updatePlanets = function (planet, parentTransform) {
        parentTransform = parentTransform || {
          position: mat4.create(),
          orbitRotation: mat4.create(),
        };

        planet.transform = {
          position: mat4.clone(parentTransform.position),
          surface: mat4.create(),
          orbit: mat4.create(),
          orbitRotation: mat4.clone(parentTransform.orbitRotation),
          halo: mat4.create(),
          surfaceRotation: mat4.create(),
        };

        if (planet.orbitalPeriod) {
          mat4.rotateY(
            planet.transform.orbitRotation,
            planet.transform.orbitRotation,
            now * scaleSpeed(planet.orbitalPeriod)
          );
        }
        if (planet.orbitalDistance) {
          var orbitalDistance = scaleDistance(planet.orbitalDistance);
          mat4.multiply(
            planet.transform.position,
            planet.transform.position,
            mat4.translate(mat4.create(), planet.transform.orbitRotation, [
              0,
              0,
              orbitalDistance,
            ])
          );

          mat4.scale(planet.transform.orbit, planet.transform.orbit, [
            orbitalDistance,
            orbitalDistance,
            orbitalDistance,
          ]);
          mat4.multiply(
            planet.transform.orbit,
            parentTransform.position,
            planet.transform.orbit
          );
        }
        if (planet.rotationPeriod) {
          mat4.rotateY(
            planet.transform.surfaceRotation,
            planet.transform.surfaceRotation,
            now * scaleSpeed(planet.rotationPeriod)
          );
        }
        if (planet.radius) {
          var radius = scaleDistance(planet.radius);
          mat4.scale(
            planet.transform.surface,
            planet.transform.surfaceRotation,
            [radius, radius, radius]
          );
          mat4.multiply(
            planet.transform.surface,
            planet.transform.position,
            planet.transform.surface
          );
          mat4.scale(planet.transform.halo, planet.transform.position, [
            radius,
            radius,
            radius,
          ]);
        }

        if (planet.satellites)
          planet.satellites.forEach(function (satellite) {
            updatePlanets(satellite, planet.transform);
          });
      };

      var systemRadius = function (planet) {
        var r = planet.radius;
        if (planet.satellites)
          planet.satellites.forEach(function (satellite) {
            if (satellite.orbitalDistance > r) r = satellite.orbitalDistance;
          });
        return r;
      };

      var setUniforms = function (planet) {
        if (planet === selected) {
          var planetPosition = vec3.transformMat4(
            vec3.create(),
            [0, 0, 0],
            planet.transform.position
          );
          var r = systemRadius(planet) * 0.4 + planet.radius * 0.6;
          const rotation = mat4.fromQuat(mat4.create(), cameraRotation);
          const translation = mat4.fromTranslation(
            mat4.create(),
            vec3.sub(vec3.create(), vec3.create(), planetPosition)
          );
          const offset = mat4.fromTranslation(mat4.create(), [
            0,
            0,
            -scaleDistance((r * 10) ^ (1 / 2)) * cameraZoom,
          ]);

          const eyePos = mat4.create();
          if (viewDirection === "out") mat4.rotateY(eyePos, eyePos, pi);
          mat4.mul(eyePos, eyePos, offset);
          mat4.mul(eyePos, eyePos, rotation);
          if (rotationLock === "surface")
            mat4.mul(
              eyePos,
              eyePos,
              mat4.invert(mat4.create(), planet.transform.surfaceRotation)
            );
          if (rotationLock === "surface" || rotationLock === "orbit")
            mat4.mul(
              eyePos,
              eyePos,
              mat4.invert(
                mat4.create(),
                mat4.fromQuat(
                  mat4.create(),
                  mat4.getRotation(quat.create(), planet.transform.position)
                )
              )
            );
          mat4.mul(eyePos, eyePos, translation);

          uniforms.View.data = eyePos;
          mat4.perspective(
            uniforms.Projection.data,
            pi / 2,
            aspectRatio,
            scaleDistance(r * 1e-3),
            scaleDistance(r * 1e8)
          ); // out, fovy, aspect, near, far
          return true;
        }

        if (planet.satellites)
          if (
            planet.satellites.some(function (satellite) {
              return setUniforms(satellite);
            })
          )
            return true;

        return false;
      };

      var setLights = function (planet) {
        var lightPosition = [],
          lightLuminosity = [];

        var getLights = function (planet) {
          if (planet.luminosity && planet.position) {
            lightPosition.push(
              planet.position[0],
              planet.position[1],
              planet.position[2]
            );
            lightLuminosity.push(planet.luminosity);
          }

          if (planet.satellites) planet.satellites.forEach(getLights);
        };
        getLights(planet);

        uniforms.lightPosition = {
          type: gl.uniform3fv,
          data: new Float32Array(lightPosition),
        };
        uniforms.lightLuminosity = {
          type: gl.uniform1fv,
          data: new Float32Array(lightLuminosity),
        };
      };

      var drawPlanet = function (planet) {
        //draw the planets orbit
        shapes.orbit.uniforms.Model = {
          data: planet.transform.orbit,
          type: gl.uniformMatrix4fv,
        };
        shapes.orbit.uniforms.Color = {
          data: vec4.create(1.0, 0.0, 0.0, 1.0),
          type: gl.uniform4fv,
        };
        drawScene(gl, shapes.orbit, uniforms);

        //draw the planets surface
        var shape = planet.luminosity ? shapes.star : shapes.planet;
        shape.textures = { textureSampler: planet.texture };
        shape.uniforms.Model.data = planet.transform.surface;
        drawScene(gl, shape, uniforms);

        //draw its satellites
        if (planet.satellites)
          planet.satellites.forEach(function (satellite) {
            drawPlanet(satellite);
          });
      };

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      //draw skybox 天空盒
      drawScene(gl, shapes.skybox, {
        View: {
          data: mat4.fromQuat(
            mat4.create(),
            mat4.getRotation(quat.create(), uniforms.View.data)
          ),
          type: gl.uniformMatrix4fv,
        },
      });

      gl.clear(gl.DEPTH_BUFFER_BIT);
      updatePlanets(sun);
      if (!setUniforms(sun)) {
        mat4.lookAt(
          uniforms.View.data,
          [0, scaleDistance(1e9), scaleDistance(8e9)],
          [0, -scaleDistance(5e8), 0],
          [0, 1e3, -1e3]
        ); // out, eye, scale, up
        mat4.perspective(
          uniforms.Projection.data,
          pi / 2,
          aspectRatio,
          scaleDistance(1e8),
          scaleDistance(1e32)
        ); // out, fovy, aspect, near, far
      }
      setLights(sun);
      drawPlanet(sun);
    };

    var fpsElement = document.getElementById("fps");
    var lastFPS = 0;
    var drawFPS = function (fps) {
      if (fps === lastFPS) return;

      lastFPS = Math.round(fps);
      fpsElement.innerText = lastFPS;
    };

    var animation = animate(1e3 / 120, 60, draw, drawFPS).start();

    document.getElementById("speed").addEventListener("change", (evt) => {
      animation.setSpeed(evt.target.value);
    });
  };
  loadFiles(
    {
      planetVert: "shaders/planet.vs",
      planetFrag: "shaders/planet.fs",
      starVert: "shaders/star.vs",
      starFrag: "shaders/star.fs",
      skyboxVert: "shaders/skybox.vs",
      skyboxFrag: "shaders/skybox.fs",
      simpleVert: "shaders/simple.vs",
      simpleFrag: "shaders/simple.fs",
    },
    function (shaderSources) {
      loadImages(
        {
          earth: "textures/earth.jpg",
          moon: "textures/moon.jpg",
          sun: "textures/sun.jpg",
          jupiter: "textures/jupiter.jpg",
          mars: "textures/mars.jpg",
          phobos: "textures/mars-phobos.jpg",
          neptune: "textures/neptune.jpg",
          saturn: "textures/saturn.jpg",
          venus: "textures/venus.jpg",
          stars: "textures/stars.jpg",
          uranus: "textures/uranus.jpg",
          mercury: "textures/mercury.jpg",
        },
        function (textures) {
          main(shaderSources, textures);
        }
      );
    }
  );
})(document, window);
