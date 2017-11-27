var game = (function () {
    var self = this;
    var socket = io();
    var canvas = document.getElementById('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var gl = canvas.getContext('webgl');
    //noinspection JSAnnotator
    var vsSource = `
      attribute vec4 aVertexPosition;
      attribute vec3 aVertexNormal;
      attribute vec2 aTextureCoord;
    
      uniform mat4 uNormalMatrix;
      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
    
      varying highp vec2 vTextureCoord;
      varying highp vec3 vLighting;
    
      void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vTextureCoord = aTextureCoord;
        
        highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
        highp vec3 directionalLightColor = vec3(1, 1, 1);
        highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));
        
        highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);
        
        highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
        vLighting = ambientLight + (directionalLightColor * directional);
      }
    `;
    //noinspection JSAnnotator
    var fsSource = `
      varying highp vec2 vTextureCoord;
      varying highp vec3 vLighting;
    
      uniform sampler2D uSampler;
    
      void main(void) {
        highp vec4 texelColor = texture2D(uSampler, vTextureCoord);
        
        gl_FragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
      }
    `;
    var shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    var programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
            textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord')
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
            uSampler: gl.getUniformLocation(shaderProgram, 'uSampler')
        },
        buffers: []
    };
    var texture;

    self.camera = vec3.create();
    self.character = vec3.create();
    vec3.zero = vec3.create();
    vec3.left = vec3.create();
    vec3.right = vec3.create();
    vec3.up = vec3.create();
    vec3.down = vec3.create();
    vec3.back = vec3.create();
    vec3.forward = vec3.create();
    vec3.sub(vec3.left, vec3.zero, [1.0, 0.0, 0.0]);
    vec3.add(vec3.right, vec3.zero, [1.0, 0.0, 0.0]);
    vec3.sub(vec3.down, vec3.zero, [0.0, 1.0, 0.0]);
    vec3.add(vec3.up, vec3.zero, [0.0, 1.0, 0.0]);
    vec3.sub(vec3.back, vec3.zero, [0.0, 0.0, 1.0]);
    vec3.add(vec3.forward, vec3.zero, [0.0, 0.0, 1.0]);

    vec3.add(self.camera, self.camera, [20.0, 15.0, 20.0]);

    window.addEventListener('keydown', function (e) {
        switch (e.keyCode) {
            case 65:
                vec3.add(self.camera, self.camera, vec3.left);
                break;
            case 68:
                vec3.add(self.camera, self.camera, vec3.right);
                break;
            case 87:
                vec3.add(self.camera, self.camera, vec3.up);
                break;
            case 83:
                vec3.add(self.camera, self.camera, vec3.down);
                break;
            case 81:
                vec3.add(self.camera, self.camera, vec3.back);
                break;
            case 69:
                vec3.add(self.camera, self.camera, vec3.forward);
                break;
        }
    }, true);

    main();
    requestAnimationFrame(render);

    function main() {
        if (!gl) {
            alert('Unable to initialize WebGL. Your browser or machine may not support it.');
            return;
        }

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        var h = [];
        var positions;
        var x;
        var y;
        var l = 16;
        for (x = 0; x <= l; x++) {
            h[x] = [];
        }

        h[0][0] = 0;
        h[0][16] = 0;
        h[16][16] = 0;
        h[16][0] = 0;

        diamond({x: 0, y: 0}, {x: 16, y: 16});

        function diamond (min, max) {
            var dist = max.x - min.x;
            var mid = {
                x: (max.x - min.x) / 2 + min.x,
                y: (max.y - min.y) / 2 + min.y
            };
            var avg = (h[min.x][min.y] + h[min.x][max.y] + h[max.x][min.y] + h[max.x][max.y]) / 4;

            h[mid.x][mid.y] = Math.max(Math.round(Math.random() * dist - dist / 2 + avg), 0.0);

            square(min, max, mid);
        }

        function square (min, max, mid) {
            var dist = mid.x - min.x;
            var avg;

            // Top
            avg = (h[min.x][min.y] + h[max.x][min.y] + h[mid.x][mid.y]) / 3;
            if (min.y === 0) h[mid.x][min.y] = 0;
            else h[mid.x][min.y] = Math.max(Math.round(Math.random() * dist - dist / 2 + avg), 0.0);

            // Left
            avg = (h[min.x][min.y] + h[mid.x][mid.y] + h[min.x][max.y]) / 3;
            if (min.x === 0) h[min.x][mid.y] = 0;
            else h[min.x][mid.y] = Math.max(Math.round(Math.random() * dist - dist / 2 + avg), 0.0);

            // Right
            avg = (h[max.x][min.y] + h[mid.x][mid.y] + h[max.x][max.y]) / 3;
            if (max.x === 16) h[max.x][mid.y] = 0;
            else h[max.x][mid.y] = Math.max(Math.round(Math.random() * dist - dist / 2 + avg), 0.0);

            // Bottom
            avg = (h[mid.x][mid.y] + h[min.x][max.y] + h[max.x][max.y]) / 3;
            if (max.y === 16) h[mid.x][max.y] = 0;
            else h[mid.x][max.y] = Math.max(Math.round(Math.random() * dist - dist / 2 + avg), 0.0);

            if (dist > 1) {
                diamond({x: min.x, y: min.y}, {x: mid.x, y: mid.y});
                diamond({x: mid.x, y: min.y}, {x: max.x, y: mid.y});
                diamond({x: min.x, y: mid.y}, {x: mid.x, y: max.y});
                diamond({x: mid.x, y: mid.y}, {x: max.x, y: max.y});
            }
        }

        /*var positions = [
         // Front face
         -0.5 + x, -0.5 + y,  0.5 + z,
         0.5 + x, -0.5 + y,  0.5 + z,
         0.5 + x,  0.5 + y,  0.5 + z,
         -0.5 + x,  0.5 + y,  0.5 + z,

         // Back face
         -0.5 + x, -0.5 + y, -0.5 + z,
         -0.5 + x,  0.5 + y, -0.5 + z,
         0.5 + x,  0.5 + y, -0.5 + z,
         0.5 + x, -0.5 + y, -0.5 + z,

         // Top face
         -0.5 + x,  0.5 + y, -0.5 + z,
         -0.5 + x,  0.5 + y,  0.5 + z,
         0.5 + x,  0.5 + y,  0.5 + z,
         0.5 + x,  0.5 + y, -0.5 + z,

         // Bottom face
         -0.5 + x, -0.5 + y, -0.5 + z,
         0.5 + x, -0.5 + y, -0.5 + z,
         0.5 + x, -0.5 + y,  0.5 + z,
         -0.5 + x, -0.5 + y,  0.5 + z,

         // Right face
         0.5 + x, -0.5 + y, -0.5 + z,
         0.5 + x,  0.5 + y, -0.5 + z,
         0.5 + x,  0.5 + y,  0.5 + z,
         0.5 + x, -0.5 + y,  0.5 + z,

         // Left face
         -0.5 + x, -0.5 + y, -0.5 + z,
         -0.5 + x, -0.5 + y,  0.5 + z,
         -0.5 + x,  0.5 + y,  0.5 + z,
         -0.5 + x,  0.5 + y, -0.5 + z
         ];*/

        // Top
        for (x = 0; x < l; x++) {
            for (y = 0; y < l; y++) {
                var avg = (h[x][y] + h[x][y + 1] + h[x + 1][y + 1] + h[x + 1][y]) / 4;

                // Top
                positions = [
                    -0.5 + x - l / 2, h[x][y], -0.5 + y - l / 2,
                    -0.5 + x - l / 2, h[x][y + 1],  0.5 + y - l / 2,
                     0.5 + x - l / 2, h[x + 1][y + 1],  0.5 + y - l / 2,
                     0.5 + x - l / 2, h[x + 1][y], -0.5 + y - l / 2
                ];
                programInfo.buffers.push(initBuffers(gl, positions));
            }
        }

        texture = loadTexture(gl, './textures/grass.jpg');
        drawScene(gl, programInfo, programInfo.buffers);
    }

    function initShaderProgram(gl, vsSource, fsSource) {
        var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        var shaderProgram = gl.createProgram();

        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }

        return shaderProgram;
    }

    function loadShader(gl, type, source) {
        var shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    function initBuffers(gl, positions) {
        var positionBuffer = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        var normalBuffer = gl.createBuffer();
        var vertexNormals = [
            0.0,  1.0,  0.0,
            0.0,  1.0,  0.0,
            0.0,  1.0,  0.0,
            0.0,  1.0,  0.0
        ];

        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);

        var textureCoordBuffer = gl.createBuffer();
        var textureCoordinates = [
            0.0,  0.0,
            1.0,  0.0,
            1.0,  1.0,
            0.0,  1.0
        ];

        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

        var indexBuffer = gl.createBuffer();
        var indices = [
            0,  1,  2,      0,  2,  3
        ];

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        return {
            position: positionBuffer,
            normal: normalBuffer,
            textureCoord: textureCoordBuffer,
            indices: indexBuffer
        };
    }

    function drawScene(gl, programInfo, buffers, texture) {
        var fieldOfView = 45 * Math.PI / 180;
        var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        var zNear = 0.1;
        var zFar = 100.0;
        var projectionMatrix = mat4.create();
        var modelViewMatrix = mat4.create();
        var normalMatrix = mat4.create();

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
        mat4.translate(modelViewMatrix, modelViewMatrix, self.camera);
        mat4.lookAt(modelViewMatrix, self.camera, vec3.zero, vec3.up);
        mat4.invert(normalMatrix, modelViewMatrix);
        mat4.transpose(normalMatrix, normalMatrix);

        for (var i = 0; i < buffers.length; i++) {
            {
                var numComponents = 3;
                var type = gl.FLOAT;
                var normalize = false;
                var stride = 0;
                var offset = 0;

                gl.bindBuffer(gl.ARRAY_BUFFER, buffers[i].position);
                gl.vertexAttribPointer(
                    programInfo.attribLocations.vertexPosition,
                    numComponents,
                    type,
                    normalize,
                    stride,
                    offset
                );
                gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
            }

            {
                var numComponents = 3;
                var type = gl.FLOAT;
                var normalize = false;
                var stride = 0;
                var offset = 0;

                gl.bindBuffer(gl.ARRAY_BUFFER, buffers[i].normal);
                gl.vertexAttribPointer(
                    programInfo.attribLocations.vertexNormal,
                    numComponents,
                    type,
                    normalize,
                    stride,
                    offset
                );
                gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);
            }

            {
                var numComponents = 2;
                var type = gl.FLOAT;
                var normalize = false;
                var stride = 0;
                var offset = 0;

                gl.bindBuffer(gl.ARRAY_BUFFER, buffers[i].textureCoord);
                gl.vertexAttribPointer(
                    programInfo.attribLocations.textureCoord,
                    numComponents,
                    type,
                    normalize,
                    stride,
                    offset
                );
                gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                //gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
            }

            {
                var vertexCount = 6;
                var type = gl.UNSIGNED_SHORT;
                var offset = 0;

                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers[i].indices);
                gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
            }
        }

            gl.useProgram(programInfo.program);
            gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
            gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
            gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);
    }

    function render() {
        drawScene(gl, programInfo, programInfo.buffers, texture);

        requestAnimationFrame(render);
    }

    function loadTexture(gl, url) {
        var texture = gl.createTexture();
        var level = 0;
        var internalFormat = gl.RGBA;
        var width = 1;
        var height = 1;
        var border = 0;
        var srcFormat = gl.RGBA;
        var srcType = gl.UNSIGNED_BYTE;
        var pixel = new Uint8Array([0, 0, 255, 255]);
        var image = new Image();

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);
        image.onload = function () {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);

            if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                gl.generateMipmap(gl.TEXTURE_2D);
            } else {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }
        };

        image.src = url;

        return texture;
    }

    function isPowerOf2(value) {
        return (value & (value - 1)) === 0;
    }
})();