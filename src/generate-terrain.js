export default function(length) {

    var outBuffer = [];
    var squareTextures = [];
    var x;
    var y;
    var l = length;

    var h = [];

    for (x = 0; x <= l; x++) {
        h[x] = [];
    }

    h[0][0] = 0;
    h[0][l] = 0;
    h[l][l] = 0;
    h[l][0] = 0;

    diamond({x: 0, y: 0}, {x: l, y: l});

    // Dampen the height
    for (x = 0; x < l; x++) {
        for (y = 0; y < l; y++) {
            h[x][y] /= Math.sqrt(2);
        }
    }

    // Top
    for (x = 0; x < l; x++) {
        for (y = 0; y < l; y++) {
            var avg = (h[x][y] + h[x][y + 1] + h[x + 1][y + 1] + h[x + 1][y]) / 4;
            var min = Math.min(h[x][y], h[x][y + 1], h[x + 1][y + 1], h[x + 1][y]);
            var max = Math.max(h[x][y], h[x][y + 1], h[x + 1][y + 1], h[x + 1][y]);

            // Top
            var positions = [
                -0.5 + x - l / 2, h[x][y], -0.5 + y - l / 2,
                -0.5 + x - l / 2, h[x][y + 1],  0.5 + y - l / 2,
                    0.5 + x - l / 2, h[x + 1][y + 1],  0.5 + y - l / 2,
                    0.5 + x - l / 2, h[x + 1][y], -0.5 + y - l / 2
            ];
            outBuffer.push(positions);

            if (max === 0) {
                squareTextures.push('water');
            } else if (max <= 1) {
                squareTextures.push('sand');
            } else if (max - min <= 2 && max <= 5) {
                squareTextures.push('grass');
            } else if (max - min <= 1 && max <= 6) {
                squareTextures.push('dirt');
            } else if (max - min > max - 6 && max <= 8) {
                squareTextures.push('stone');
            } else {
                squareTextures.push('snow');
            }
        }
    }

    return {
        buffer: outBuffer, 
        textures: squareTextures
    };
    
    function diamond (min, max) {
        var dist = max.x - min.x;
        var mid = {
            x: (max.x - min.x) / 2 + min.x,
            y: (max.y - min.y) / 2 + min.y
        };
        var avg = (h[min.x][min.y] + h[min.x][max.y] + h[max.x][min.y] + h[max.x][max.y]) / 4;
    
        if (mid.x === 0 || mid.x === l)
            h[mid.x][mid.y] = 0;
        else
            h[mid.x][mid.y] = Math.max(Math.round(Math.random() * dist - dist / 2 + avg), 0.0);
    
        square(min, max, mid);
    }
    
    function square (min, max, mid) {
        var dist = mid.x - min.x;
    
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
        if (max.x === l) h[max.x][mid.y] = 0;
        else h[max.x][mid.y] = Math.max(Math.round(Math.random() * dist - dist / 2 + avg), 0.0);
    
        // Bottom
        avg = (h[mid.x][mid.y] + h[min.x][max.y] + h[max.x][max.y]) / 3;
        if (max.y === l) h[mid.x][max.y] = 0;
        else h[mid.x][max.y] = Math.max(Math.round(Math.random() * dist - dist / 2 + avg), 0.0);
    
        if (dist > 1) {
            diamond({x: min.x, y: min.y}, {x: mid.x, y: mid.y});
            diamond({x: mid.x, y: min.y}, {x: max.x, y: mid.y});
            diamond({x: min.x, y: mid.y}, {x: mid.x, y: max.y});
            diamond({x: mid.x, y: mid.y}, {x: max.x, y: max.y});
        }
    }
}
