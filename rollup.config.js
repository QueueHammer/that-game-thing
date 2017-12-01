import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import sourcemaps from 'rollup-plugin-sourcemaps';

export default {
  input: './src/game.js',
  output: {
    file: './public/game.js',
    format: 'iife'
  },
  sourcemap: true,
  name: 'ThatGameThing',
  plugins: [
    sourcemaps(),
    resolve(),
    commonjs()
  ]
};
