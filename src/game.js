import { vec3, mat4 } from 'gl-matrix';
import generateTerrain from './generate-terrain.js';
import loadTextures from './load-textures.js';

var self = {};
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
var textures;
var squareTextures = [];

self.camera = vec3.create();
self.character = vec3.create();
var vecZero = vec3.create();
var vecLeft = vec3.create();
var vecRight = vec3.create();
var vecUp = vec3.create();
var vecDown = vec3.create();
var vecBack = vec3.create();
var vecForward = vec3.create();
vec3.sub(vecLeft, vecZero, [1.0, 0.0, 0.0]);
vec3.add(vecRight, vecZero, [1.0, 0.0, 0.0]);
vec3.sub(vecDown, vecZero, [0.0, 1.0, 0.0]);
vec3.add(vecUp, vecZero, [0.0, 1.0, 0.0]);
vec3.sub(vecBack, vecZero, [0.0, 0.0, 1.0]);
vec3.add(vecForward, vecZero, [0.0, 0.0, 1.0]);

vec3.add(self.camera, self.camera, [20.0, 15.0, 20.0]);

window.addEventListener('keydown', function (e) {
    switch (e.keyCode) {
        case 65:
            vec3.add(self.camera, self.camera, vecLeft);
        break;
        case 68:
            vec3.add(self.camera, self.camera, vecRight);
        break;
        case 87:
            vec3.add(self.camera, self.camera, vecUp);
        break;
        case 83:
            vec3.add(self.camera, self.camera, vecDown);
        break;
        case 81:
            vec3.add(self.camera, self.camera, vecBack);
        break;
        case 69:
            vec3.add(self.camera, self.camera, vecForward);
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

    //Generate terrain
    var edgeLength = 32;
    var terrain = generateTerrain(edgeLength);
    programInfo.buffers = terrain.buffer.map(initBuffers);
    squareTextures = terrain.textures;

    //Load Textures
    textures = loadTextures(gl);

    drawScene(gl, programInfo, programInfo.buffers, textures);
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

function drawScene(gl, programInfo, buffers, textures) {
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
    mat4.lookAt(modelViewMatrix, self.camera, vecZero, vecUp);
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

    for (var i = 0; i < buffers.length; i++) {
        //var x = i % 32;
        //var y = Math.floor(i / 32);
        //var min = Math.min(h[31 - x][31 - y], h[31 - x][y + 1], h[x + 1][y], h[x + 1][y + 1]);
        //var max = Math.max(h[31 - x][31 - y], h[31 - x][y + 1], h[x + 1][y], h[x + 1][y + 1]);

        (() => {
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
        })();

        (() => {
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
        })();

        (() => {
            var numComponents = 2;
            var type = gl.FLOAT;
            var normalize = false;
            var stride = 0;
            var offset = 0;
            //var texture = ['grass', 'dirt', 'stone', 'water'][(i + Math.floor(i / 16)) % 4];
            var texture = squareTextures[i];

            /*if (max === 0) {
                texture = 'water';
            } else if (min === 0) {
                texture = 'sand';
            } else if (min <= 2) {
                texture = 'grass';
            } else if (min <= 4) {
                texture = 'dirt';
            } else {
                texture = 'stone';
            }*/

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
            gl.bindTexture(gl.TEXTURE_2D, textures[texture]);
            //gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
        })();

        (() => {
            var vertexCount = 6;
            var type = gl.UNSIGNED_SHORT;
            var offset = 0;

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers[i].indices);
            gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
        })();
    }

        gl.useProgram(programInfo.program);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);
}

function render() {
    drawScene(gl, programInfo, programInfo.buffers, textures);

    requestAnimationFrame(render);
}


function initBuffers(positions) {
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