import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";

export default {
  input: "src/index.js",
  output: {
    format: "umd",
  },
  onwarn: (warning, handler) => {
    if (warning.code !== "THIS_IS_UNDEFINED") {
      handler(warning);
    }
  },
  plugins: [
    resolve(),
    commonjs({
      include: "node_modules/**",
    }),
    replace({
      "process.env.NODE_ENV": "'production'",
    }),
  ],
};
